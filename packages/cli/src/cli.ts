#!/usr/bin/env node
import { readFileSync, readSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runDoctor } from "./doctor.ts";
import { loadProjectConfig } from "./config.ts";
import { CliError, errorMessage } from "./errors.ts";
import { formatMarkdown } from "./format.ts";
import type { ReviewHost } from "./host-review.ts";
import { createSnapshot } from "./snapshot.ts";
import { findRepositoryRoot } from "./git.ts";
import type { ReviewReport, SnapshotMode } from "./types.ts";
import { startDashboard } from "./ui.ts";
import { validateReport } from "./validate.ts";

const VERSION = "0.2.5";
const MAX_JSON_INPUT = 16 * 1024 * 1024;

const HELP = `Auto Code Review deterministic local CLI

Usage:
  auto-code-review snapshot [options]
  auto-code-review validate --report <file|-> --snapshot <file> [options]
  auto-code-review format --report <file|-> [--snapshot <file>] [options]
  auto-code-review doctor [options]
  auto-code-review ui [options]

Snapshot options:
  --repo <path>                Repository directory (default: current directory)
  --staged                     Review only staged changes
  --base <revision>            Review HEAD since its merge base with revision
  --commit <revision>          Review one commit against its first parent
  --branch <revision>          Review the current branch against a base branch
  --pr-base <revision>         Pull-request base revision (requires --pr-head)
  --pr-head <revision>         Pull-request head revision (requires --pr-base)
  --context <lines>            Context radius around changes (default: 8)
  --max-context-lines <count>  Maximum context lines per file (default: 400)
  --max-files <count>          Maximum included files (default: 80)
  --max-file-bytes <bytes>     Maximum source file size (default: 524288)
  --max-patch-bytes <bytes>    Maximum patch bytes per file (default: 131072)
  --max-total-bytes <bytes>    Maximum patch/context payload (default: 2097152)
  --output <file>              Write output to a file instead of stdout
  --pretty                     Pretty-print JSON

Validation options:
  --report <file|->            Report JSON; '-' reads stdin
  --snapshot <file>            Snapshot JSON produced by snapshot
  --min-confidence <0.8..1>    Minimum accepted confidence (default: 0.8)
  --strict                     Treat warnings as errors
  --pretty                     Pretty-print JSON

Format options:
  --report <file|->            Report JSON; '-' reads stdin
  --snapshot <file>            Optionally validate anchors before formatting
  --output <file>              Write Markdown to a file
  --strict                     Reject validation warnings

Local UI options:
  --repo <path>                Repository directory (default: current directory)
  --host <codex|claude>        Preferred review platform (default: auto-detect)
  --port <number>              Local loopback port (default: 4387)
  --no-open                    Do not open the browser automatically

General:
  -h, --help                   Show help
  -v, --version                Show version
`;

interface ParsedOptions {
  values: Map<string, string>;
  flags: Set<string>;
  positionals: string[];
}

function parseOptions(args: string[], valueOptions: Set<string>, flagOptions: Set<string>): ParsedOptions {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const positionals: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      positionals.push(...args.slice(index + 1));
      break;
    }
    if (!argument.startsWith("-")) {
      positionals.push(argument);
      continue;
    }
    if (argument === "-h") {
      flags.add("--help");
      continue;
    }
    if (!argument.startsWith("--")) throw new CliError(`Unknown option '${argument}'.`, { code: "UNKNOWN_OPTION" });
    const equals = argument.indexOf("=");
    const name = equals >= 0 ? argument.slice(0, equals) : argument;
    if (valueOptions.has(name)) {
      if (values.has(name)) throw new CliError(`Option '${name}' may only be specified once.`, { code: "DUPLICATE_OPTION" });
      const value = equals >= 0 ? argument.slice(equals + 1) : args[++index];
      if (value === undefined || value === "") throw new CliError(`Option '${name}' requires a value.`, { code: "MISSING_OPTION_VALUE" });
      values.set(name, value);
    } else if (flagOptions.has(name)) {
      if (equals >= 0) throw new CliError(`Flag '${name}' does not accept a value.`, { code: "UNEXPECTED_OPTION_VALUE" });
      flags.add(name);
    } else {
      throw new CliError(`Unknown option '${name}'.`, { code: "UNKNOWN_OPTION" });
    }
  }
  return { values, flags, positionals };
}

function integerOption(options: ParsedOptions, name: string): number | undefined {
  const raw = options.values.get(name);
  if (raw === undefined) return undefined;
  if (!/^\d+$/.test(raw)) throw new CliError(`${name} must be a non-negative integer.`, { code: "INVALID_OPTION_VALUE" });
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new CliError(`${name} exceeds the safe integer range.`, { code: "INVALID_OPTION_VALUE" });
  return value;
}

