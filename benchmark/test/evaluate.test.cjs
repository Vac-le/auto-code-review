'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const benchmarkRoot = path.resolve(__dirname, '..');
const manifest = require('../manifest.json');
const perfectReport = require('../fixtures/perfect-report.json');
const noisyReport = require('../fixtures/noisy-report.json');
const { evaluate, normalizePath, validateManifest } = require('../evaluate.cjs');

function collectAddedLines(diffText) {
  const added = new Set();
  let newLine = null;
  for (const line of diffText.split(/\r?\n/)) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (newLine === null || line.startsWith('+++')) continue;
    if (line.startsWith('+')) {
      added.add(newLine);
      newLine += 1;
    } else if (!line.startsWith('-')) {
      newLine += 1;
    }
  }
  return added;
}

test('manifest contains a balanced, internally consistent 16-case corpus', () => {
  assert.doesNotThrow(() => validateManifest(manifest));
  assert.equal(manifest.cases.length, 16);
  assert.equal(manifest.cases.filter((entry) => entry.kind === 'buggy').length, 11);
  assert.equal(manifest.cases.filter((entry) => entry.kind === 'clean').length, 5);
  assert.equal(
    manifest.cases.reduce((total, entry) => total + entry.expectedFindings.length, 0),
    11
  );

  for (const language of ['typescript', 'javascript', 'python', 'go']) {
    const languageCases = manifest.cases.filter((entry) => entry.language === language);
    assert.equal(languageCases.length, 4, `${language} must have four cases`);
    assert.ok(languageCases.some((entry) => entry.kind === 'buggy'));
    assert.ok(languageCases.some((entry) => entry.kind === 'clean'));
  }

  for (const benchmarkCase of manifest.cases) {
    const diffPath = path.join(benchmarkRoot, benchmarkCase.diff);
    assert.ok(fs.existsSync(diffPath), `${benchmarkCase.diff} must exist`);
    const addedLines = collectAddedLines(fs.readFileSync(diffPath, 'utf8'));
    for (const finding of benchmarkCase.expectedFindings) {
      assert.ok(
        addedLines.has(finding.line),
        `${finding.id} must point to an added line in ${benchmarkCase.diff}`
      );
    }
  }
});

test('perfect report receives perfect classification, line, and severity scores', () => {
  const result = evaluate(manifest, perfectReport);
  assert.deepEqual(
    {
      tp: result.summary.truePositives,
      fp: result.summary.falsePositives,
      fn: result.summary.falseNegatives,
      precision: result.summary.precision,
      recall: result.summary.recall,
      f1: result.summary.f1,
      lineAccuracy: result.summary.lineAccuracy,
      severityAccuracy: result.summary.severityAccuracy
    },
    {
      tp: 11,
      fp: 0,
      fn: 0,
      precision: 1,
      recall: 1,
      f1: 1,
      lineAccuracy: 1,
      severityAccuracy: 1
    }
  );
  assert.equal(result.summary.cleanCaseFalsePositiveRate, 0);
  for (const language of Object.values(result.byLanguage)) {
    assert.equal(language.f1, 1);
  }
});

test('noisy report counts duplicates, clean-case hallucinations, and wrong rules as false positives', () => {
  const result = evaluate(manifest, noisyReport);
  assert.equal(result.summary.truePositives, 2);
  assert.equal(result.summary.falsePositives, 3);
  assert.equal(result.summary.falseNegatives, 9);
  assert.equal(result.summary.precision, 0.4);
  assert.equal(result.summary.recall, 0.1818);
  assert.equal(result.summary.f1, 0.25);
  assert.equal(result.summary.falsePositiveRate, 0.6);
  assert.equal(result.summary.cleanCaseFalsePositiveRate, 0.2);
  assert.equal(result.summary.lineAccuracy, 0.5);
  assert.equal(result.summary.withinOneLineAccuracy, 0.5);
  assert.equal(result.summary.meanLineDistance, 1);
});

test('line tolerance is configurable and paths are normalized', () => {
  assert.equal(normalizePath('.\\src\\store.ts'), 'src/store.ts');
  const strict = evaluate(manifest, noisyReport, { maxLineDistance: 1 });
  assert.equal(strict.summary.truePositives, 1);
  assert.equal(strict.summary.falsePositives, 4);
  assert.equal(strict.summary.falseNegatives, 10);
  assert.equal(strict.summary.lineAccuracy, 1);
});

test('invalid candidate report cases are rejected', () => {
  assert.throws(
    () => evaluate(manifest, { cases: [{ caseId: 'not-in-the-benchmark', findings: [] }] }),
    /unknown case/
  );
  assert.throws(
    () => evaluate(manifest, {
      cases: [
        { caseId: 'ts-auth-fail-open', findings: [] },
        { caseId: 'ts-auth-fail-open', findings: [] }
      ]
    }),
    /duplicate case/
  );
});

test('CLI emits JSON and enforces an F1 threshold', () => {
  const evaluator = path.join(benchmarkRoot, 'evaluate.cjs');
  const perfect = spawnSync(
    process.execPath,
    [evaluator, '--report', path.join(benchmarkRoot, 'fixtures/perfect-report.json'), '--json'],
    { encoding: 'utf8' }
  );
  assert.equal(perfect.status, 0, perfect.stderr);
  assert.equal(JSON.parse(perfect.stdout).summary.f1, 1);

  const belowThreshold = spawnSync(
    process.execPath,
    [
      evaluator,
      '--report',
      path.join(benchmarkRoot, 'fixtures/noisy-report.json'),
      '--fail-under-f1',
      '0.5'
    ],
    { encoding: 'utf8' }
  );
  assert.equal(belowThreshold.status, 1, belowThreshold.stderr);
  assert.match(belowThreshold.stdout, /F1 0\.2500/);
});
