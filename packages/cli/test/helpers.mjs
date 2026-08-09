import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

process.env.GIT_CONFIG_GLOBAL ??= process.platform === "win32" ? "NUL" : "/dev/null";
process.env.XDG_CONFIG_HOME = join(tmpdir(), "auto-code-review-test-config");
mkdirSync(process.env.XDG_CONFIG_HOME, { recursive: true });

export function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" },
  }).trim();
}

export function write(root, relative, content) {
  const path = join(root, ...relative.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

export function createRepository() {
  const root = mkdtempSync(join(tmpdir(), "auto-code-review-"));
  git(root, ["init", "--initial-branch=main"]);
  git(root, ["config", "user.name", "Auto Code Review Tests"]);
  git(root, ["config", "user.email", "tests@auto-code-review.invalid"]);
  return root;
}

export function commitAll(root, message = "fixture") {
  git(root, ["add", "--all"]);
  git(root, ["commit", "-m", message, "--no-gpg-sign"]);
}

export function seedRepository() {
  const root = createRepository();
  write(root, "src/app.ts", [
    "export function divide(left: number, right: number): number {",
    "  if (right === 0) return 0;",
    "  return left / right;",
    "}",
    "",
  ].join("\n"));
  write(root, "src/delete-me.ts", "export const obsolete = true;\n");
  commitAll(root, "initial");
  return root;
}
