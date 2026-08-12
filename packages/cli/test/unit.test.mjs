import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { chmodSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { findExecutable, probeTool } from "../dist/doctor.js";
import { formatMarkdown } from "../dist/format.js";
import { createReviewHistoryStore, fitWithinHistoryLimit } from "../dist/history.js";
import { loadProjectConfig, pathIgnoredByConfig } from "../dist/config.js";
import { classifyIgnoredPath, detectLanguage, isBinary, looksGenerated } from "../dist/ignore.js";
import { redactSecrets } from "../dist/redact.js";
import { parseHunks, parseNameStatus } from "../dist/snapshot.js";
import { validateReport } from "../dist/validate.js";
import { canonicalizeHostReport, commandFromNpmWrapper, safeHostFailureDetail, safeHostPathDirectories } from "../dist/host-review.js";
import { launchBrowser, resolveBrowserOpener } from "../dist/ui.js";
import { write } from "./helpers.mjs";

function compileSchemaPatterns(value) {
  if (Array.isArray(value)) value.forEach(compileSchemaPatterns);
  else if (value && typeof value === "object") {
    if (typeof value.pattern === "string") assert.doesNotThrow(() => new RegExp(value.pattern, "u"));
    Object.values(value).forEach(compileSchemaPatterns);
  }
}

test("host reports receive deterministic canonical finding ids", () => {
  const report = fixtureReport({ id: "finding 1" });
  const first = canonicalizeHostReport(report);
  const second = canonicalizeHostReport(report);
  assert.match(first.findings[0].id, /^ACR-[A-F0-9]{12}$/);
  assert.equal(first.findings[0].id, second.findings[0].id);
  assert.equal(validateReport(first, fixtureSnapshot(), { strict: true }).valid, true);
});

test("review history retains enough records for annual activity and is reloadable", () => {
  const directory = mkdtempSync(join(tmpdir(), "acr-history-store-"));
  const store = createReviewHistoryStore("C:/example/repository", directory);
  for (let index = 0; index < 51; index += 1) {
    const timestamp = new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();
    store.save({
      id: `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
      state: "complete",
      host: "codex",
      createdAt: timestamp,
      updatedAt: timestamp,
      scope: { mode: "working", base: null, head: "a".repeat(40), branch: "main" },
      report: fixtureReport(),
    });
  }
  assert.equal(store.list().length, 51);
  assert.match(store.list()[0].id, /000000000032$/);
  assert.equal(store.list()[0].scope.branch, "main");
  const reloaded = createReviewHistoryStore("C:/example/repository", directory);
  assert.equal(reloaded.list().length, 51);
  reloaded.clear();
  assert.deepEqual(createReviewHistoryStore("C:/example/repository", directory).list(), []);
});

test("finding triage persists without changing review activity time", () => {
  const directory = mkdtempSync(join(tmpdir(), "acr-finding-state-"));
  const store = createReviewHistoryStore("C:/example/triage", directory);
  const timestamp = "2026-01-01T00:00:00.000Z";
  store.save({
    id: "00000000-0000-4000-8000-000000000001",
    state: "complete",
    host: "codex",
    createdAt: timestamp,
    updatedAt: timestamp,
    scope: { mode: "working", base: null, head: "a".repeat(40), branch: "main" },
    report: fixtureReport(),
  });
  const updated = store.setFindingState("00000000-0000-4000-8000-000000000001", "ACR-001", "resolved");
  assert.equal(updated.updatedAt, timestamp);
  assert.equal(updated.findingStates["ACR-001"], "resolved");
  assert.equal(createReviewHistoryStore("C:/example/triage", directory).get(updated.id).findingStates["ACR-001"], "resolved");
});

test("history persistence remains readable when reports approach the global size cap", () => {
  const evidence = "Concrete evidence for the changed branch. ".repeat(95);
  const records = [];
  for (let index = 0; index < 1_000; index += 1) {
    const timestamp = new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();
    const report = fixtureReport({ evidence, failureScenario: evidence, suggestedFix: evidence });
    report.findings = Array.from({ length: 10 }, (_, finding) => ({ ...report.findings[0], id: `ACR-${index}-${finding}`, startLine: 4 + finding, endLine: 4 + finding }));
    records.push({ id: `10000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`, state: "complete", host: "codex", createdAt: timestamp, updatedAt: timestamp, scope: { mode: "working", base: null, head: "a".repeat(40), branch: "main" }, report });
  }
  const fitted = fitWithinHistoryLimit(records);
  assert.ok(fitted.length > 0);
  assert.ok(fitted.length < records.length);
  assert.ok(Buffer.byteLength(JSON.stringify({ schemaVersion: 1, records: fitted }), "utf8") <= 64 * 1024 * 1024);
});

test("project configuration is strict and path-prefix matching is bounded", () => {
  const root = mkdtempSync(join(tmpdir(), "acr-project-config-"));
  write(root, ".auto-code-review.json", JSON.stringify({
    defaultHost: "claude",
    defaultScope: "pull-request",
    baseRevision: "origin/main",
    minimumConfidence: 0.9,
    maxFindings: 4,
    ignorePaths: ["vendor/generated"],
    instructions: "Prioritize compatibility regressions.",
  }));
  const loaded = loadProjectConfig(root);
  assert.equal(loaded.exists, true);
  assert.equal(loaded.config.defaultScope, "pull-request");
  assert.equal(loaded.config.maxFindings, 4);
  assert.equal(pathIgnoredByConfig("vendor/generated/file.ts", loaded.config.ignorePaths), true);
  assert.equal(pathIgnoredByConfig("vendor/generated-extra/file.ts", loaded.config.ignorePaths), false);
  write(root, ".auto-code-review.json", JSON.stringify({ unknownOption: true }));
  assert.throws(() => loadProjectConfig(root), /Unknown .auto-code-review.json property/);
});

test("host failures expose actionable diagnostics without leaking review input", () => {
  const readonly = safeHostFailureDetail("You are Auto Code Review\nBEGIN UNTRUSTED REVIEW SNAPSHOT\nsecret patch\nEND UNTRUSTED REVIEW SNAPSHOT\nError: failed to open state DB: attempt to write a readonly database");
  assert.match(readonly, /normal terminal with write access to CODEX_HOME/);
  assert.doesNotMatch(readonly, /secret patch|Auto Code Review/);

  const generic = safeHostFailureDetail("debug noise\nError: upstream service unavailable\nmore noise");
  assert.equal(generic, "Error: upstream service unavailable");
});

function fixtureSnapshot() {
  return {
    schemaVersion: "1.0",
    repository: { root: ".", head: "a".repeat(40), branch: "main", mode: "working", base: null },
    limits: { contextLines: 8, maxContextLines: 400, maxFiles: 80, maxFileBytes: 1024, maxPatchBytes: 1024, maxTotalBytes: 4096 },
    summary: { files: 1, additions: 2, deletions: 1, omitted: 0, redactions: 0, truncated: false },
    files: [{
      path: "src/app.ts",
      status: "modified",
      language: "typescript",
      additions: 2,
      deletions: 1,
      redactions: 0,
      truncated: false,
      hunks: [{
        oldStart: 4,
        oldLines: 1,
        newStart: 4,
        newLines: 2,
        oldRange: { start: 4, end: 4 },
        newRange: { start: 4, end: 5 },
      }],
      context: [{ source: "worktree", start: 1, end: 10, text: Array.from({ length: 10 }, (_, index) => `${index + 1}: line ${index + 1}`).join("\n") }],
      patch: "@@ -4 +4,2 @@\n-return user\n+return user.name\n+return user.id",
    }],
    omitted: [],
  };
}

function fixtureReport(overrides = {}) {
  return {
    schemaVersion: "1.0",
    scope: { kind: "working-tree", base: null, head: null },
    summary: "One actionable correctness problem was verified.",
    findings: [{
      id: "ACR-001",
      priority: "P1",
      confidence: 0.93,
      category: "correctness",
      file: "src/app.ts",
      startLine: 4,
      endLine: 4,
      title: "Missing null guard before dereference",
      evidence: "The changed line reads user.name without first checking whether user is null.",
      failureScenario: "When lookup returns null, the request reaches this line and throws a TypeError.",
      suggestedFix: "Return a not-found response before reading user.name.",
      ...overrides,
    }],
  };
}

test("ignore classifier covers lockfiles, generated trees, and sensitive paths", () => {
  assert.equal(classifyIgnoredPath("pnpm-lock.yaml"), "lockfile");
  assert.equal(classifyIgnoredPath("dist/app.js"), "generated");
  assert.equal(classifyIgnoredPath("config/.env.production"), "sensitive-path");
  assert.equal(classifyIgnoredPath("config/secrets.yaml"), "sensitive-path");
  assert.equal(classifyIgnoredPath("credentials.yml"), "sensitive-path");
  assert.equal(classifyIgnoredPath("secrets/production.yaml"), "sensitive-path");
  assert.equal(classifyIgnoredPath("keys/id_ed25519"), "sensitive-path");
  assert.equal(classifyIgnoredPath("src/app.ts"), null);
  assert.equal(detectLanguage("component.tsx"), "typescript");
});

test("review host discovery never searches the repository through relative PATH entries", () => {
  const separator = process.platform === "win32" ? ";" : ":";
  const absolute = process.platform === "win32" ? "C:\\trusted\\bin" : "/trusted/bin";
  const quoted = process.platform === "win32" ? `"${absolute}"` : absolute;
  const repositoryBin = join(absolute, "reviewed-project", "node_modules", ".bin");
  assert.deepEqual(safeHostPathDirectories(["", ".", "tools", quoted, repositoryBin].join(separator), [join(absolute, "reviewed-project")]), [absolute]);
});

test("Windows npm wrapper discovery supports the standard percent-tilde-dp0 form", (context) => {
  if (process.platform !== "win32") return context.skip("Windows wrapper syntax");
  const root = mkdtempSync(join(tmpdir(), "acr-wrapper-"));
  const node = write(root, "node.exe", "");
  const script = write(root, "node_modules/reviewer/bin/reviewer.js", "console.log('reviewer 1.0');\n");
  const wrapper = write(root, "codex.cmd", '@ECHO off\r\n"%~dp0\\node_modules\\reviewer\\bin\\reviewer.js" %*\r\n');
  assert.deepEqual(commandFromNpmWrapper(wrapper), { command: node, prefix: [script] });
});

test("Windows npm wrapper discovery never substitutes the packaged desktop executable for Node", (context) => {
  if (process.platform !== "win32") return context.skip("Windows wrapper syntax");
  const root = mkdtempSync(join(tmpdir(), "acr-wrapper-path-"));
  const wrapperRoot = join(root, "wrapper");
  const runtimeRoot = join(root, "runtime");
  const node = write(runtimeRoot, "node.exe", "");
  const script = write(wrapperRoot, "node_modules/reviewer/bin/reviewer.js", "console.log('reviewer 1.0');\n");
  const wrapper = write(wrapperRoot, "codex.cmd", '@ECHO off\r\n"%dp0%\\node_modules\\reviewer\\bin\\reviewer.js" %*\r\n');
  assert.deepEqual(commandFromNpmWrapper(wrapper, runtimeRoot), { command: node, prefix: [script] });
});

test("a missing browser opener cannot crash the local dashboard", () => {
  let calls = 0;
  assert.equal(launchBrowser("http://127.0.0.1:4387/#token=abc", "linux", () => { calls += 1; }, [], ""), false);
  assert.equal(calls, 0);
});

test("browser opener lookup excludes reviewed repositories and relative PATH entries", () => {
  const root = mkdtempSync(join(tmpdir(), "acr-opener-"));
  const repository = join(root, "reviewed");
  const trusted = join(root, "trusted");
  write(repository, "xdg-open", "untrusted");
  const opener = write(trusted, "xdg-open", "trusted");
  const separator = process.platform === "win32" ? ";" : ":";
  const pathValue = [".", repository, trusted].join(separator);
  assert.equal(resolveBrowserOpener("linux", pathValue, [repository]), opener);

  const child = new EventEmitter();
  child.unref = () => {};
  assert.equal(launchBrowser("http://127.0.0.1:4387/#token=abc", "linux", () => child, [repository], trusted), true);
  assert.equal(child.listenerCount("error"), 1);
  assert.doesNotThrow(() => child.emit("error", Object.assign(new Error("missing"), { code: "ENOENT" })));
});

test("published JSON schemas parse and expose the canonical strict contract", () => {
  const reportSchema = JSON.parse(readFileSync(new URL("../../../schemas/review-report.schema.json", import.meta.url), "utf8"));
  const snapshotSchema = JSON.parse(readFileSync(new URL("../../../schemas/review-snapshot.schema.json", import.meta.url), "utf8"));
  const packagedReportSchema = JSON.parse(readFileSync(new URL("../dist/schemas/review-report.schema.json", import.meta.url), "utf8"));
  const packagedSnapshotSchema = JSON.parse(readFileSync(new URL("../dist/schemas/review-snapshot.schema.json", import.meta.url), "utf8"));
  const hostSchema = JSON.parse(readFileSync(new URL("../dist/schemas/review-host-output.schema.json", import.meta.url), "utf8"));
  compileSchemaPatterns(reportSchema);
  compileSchemaPatterns(snapshotSchema);
  assert.equal(reportSchema.additionalProperties, false);
  assert.deepEqual(reportSchema.required, ["schemaVersion", "scope", "summary", "findings"]);
  assert.equal(reportSchema.properties.findings.maxItems, 10);
  assert.equal(reportSchema.$defs.finding.properties.confidence.minimum, 0.8);
  assert.deepEqual(reportSchema.$defs.finding.properties.priority.enum, ["P0", "P1", "P2", "P3"]);
  assert.equal(snapshotSchema.additionalProperties, false);
  assert.deepEqual(packagedReportSchema, reportSchema);
  assert.deepEqual(packagedSnapshotSchema, snapshotSchema);
  const inspectHostNode = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.properties) assert.deepEqual(node.required, Object.keys(node.properties));
    assert.equal(Object.hasOwn(node, "pattern"), false);
    for (const child of Object.values(node.properties ?? {})) inspectHostNode(child);
    for (const child of Object.values(node.$defs ?? {})) inspectHostNode(child);
    if (node.items) inspectHostNode(node.items);
  };
  inspectHostNode(hostSchema);
  assert.equal(hostSchema.properties.schemaVersion.type, "string");
});

test("generated detection requires a header marker and avoids source-code false positives", () => {
  assert.equal(looksGenerated("// Code generated by tool. DO NOT EDIT.\nexport {};"), true);
  assert.equal(looksGenerated("export const detector = /automatically generated/;\n// normal source"), false);
  assert.equal(looksGenerated("# @generated\nvalue = 1"), true);
});

test("binary detection recognizes NUL data without rejecting UTF-8", () => {
  assert.equal(isBinary(Buffer.from([1, 2, 0, 4])), true);
  assert.equal(isBinary(Buffer.from("你好，世界\n", "utf8")), false);
});

test("secret redaction removes concrete credentials but preserves type declarations", () => {
  const input = [
    "interface Config { apiKey: string }",
    "const password = \"correct horse battery staple\";",
    "{\"api_key\": \"json-secret-value-123456\"}",
    "OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz123456",
    "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
  ].join("\n");
  const result = redactSecrets(input);
  assert.match(result.text, /apiKey: string/);
  assert.doesNotMatch(result.text, /correct horse/);
  assert.doesNotMatch(result.text, /json-secret-value/);
  assert.doesNotMatch(result.text, /sk-abcdefghijklmnopqrstuvwxyz/);
  assert.doesNotMatch(result.text, /Bearer abcdefghijklmnopqrstuvwxyz/);
  assert.ok(result.count >= 4);
  const prefixed = redactSecrets("+DATABASE_PASSWORD=SuperSecretValue123\n-DATABASE_PASSWORD=FormerSecretValue456\n42: DATABASE_PASSWORD=ContextSecretValue789");
  assert.doesNotMatch(prefixed.text, /(?:Super|Former|Context)SecretValue/);
  assert.equal(prefixed.count, 3);
  const yaml = redactSecrets("password: hunter2secret\n+api_key: abcdefghijklmnop\n42: client_secret: anotherSecret123 # retained comment");
  assert.doesNotMatch(yaml.text, /hunter2secret|abcdefghijklmnop|anotherSecret123/);
  assert.match(yaml.text, /42: client_secret: \[REDACTED\] # retained comment/);

  const yamlBlocks = redactSecrets("api_key: |\n  first secret line\n  second secret line\nmode: production\n+password: >-\n+  folded secret\n+enabled: true\n42: client_secret: |2\n43:   numbered secret\n44: next: safe");
  assert.equal(yamlBlocks.text.includes("first secret line"), false);
  assert.equal(yamlBlocks.text.includes("second secret line"), false);
  assert.equal(yamlBlocks.text.includes("folded secret"), false);
  assert.equal(yamlBlocks.text.includes("numbered secret"), false);
  assert.match(yamlBlocks.text, /mode: production/);
  assert.match(yamlBlocks.text, /\+enabled: true/);
  assert.match(yamlBlocks.text, /44: next: safe/);
  assert.equal(yaml.count, 3);
});

test("diff parsers preserve rename metadata and changed ranges", () => {
  assert.deepEqual(parseNameStatus("M\0src/a.ts\0R100\0old.ts\0new.ts\0"), [
    { path: "src/a.ts", status: "modified" },
    { path: "new.ts", oldPath: "old.ts", status: "renamed" },
  ]);
  assert.deepEqual(parseHunks("@@ -1,2 +3,4 @@ function\n@@ -9 +12,0 @@"), [
    { oldStart: 1, oldLines: 2, newStart: 3, newLines: 4, oldRange: { start: 1, end: 2 }, newRange: { start: 3, end: 6 } },
    { oldStart: 9, oldLines: 1, newStart: 12, newLines: 0, oldRange: { start: 9, end: 9 }, newRange: null },
  ]);
});

test("validator accepts an evidence-backed finding anchored to a changed line", () => {
  const result = validateReport(fixtureReport(), fixtureSnapshot());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.findings, 1);
});

test("strict validation accepts a changed anchor when optional context was truncated", () => {
  const snapshot = fixtureSnapshot();
  snapshot.files[0].truncated = true;
  snapshot.files[0].context = [];
  snapshot.summary.truncated = true;
  const result = validateReport(fixtureReport(), snapshot, { strict: true });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validator accepts the canonical platform contract and rejects more than ten findings", () => {
  const canonical = fixtureReport({ category: "data-integrity", id: "ACR-PLATFORM-1" });
  assert.equal(validateReport(canonical, fixtureSnapshot()).valid, true);
  canonical.scope.kind = "staged";
  const mismatched = validateReport(canonical, fixtureSnapshot());
  assert.ok(mismatched.errors.some((issue) => issue.code === "SCOPE_MISMATCH"));

  const oversized = fixtureReport();
  oversized.findings = Array.from({ length: 11 }, (_, index) => ({
    ...oversized.findings[0],
    id: `ACR-${index + 1}`,
    startLine: index % 2 === 0 ? 4 : 5,
    endLine: index % 2 === 0 ? 4 : 5,
    title: `Distinct verified defect number ${index + 1}`,
  }));
  const result = validateReport(oversized);
  assert.ok(result.errors.some((issue) => issue.code === "SCHEMA_MAX_ITEMS"));
});

test("malformed snapshots produce diagnostics instead of throwing", () => {
  const malformed = fixtureSnapshot();
  malformed.files[0].hunks = [null];
  let result;
  assert.doesNotThrow(() => { result = validateReport(fixtureReport(), malformed); });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((issue) => issue.code === "INVALID_SNAPSHOT"));
});

test("validator rejects forged snapshot ranges and incorrectly numbered context", () => {
  const forgedContext = fixtureSnapshot();
  forgedContext.files[0].context = [{ source: "worktree", start: 999, end: 999, text: "999: injected" }];
  const contextResult = validateReport(fixtureReport({ startLine: 999, endLine: 999 }), forgedContext);
  assert.ok(contextResult.errors.some((issue) => issue.code === "INVALID_SNAPSHOT"));

  const forgedHunk = fixtureSnapshot();
  forgedHunk.files[0].hunks[0].newStart = 900;
  forgedHunk.files[0].hunks[0].newRange = { start: 900, end: 901 };
  const hunkResult = validateReport(fixtureReport({ startLine: 900, endLine: 900 }), forgedHunk);
  assert.ok(hunkResult.errors.some((issue) => issue.code === "INVALID_SNAPSHOT"));

  const wrongNumbers = fixtureSnapshot();
  wrongNumbers.files[0].context[0].text = "1: only one line";
  assert.ok(validateReport(fixtureReport(), wrongNumbers).errors.some((issue) => issue.code === "INVALID_SNAPSHOT"));
});

test("validator rejects traversal, unchanged anchors, vague evidence, and leaked secrets", () => {
  const traversal = validateReport(fixtureReport({ file: "../src/app.ts" }), fixtureSnapshot());
  assert.ok(traversal.errors.some((issue) => issue.code === "UNSAFE_PATH"));
  const windowsSeparators = validateReport(fixtureReport({ file: "src\\app.ts" }), fixtureSnapshot());
  assert.ok(windowsSeparators.errors.some((issue) => issue.code === "UNSAFE_PATH"));

  const unchanged = validateReport(fixtureReport({ startLine: 99, endLine: 99 }), fixtureSnapshot());
  assert.ok(unchanged.errors.some((issue) => issue.code === "LINE_OUTSIDE_SNAPSHOT"));

  const vague = validateReport(fixtureReport({ evidence: "possible issue" }), fixtureSnapshot());
  assert.ok(vague.errors.some((issue) => issue.code === "VAGUE_EVIDENCE"));

  const leaked = validateReport(fixtureReport({ evidence: "The hardcoded key sk-abcdefghijklmnopqrstuvwxyz123456 is used directly." }), fixtureSnapshot());
  assert.ok(leaked.errors.some((issue) => issue.code === "SECRET_IN_REPORT"));
});

test("validator scans every free-text report field for secrets and unsafe controls", () => {
  const token = "sk-abcdefghijklmnopqrstuvwxyz123456";
  const cases = [
    ["summary", null],
    ["title", "title"],
    ["evidence", "evidence"],
    ["failureScenario", "failureScenario"],
    ["suggestedFix", "suggestedFix"],
  ];
  for (const [field, findingField] of cases) {
    const report = fixtureReport();
    if (findingField) report.findings[0][findingField] = `Concrete ${field} includes ${token} and must be rejected.`;
    else report.summary = `Concrete summary includes ${token} and must be rejected.`;
    const result = validateReport(report, fixtureSnapshot());
    assert.ok(result.errors.some((issue) => issue.code === "SECRET_IN_REPORT" && issue.path.endsWith(`.${field}`)), field);
  }

  const injected = fixtureReport();
  injected.summary = "Safe prefix\u001b]8;;https://evil.example\u0007click\u001b]8;;\u0007";
  assert.ok(validateReport(injected, fixtureSnapshot()).errors.some((issue) => issue.code === "UNSAFE_CONTROL_CHARACTER"));

  const multiline = fixtureReport({
    evidence: "The changed line\tuses the nullable value.\r\nThis concrete path throws after lookup.",
    failureScenario: "When lookup fails,\r\nthe request reaches the changed line and throws.",
  });
  assert.equal(validateReport(multiline, fixtureSnapshot()).errors.some((issue) => issue.code === "UNSAFE_CONTROL_CHARACTER"), false);
});

test("validator permits a newly reachable failure anchored to bounded unchanged context", () => {
  const result = validateReport(fixtureReport({ startLine: 6, endLine: 6 }), fixtureSnapshot());
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((issue) => issue.code === "UNCHANGED_ANCHOR"));
  const strict = validateReport(fixtureReport({ startLine: 6, endLine: 6 }), fixtureSnapshot(), { strict: true });
  assert.equal(strict.valid, false);
  assert.ok(strict.errors.some((issue) => issue.code === "STRICT_UNCHANGED_ANCHOR"));
});

test("validator detects exact and semantic duplicates", () => {
  const report = fixtureReport();
  report.findings.push({ ...report.findings[0] });
  const exact = validateReport(report, fixtureSnapshot());
  assert.ok(exact.errors.some((issue) => issue.code === "DUPLICATE_FINDING"));
  assert.ok(exact.errors.some((issue) => issue.code === "DUPLICATE_FINDING_ID"));

  const semantic = fixtureReport();
  semantic.findings.push({
    ...semantic.findings[0],
    startLine: 5,
    endLine: 5,
    title: "Dereference is missing a null guard",
    evidence: "The second changed line accesses the same nullable user object without a guard.",
  });
  const overlap = validateReport(semantic, fixtureSnapshot());
  assert.ok(overlap.errors.some((issue) => issue.code === "OVERLAPPING_FINDING"));
});

test("validator rejects low confidence and only permits raising the gate", () => {
  const regular = validateReport(fixtureReport({ confidence: 0.6 }), fixtureSnapshot());
  assert.equal(regular.valid, false);
  assert.ok(regular.errors.some((issue) => issue.code === "LOW_CONFIDENCE"));
  const lowered = validateReport(fixtureReport(), fixtureSnapshot(), { minimumConfidence: 0.5 });
  assert.equal(lowered.valid, false);
  assert.ok(lowered.errors.some((issue) => issue.code === "INVALID_OPTION"));
  const raised = validateReport(fixtureReport(), fixtureSnapshot(), { minimumConfidence: 0.95 });
  assert.ok(raised.errors.some((issue) => issue.code === "LOW_CONFIDENCE"));
});

test("Markdown formatter orders priority and escapes untrusted headings", () => {
  const report = fixtureReport({
    priority: "P3",
    title: "Low issue",
    evidence: "The changed branch renders <img src=x onerror=alert(1)> as review evidence.",
    failureScenario: "A renderer could interpret <script>alert(1)</script> as raw HTML.",
  });
  report.findings.push({
    ...report.findings[0],
    id: "ACR-002",
    priority: "P0",
    startLine: 5,
    endLine: 5,
    title: "<script>alert(1)</script>",
    evidence: "The changed branch sends raw content into an executable HTML context.",
  });
  const markdown = formatMarkdown(report);
  assert.ok(markdown.indexOf("[P0]") < markdown.indexOf("[P3]"));
  assert.doesNotMatch(markdown, /<script>/);
  assert.doesNotMatch(markdown, /<img /);
  assert.match(markdown, /&lt;script&gt;/);
  assert.match(markdown, /src\/app\.ts:5/);

  report.summary = "Terminal\u001b]8;;https://evil.example\u0007link\u001b]8;;\u0007";
  const hardened = formatMarkdown(report);
  assert.doesNotMatch(hardened, /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/);
});

test("executable lookup does not accept shell syntax and finds an executable file", { skip: process.platform === "win32" }, () => {
  const directory = mkdtempSync(join(tmpdir(), "acr-path-"));
  const executable = write(directory, "safe-tool", "#!/bin/sh\nexit 0\n");
  chmodSync(executable, 0o755);
  assert.equal(findExecutable("safe-tool", { path: directory, platform: process.platform }), executable);
  assert.equal(findExecutable("safe-tool;touch-pwned", { path: directory, platform: process.platform }), null);
  const probe = probeTool("git", process.execPath);
  assert.equal(probe.available, true);
  assert.match(probe.version ?? "", /^v?\d+/);
});
