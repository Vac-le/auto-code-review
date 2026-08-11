import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { normalizeSettings, readSettings, rememberRepository, writeSettings } from "../src/settings.mjs";
import { isAllowedDesktopPage } from "../src/security.mjs";

test("desktop settings retain eight unique recent repositories", () => {
  let settings = normalizeSettings(null);
  for (let index = 0; index < 10; index += 1) settings = rememberRepository(settings, join("repositories", String(index)));
  assert.equal(settings.recentRepositories.length, 8);
  assert.equal(settings.lastRepository, resolve(join("repositories", "9")));
  settings = rememberRepository(settings, join("repositories", "4"));
  assert.equal(settings.recentRepositories[0], resolve(join("repositories", "4")));
  assert.equal(new Set(settings.recentRepositories).size, 8);
});

test("desktop settings persist atomically and reject malformed content", () => {
  const path = join(mkdtempSync(join(tmpdir(), "acr-desktop-")), "settings.json");
  const expected = rememberRepository(normalizeSettings(null), join("repository", "one"));
  writeSettings(path, expected);
  assert.deepEqual(readSettings(path), expected);
  assert.deepEqual(normalizeSettings({ recentRepositories: [1, null, "valid"], lastRepository: "missing" }), {
    lastRepository: null,
    recentRepositories: ["valid"],
  });
});

test("desktop navigation accepts only the welcome page or exact dashboard origin", () => {
  const welcome = "file:///app/welcome.html";
  const dashboard = "http://127.0.0.1:4387";
  assert.equal(isAllowedDesktopPage(welcome, welcome, dashboard), true);
  assert.equal(isAllowedDesktopPage(`${dashboard}/#token=redacted`, welcome, dashboard), true);
  assert.equal(isAllowedDesktopPage(`${dashboard}@example.com/`, welcome, dashboard), false);
  assert.equal(isAllowedDesktopPage("https://example.com/", welcome, dashboard), false);
  assert.equal(isAllowedDesktopPage("not a url", welcome, dashboard), false);
});

test("desktop renderer exposes an in-app log viewer instead of an open-directory action", () => {
  const preload = readFileSync(new URL("../src/preload.cjs", import.meta.url), "utf8");
  const welcome = readFileSync(new URL("../src/welcome.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../src/welcome.js", import.meta.url), "utf8");
  assert.match(preload, /desktop:get-logs/);
  assert.doesNotMatch(preload, /desktop:open-logs/);
  assert.match(welcome, /data-log-viewer/);
  assert.match(script, /api\.getLogs\(\)/);
  assert.match(script, /\.inert = true/);
});