function numberOption(options: ParsedOptions, name: string): number | undefined {
  const raw = options.values.get(name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new CliError(`${name} must be a finite number.`, { code: "INVALID_OPTION_VALUE" });
  return value;
}

function readStdinLimited(label: string): string {
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const chunk = Buffer.allocUnsafe(64 * 1024);
    const count = readSync(0, chunk, 0, chunk.length, null);
    if (count === 0) break;
    total += count;
    if (total > MAX_JSON_INPUT) throw new CliError(`${label} exceeds the ${MAX_JSON_INPUT}-byte input limit.`, { code: "INPUT_TOO_LARGE" });
    chunks.push(Buffer.from(chunk.subarray(0, count)));
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

function readJson(path: string, label: string): unknown {
  let text: string;
  try {
    if (path === "-") text = readStdinLimited(label);
    else {
      const absolute = resolve(path);
      if (statSync(absolute).size > MAX_JSON_INPUT) throw new CliError(`${label} exceeds the ${MAX_JSON_INPUT}-byte input limit.`, { code: "INPUT_TOO_LARGE" });
      text = readFileSync(absolute, "utf8");
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(`Unable to read ${label} '${path}': ${errorMessage(error)}`, { code: "READ_FAILED", cause: error });
  }
  if (Buffer.byteLength(text, "utf8") > MAX_JSON_INPUT) {
    throw new CliError(`${label} exceeds the ${MAX_JSON_INPUT}-byte input limit.`, { code: "INPUT_TOO_LARGE" });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new CliError(`${label} is not valid JSON: ${errorMessage(error)}`, { code: "INVALID_JSON", cause: error });
  }
}

function output(text: string, path?: string): void {
  const normalized = text.endsWith("\n") ? text : `${text}\n`;
  if (path) {
    try {
      writeFileSync(resolve(path), normalized, { encoding: "utf8", flag: "w" });
    } catch (error) {
      throw new CliError(`Unable to write output '${path}': ${errorMessage(error)}`, { code: "WRITE_FAILED", cause: error });
    }
  } else process.stdout.write(normalized);
}

function json(value: unknown, pretty: boolean): string {
  return JSON.stringify(value, null, pretty ? 2 : undefined);
}

function requireNoPositionals(options: ParsedOptions): void {
  if (options.positionals.length > 0) throw new CliError(`Unexpected argument '${options.positionals[0]}'.`, { code: "UNEXPECTED_ARGUMENT" });
}

function snapshotCommand(args: string[]): number {
  const options = parseOptions(
    args,
    new Set(["--repo", "--base", "--commit", "--branch", "--pr-base", "--pr-head", "--context", "--max-context-lines", "--max-files", "--max-file-bytes", "--max-patch-bytes", "--max-total-bytes", "--output"]),
    new Set(["--staged", "--pretty", "--help"]),
  );
  if (options.flags.has("--help")) {
    output(HELP);
    return 0;
  }
  requireNoPositionals(options);
  const selectedScopes = [options.flags.has("--staged"), options.values.has("--base"), options.values.has("--commit"), options.values.has("--branch"), options.values.has("--pr-base") || options.values.has("--pr-head")].filter(Boolean).length;
  if (selectedScopes > 1) throw new CliError("Snapshot scope options are mutually exclusive.", { code: "CONFLICTING_OPTIONS" });
  if (options.values.has("--pr-base") !== options.values.has("--pr-head")) throw new CliError("--pr-base and --pr-head must be provided together.", { code: "CONFLICTING_OPTIONS" });
  const mode: SnapshotMode = options.flags.has("--staged") ? "staged" : options.values.has("--base") ? "base" : options.values.has("--commit") ? "commit" : options.values.has("--branch") ? "branch" : options.values.has("--pr-base") ? "pull-request" : "working";
  const cwd = resolve(options.values.get("--repo") ?? process.cwd());
  const config = loadProjectConfig(findRepositoryRoot(cwd)).config;
  const snapshot = createSnapshot({
    cwd,
    mode,
    base: options.values.get("--base") ?? options.values.get("--branch") ?? options.values.get("--pr-base"),
    head: options.values.get("--commit") ?? options.values.get("--pr-head"),
    contextLines: integerOption(options, "--context"),
    maxContextLines: integerOption(options, "--max-context-lines"),
    maxFiles: integerOption(options, "--max-files"),
    maxFileBytes: integerOption(options, "--max-file-bytes"),
    maxPatchBytes: integerOption(options, "--max-patch-bytes"),
    maxTotalBytes: integerOption(options, "--max-total-bytes"),
    ignorePaths: config.ignorePaths,
  });
  output(json(snapshot, options.flags.has("--pretty")), options.values.get("--output"));
  return 0;
}

function validateCommand(args: string[]): number {
  const options = parseOptions(
    args,
    new Set(["--report", "--snapshot", "--min-confidence"]),
    new Set(["--strict", "--pretty", "--help"]),
  );
  if (options.flags.has("--help")) {
    output(HELP);
    return 0;
  }
  requireNoPositionals(options);
  const reportPath = options.values.get("--report");
  const snapshotPath = options.values.get("--snapshot");
  if (!reportPath || !snapshotPath) throw new CliError("validate requires --report and --snapshot.", { code: "MISSING_INPUT" });
  if (reportPath === "-" && snapshotPath === "-") throw new CliError("Only one input may be read from stdin.", { code: "CONFLICTING_INPUT" });
  const result = validateReport(readJson(reportPath, "report"), readJson(snapshotPath, "snapshot"), {
    strict: options.flags.has("--strict"),
    minimumConfidence: numberOption(options, "--min-confidence"),
  });
  output(json(result, options.flags.has("--pretty")));
  return result.valid ? 0 : 1;
}

function formatCommand(args: string[]): number {
  const options = parseOptions(
    args,
    new Set(["--report", "--snapshot", "--output"]),
    new Set(["--strict", "--help"]),
  );
  if (options.flags.has("--help")) {
    output(HELP);
    return 0;
  }
  requireNoPositionals(options);
  const reportPath = options.values.get("--report");
  if (!reportPath) throw new CliError("format requires --report.", { code: "MISSING_INPUT" });
  const snapshotPath = options.values.get("--snapshot");
  if (reportPath === "-" && snapshotPath === "-") throw new CliError("Only one input may be read from stdin.", { code: "CONFLICTING_INPUT" });
  const report = readJson(reportPath, "report");
  const snapshot = snapshotPath ? readJson(snapshotPath, "snapshot") : undefined;
  const validation = validateReport(report, snapshot, { strict: options.flags.has("--strict") });
  if (!validation.valid) {
    process.stderr.write(`${json(validation, true)}\n`);
    return 1;
  }
  output(formatMarkdown(report as ReviewReport), options.values.get("--output"));
  return 0;
}

function doctorCommand(args: string[]): number {
  const options = parseOptions(args, new Set(["--repo"]), new Set(["--pretty", "--help"]));
  if (options.flags.has("--help")) {
    output(HELP);
    return 0;
  }
  requireNoPositionals(options);
  const report = runDoctor(resolve(options.values.get("--repo") ?? process.cwd()));
  output(json(report, options.flags.has("--pretty")));
  return report.ok ? 0 : 1;
}

function uiCommand(args: string[]): number {
  const options = parseOptions(args, new Set(["--repo", "--host", "--port"]), new Set(["--no-open", "--help"]));
  if (options.flags.has("--help")) {
    output(HELP);
    return 0;
  }
  requireNoPositionals(options);
  const host = options.values.get("--host");
  if (host !== undefined && host !== "codex" && host !== "claude") {
    throw new CliError("--host must be codex or claude.", { code: "INVALID_OPTION_VALUE" });
  }
  const port = integerOption(options, "--port") ?? 4387;
  if (port < 1 || port > 65535) throw new CliError("--port must be between 1 and 65535.", { code: "INVALID_OPTION_VALUE" });
  startDashboard({
    cwd: resolve(options.values.get("--repo") ?? process.cwd()),
    port,
    open: !options.flags.has("--no-open"),
    ...(host ? { preferredHost: host as ReviewHost } : {}),
  });
  return 0;
}

export function main(args: string[]): number {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    output(HELP);
    return 0;
  }
  if (args[0] === "--version" || args[0] === "-v") {
    output(VERSION);
    return 0;
  }
  const [command, ...rest] = args;
  switch (command) {
    case "snapshot": return snapshotCommand(rest);
    case "validate": return validateCommand(rest);
    case "format": return formatCommand(rest);
    case "doctor": return doctorCommand(rest);
    case "ui": return uiCommand(rest);
    default: throw new CliError(`Unknown command '${command}'. Run with --help for usage.`, { code: "UNKNOWN_COMMAND" });
  }
}

function isExecutedEntry(argument: string | undefined, moduleUrl: string): boolean {
  if (!argument) return false;
  try {
    // npm workspace bins reach this module through a junction/symlink. Compare
    // canonical filesystem paths so both direct and linked execution work.
    return realpathSync(argument) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return resolve(argument) === resolve(fileURLToPath(moduleUrl));
  }
}

if (isExecutedEntry(process.argv[1], import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    const cliError = error instanceof CliError ? error : new CliError(errorMessage(error), { cause: error });
    process.stderr.write(`auto-code-review: ${cliError.message} [${cliError.code}]\n`);
    process.exitCode = cliError.exitCode;
  }
}
