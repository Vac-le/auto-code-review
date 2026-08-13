import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { git, seedRepository, write } from "./helpers.mjs";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const cli = join(packageRoot, "dist", "cli.js");
const workspaceRoot = resolve(packageRoot, "..", "..");

function runCommand(command, args, options = {}) {
  if (process.platform === "win32") {
    const commandLine = [command, ...args].map((value) => `"${value.replaceAll('"', '""')}"`).join(" ");
    return spawnSync(commandLine, {
      cwd: options.cwd ?? workspaceRoot,
      encoding: "utf8",
      windowsHide: true,
      timeout: 20_000,
      shell: true,
    });
  }
  return spawnSync(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    encoding: "utf8",
    timeout: 20_000,
  });
}

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? packageRoot,
    input: options.input,
    encoding: "utf8",
    windowsHide: true,
    timeout: 20_000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function makeInputs() {
  const root = seedRepository();
  write(root, "src/app.ts", [
    "export function divide(left: number, right: number): number {",
    "  return left / right; // zero is no longer guarded",
    "}",
    "",
  ].join("\n"));
  const snapshotPath = join(root, "snapshot.json");
  const snapshotResult = run(["snapshot", "--repo", root, "--output", snapshotPath, "--pretty"]);
  assert.equal(snapshotResult.status, 0, snapshotResult.stderr);
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const changedLine = snapshot.files.find((file) => file.path === "src/app.ts").hunks.find((hunk) => hunk.newRange).newRange.start;
  const report = {
    schemaVersion: "1.0",
    scope: { kind: "working-tree", base: null, head: null },
    summary: "Division by zero is no longer handled by the changed function.",
    findings: [{
      id: "ACR-001",
      priority: "P1",
      confidence: 0.95,
      category: "correctness",
      file: "src/app.ts",
      startLine: changedLine,
      endLine: changedLine,
      title: "Zero divisor is no longer guarded",
      evidence: "The changed function returns left / right without checking a zero right operand.",
      failureScenario: "A zero input now returns Infinity where callers expect the previous finite fallback.",
      suggestedFix: "Restore an explicit zero-divisor branch before division.",
    }],
  };
  const reportPath = write(root, "report.json", `${JSON.stringify(report, null, 2)}\n`);
  return { root, snapshotPath, reportPath, report };
}

test("CLI exposes help and rejects unknown commands without a stack trace", () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /snapshot/);
  assert.match(help.stdout, /auto-code-review ui/);
  const bad = run(["unknown"]);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /UNKNOWN_COMMAND/);
  assert.doesNotMatch(bad.stderr, /\n\s+at /);
});

test("workspace bin and npm exec invoke the CLI through package links", () => {
  const bin = join(workspaceRoot, "node_modules", ".bin", process.platform === "win32" ? "auto-code-review.cmd" : "auto-code-review");
  const linked = runCommand(bin, ["--version"]);
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(linked.stdout.trim(), "0.2.4");

  assert.ok(process.env.npm_execpath, "npm_execpath must be available under npm test");
  const executed = spawnSync(process.execPath, [process.env.npm_execpath, "exec", "--", "auto-code-review", "--version"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
    timeout: 20_000,
  });
  assert.equal(executed.status, 0, executed.stderr);
  assert.equal(executed.stdout.trim(), "0.2.4");
});

test("snapshot, validate, and format form a complete CLI workflow", () => {
  const { snapshotPath, reportPath } = makeInputs();
  const validation = run(["validate", "--report", reportPath, "--snapshot", snapshotPath, "--pretty"]);
  assert.equal(validation.status, 0, validation.stderr);
  assert.equal(JSON.parse(validation.stdout).valid, true);

  const formatted = run(["format", "--report", reportPath, "--snapshot", snapshotPath]);
  assert.equal(formatted.status, 0, formatted.stderr);
  assert.match(formatted.stdout, /# Auto Code Review/);
  assert.match(formatted.stdout, /Zero divisor/);
});

test("validate returns status 1 and structured diagnostics for an invalid anchor", () => {
  const { snapshotPath, report } = makeInputs();
  report.findings[0].startLine = 9999;
  report.findings[0].endLine = 9999;
  const result = run(["validate", "--report", "-", "--snapshot", snapshotPath], { input: JSON.stringify(report) });
  assert.equal(result.status, 1);
  const validation = JSON.parse(result.stdout);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((issue) => issue.code === "LINE_OUTSIDE_SNAPSHOT"));
});

test("doctor is side-effect free and always emits parseable diagnostics", () => {
  const root = seedRepository();
  const result = run(["doctor", "--repo", root, "--pretty"]);
  assert.ok(result.status === 0 || result.status === 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.repository.ok, true);
  assert.equal(report.tools[0].name, "git");
  assert.equal(report.tools[0].available, true);
  assert.equal(report.node.supported, true);
});

test("staged flag and base option are rejected together", () => {
  const root = seedRepository();
  const result = run(["snapshot", "--repo", root, "--staged", "--base", "main"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /CONFLICTING_OPTIONS/);
});
