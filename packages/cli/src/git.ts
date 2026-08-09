import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { CliError } from "./errors.ts";

export interface GitResult {
  status: number;
  stdout: Buffer;
  stderr: string;
}

interface GitOptions {
  allowFailure?: boolean;
  maxBuffer?: number;
  timeout?: number;
}

export function runGit(cwd: string, args: string[], options: GitOptions = {}): GitResult {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "buffer",
    shell: false,
    windowsHide: true,
    timeout: options.timeout ?? 15_000,
    maxBuffer: options.maxBuffer ?? 16 * 1024 * 1024,
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_OPTIONAL_LOCKS: "0",
      GIT_PAGER: "cat",
      GIT_TERMINAL_PROMPT: "0",
      LC_ALL: "C",
    },
  });

  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    const message = code === "ENOENT" ? "Git is not installed or is not available on PATH." : result.error.message;
    if (!options.allowFailure) throw new CliError(message, { code: "GIT_EXEC_FAILED", cause: result.error });
    return { status: result.status ?? 1, stdout: result.stdout ?? Buffer.alloc(0), stderr: message };
  }

  const status = result.status ?? 1;
  const stderr = (result.stderr ?? Buffer.alloc(0)).toString("utf8").trim();
  if (status !== 0 && !options.allowFailure) {
    throw new CliError(stderr || `Git exited with status ${status}.`, { code: "GIT_COMMAND_FAILED" });
  }
  return { status, stdout: result.stdout ?? Buffer.alloc(0), stderr };
}

export function gitText(cwd: string, args: string[], options: GitOptions = {}): string {
  return runGit(cwd, args, options).stdout.toString("utf8");
}

export function findRepositoryRoot(cwd: string): string {
  const candidate = resolve(cwd);
  const result = runGit(candidate, ["rev-parse", "--show-toplevel"], { allowFailure: true });
  if (result.status !== 0) {
    throw new CliError("The selected directory is not inside a Git repository.", { code: "NOT_A_GIT_REPOSITORY" });
  }
  const root = result.stdout.toString("utf8").trim();
  if (!root) throw new CliError("Git returned an empty repository root.", { code: "INVALID_GIT_ROOT" });
  try {
    return realpathSync(root);
  } catch {
    return resolve(root);
  }
}

export function resolveGitRevision(cwd: string, revision: string): string | null {
  const result = runGit(cwd, ["rev-parse", "--verify", `${revision}^{commit}`], { allowFailure: true });
  return result.status === 0 ? result.stdout.toString("utf8").trim() || null : null;
}

export function readGitBlob(cwd: string, object: string, maxBytes: number): Buffer | null {
  const sizeResult = runGit(cwd, ["cat-file", "-s", object], { allowFailure: true });
  if (sizeResult.status !== 0) return null;
  const size = Number.parseInt(sizeResult.stdout.toString("utf8").trim(), 10);
  if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) return null;
  const blobResult = runGit(cwd, ["cat-file", "blob", object], {
    allowFailure: true,
    maxBuffer: Math.max(maxBytes + 1024, 64 * 1024),
  });
  return blobResult.status === 0 ? blobResult.stdout : null;
}
