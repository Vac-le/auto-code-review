import assert from "node:assert/strict";
import { mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveRepositoryFile } from "../src/source-file.mjs";
import { isNewerVersion, versionParts } from "../src/version.mjs";
import { write } from "../../cli/test/helpers.mjs";

test("semantic version comparison handles upgrade and downgrade order", () => {
  assert.deepEqual(versionParts("v1.2.3"), [1, 2, 3]);
  assert.equal(versionParts("1.2"), null);
  assert.equal(isNewerVersion("0.3.0", "0.2.9"), true);
  assert.equal(isNewerVersion("1.0.0", "0.9.9"), true);
  assert.equal(isNewerVersion("0.1.9", "0.2.0"), false);
  assert.equal(isNewerVersion("0.2.0", "0.2.0"), false);
});

test("source file resolution accepts regular repository files and rejects traversal", () => {
  const root = mkdtempSync(join(tmpdir(), "acr-source-file-"));
  const source = write(root, "src/app.ts", "export const ok = true;\n");
  assert.equal(resolveRepositoryFile(root, "src/app.ts"), source);
  assert.equal(resolveRepositoryFile(root, "../outside.ts"), null);
  assert.equal(resolveRepositoryFile(root, "src\\app.ts"), null);
  assert.equal(resolveRepositoryFile(root, "src"), null);
});

test("source file resolution does not follow repository symlinks", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "acr-source-link-"));
  const outside = write(mkdtempSync(join(tmpdir(), "acr-source-outside-")), "private.ts", "private\n");
  symlinkSync(outside, join(root, "linked.ts"));
  assert.equal(resolveRepositoryFile(root, "linked.ts"), null);
});
