import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readLogSnapshot } from "../src/log-viewer.mjs";

test("desktop log viewer returns current and rotated logs without exposing a path", () => {
  const directory = mkdtempSync(join(tmpdir(), "acr-logs-"));
  const path = join(directory, "desktop.log");
  writeFileSync(`${path}.previous`, "2026-08-10T00:00:00.000Z app.started 0.1.1\n", "utf8");
  writeFileSync(path, "2026-08-11T00:00:00.000Z dashboard.started sample\n", "utf8");
  const snapshot = readLogSnapshot(path);
  assert.match(snapshot.content, /Previous session log/);
  assert.match(snapshot.content, /Current log/);
  assert.match(snapshot.content, /dashboard\.started sample/);
  assert.equal(snapshot.fileName, "desktop.log");
  assert.equal(Object.hasOwn(snapshot, "path"), false);
  assert.match(snapshot.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("desktop log viewer handles an app with no log file yet", () => {
  const path = join(mkdtempSync(join(tmpdir(), "acr-empty-")), "desktop.log");
  assert.deepEqual(readLogSnapshot(path), { content: "", fileName: "desktop.log", updatedAt: null });
});
