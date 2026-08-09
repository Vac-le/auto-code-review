#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function round(value) {
  return Number(value.toFixed(4));
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 0 : round(numerator / denominator);
}

function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.cases)) {
    throw new Error('Manifest must contain a cases array.');
  }

  const ids = new Set();
  for (const benchmarkCase of manifest.cases) {
    if (!benchmarkCase.id || ids.has(benchmarkCase.id)) {
      throw new Error(`Manifest case ID is missing or duplicated: ${benchmarkCase.id || '<missing>'}`);
    }
    ids.add(benchmarkCase.id);
    if (!benchmarkCase.language || !['buggy', 'clean'].includes(benchmarkCase.kind)) {
      throw new Error(`Manifest case ${benchmarkCase.id} has invalid language or kind.`);
    }
    if (!Array.isArray(benchmarkCase.expectedFindings)) {
      throw new Error(`Manifest case ${benchmarkCase.id} must contain expectedFindings.`);
    }
    if (benchmarkCase.kind === 'clean' && benchmarkCase.expectedFindings.length !== 0) {
      throw new Error(`Clean case ${benchmarkCase.id} cannot contain expected findings.`);
    }
    for (const finding of benchmarkCase.expectedFindings) {
      validateFinding(finding, `Expected finding ${finding.id || '<missing>'}`, true);
    }
  }
}

function validateFinding(finding, label, expected = false) {
  if (!finding || typeof finding !== 'object') {
    throw new Error(`${label} must be an object.`);
  }
  if (expected && typeof finding.id !== 'string') {
    throw new Error(`${label} must have an id.`);
  }
  if (typeof finding.ruleId !== 'string' || finding.ruleId.length === 0) {
    throw new Error(`${label} must have a non-empty ruleId.`);
  }
  if (typeof finding.file !== 'string' || finding.file.length === 0) {
    throw new Error(`${label} must have a non-empty file.`);
  }
  if (!Number.isInteger(finding.line) || finding.line < 1) {
    throw new Error(`${label} must have a positive integer line.`);
  }
}

function indexReport(manifest, report) {
  if (!report || !Array.isArray(report.cases)) {
    throw new Error('Candidate report must contain a cases array.');
  }
  if (report.benchmark && report.benchmark !== manifest.id) {
    throw new Error(`Report targets ${report.benchmark}, expected ${manifest.id}.`);
  }

  const knownCases = new Set(manifest.cases.map((entry) => entry.id));
  const indexed = new Map();
  for (const result of report.cases) {
    if (!result || typeof result.caseId !== 'string') {
      throw new Error('Every candidate case entry must have a caseId.');
    }
    if (!knownCases.has(result.caseId)) {
      throw new Error(`Candidate report contains unknown case: ${result.caseId}.`);
    }
    if (indexed.has(result.caseId)) {
      throw new Error(`Candidate report contains duplicate case: ${result.caseId}.`);
    }
    if (!Array.isArray(result.findings)) {
      throw new Error(`Candidate case ${result.caseId} must contain a findings array.`);
    }
    result.findings.forEach((finding, index) => {
      validateFinding(finding, `Finding ${index} in ${result.caseId}`);
    });
    indexed.set(result.caseId, result.findings);
  }
  return indexed;
}

function emptyCounts() {
  return {
    cases: 0,
    cleanCases: 0,
    cleanCasesWithFindings: 0,
    expectedFindings: 0,
    reportedFindings: 0,
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    exactLineMatches: 0,
    withinOneLineMatches: 0,
    totalLineDistance: 0,
    severityComparisons: 0,
    severityMatches: 0
  };
}

function addCounts(target, source) {
  for (const key of Object.keys(target)) {
    target[key] += source[key];
  }
}

function finishCounts(counts) {
  const precision = ratio(counts.truePositives, counts.reportedFindings);
  const recall = ratio(counts.truePositives, counts.expectedFindings);
  const f1 = precision + recall === 0 ? 0 : round((2 * precision * recall) / (precision + recall));

  return {
    ...counts,
    precision,
    recall,
    f1,
    falsePositiveRate: ratio(counts.falsePositives, counts.reportedFindings),
    cleanCaseFalsePositiveRate: ratio(counts.cleanCasesWithFindings, counts.cleanCases),
    lineAccuracy: ratio(counts.exactLineMatches, counts.truePositives),
    withinOneLineAccuracy: ratio(counts.withinOneLineMatches, counts.truePositives),
    meanLineDistance: ratio(counts.totalLineDistance, counts.truePositives),
    severityAccuracy: ratio(counts.severityMatches, counts.severityComparisons)
  };
}

function scoreCase(benchmarkCase, actualFindings, maxLineDistance) {
  const expected = benchmarkCase.expectedFindings;
  const remainingExpected = new Set(expected.map((_, index) => index));
  const matches = [];
  const falsePositiveIndexes = [];

  actualFindings.forEach((actual, actualIndex) => {
    const actualFile = normalizePath(actual.file);
    const candidates = [...remainingExpected]
      .map((expectedIndex) => {
        const target = expected[expectedIndex];
        return {
          expectedIndex,
          target,
          distance: Math.abs(actual.line - target.line)
        };
      })
      .filter(({ target, distance }) =>
        target.ruleId === actual.ruleId &&
        normalizePath(target.file) === actualFile &&
        distance <= maxLineDistance
      )
      .sort((left, right) => left.distance - right.distance || left.expectedIndex - right.expectedIndex);

    if (candidates.length === 0) {
      falsePositiveIndexes.push(actualIndex);
      return;
    }

    const selected = candidates[0];
    remainingExpected.delete(selected.expectedIndex);
    matches.push({
      actualIndex,
      expectedId: selected.target.id,
      ruleId: selected.target.ruleId,
      expectedLine: selected.target.line,
      actualLine: actual.line,
      lineDistance: selected.distance,
      severityMatch: typeof actual.severity === 'string'
        ? actual.severity === selected.target.severity
        : null
    });
  });

  const counts = emptyCounts();
  counts.cases = 1;
  counts.cleanCases = benchmarkCase.kind === 'clean' ? 1 : 0;
  counts.cleanCasesWithFindings = benchmarkCase.kind === 'clean' && actualFindings.length > 0 ? 1 : 0;
  counts.expectedFindings = expected.length;
  counts.reportedFindings = actualFindings.length;
  counts.truePositives = matches.length;
  counts.falsePositives = falsePositiveIndexes.length;
  counts.falseNegatives = remainingExpected.size;

  for (const match of matches) {
    if (match.lineDistance === 0) counts.exactLineMatches += 1;
    if (match.lineDistance <= 1) counts.withinOneLineMatches += 1;
    counts.totalLineDistance += match.lineDistance;
    if (match.severityMatch !== null) {
      counts.severityComparisons += 1;
      if (match.severityMatch) counts.severityMatches += 1;
    }
  }

  return {
    id: benchmarkCase.id,
    language: benchmarkCase.language,
    kind: benchmarkCase.kind,
    ...finishCounts(counts),
    matches,
    falsePositiveIndexes,
    missedExpectedIds: [...remainingExpected].map((index) => expected[index].id)
  };
}

function evaluate(manifest, report, options = {}) {
  validateManifest(manifest);
  const indexedReport = indexReport(manifest, report);
  const configuredDistance = options.maxLineDistance ?? manifest.matching?.maxLineDistance ?? 3;
  if (!Number.isInteger(configuredDistance) || configuredDistance < 0) {
    throw new Error('maxLineDistance must be a non-negative integer.');
  }

  const totals = emptyCounts();
  const languageCounts = new Map();
  const cases = manifest.cases.map((benchmarkCase) => {
    const result = scoreCase(benchmarkCase, indexedReport.get(benchmarkCase.id) || [], configuredDistance);
    const rawCounts = Object.fromEntries(Object.keys(totals).map((key) => [key, result[key]]));
    addCounts(totals, rawCounts);
    if (!languageCounts.has(benchmarkCase.language)) {
      languageCounts.set(benchmarkCase.language, emptyCounts());
    }
    addCounts(languageCounts.get(benchmarkCase.language), rawCounts);
    return result;
  });

  return {
    schemaVersion: '1.0',
    benchmark: manifest.id,
    maxLineDistance: configuredDistance,
    summary: finishCounts(totals),
    byLanguage: Object.fromEntries(
      [...languageCounts.entries()].map(([language, counts]) => [language, finishCounts(counts)])
    ),
    cases
  };
}

function formatHuman(result) {
  const score = result.summary;
  const lines = [
    `${result.benchmark} (line tolerance: ${result.maxLineDistance})`,
    `Precision ${score.precision.toFixed(4)} | Recall ${score.recall.toFixed(4)} | F1 ${score.f1.toFixed(4)}`,
    `TP ${score.truePositives} | FP ${score.falsePositives} | FN ${score.falseNegatives}`,
    `Exact-line accuracy ${score.lineAccuracy.toFixed(4)} | within-one-line ${score.withinOneLineAccuracy.toFixed(4)} | mean distance ${score.meanLineDistance.toFixed(4)}`,
    `Clean-case FP rate ${score.cleanCaseFalsePositiveRate.toFixed(4)} | severity accuracy ${score.severityAccuracy.toFixed(4)}`
  ];

  for (const [language, languageScore] of Object.entries(result.byLanguage)) {
    lines.push(
      `${language.padEnd(10)} P ${languageScore.precision.toFixed(4)} R ${languageScore.recall.toFixed(4)} F1 ${languageScore.f1.toFixed(4)} FP ${languageScore.falsePositives}`
    );
  }
  return lines.join('\n');
}

function usage() {
  return [
    'Usage: node evaluate.cjs --report <candidate.json> [options]',
    '',
    'Options:',
    '  --manifest <path>          Benchmark manifest (default: ./manifest.json)',
    '  --max-line-distance <n>    Override matching tolerance',
    '  --fail-under-f1 <0..1>     Exit 1 when F1 is below threshold',
    '  --json                     Print machine-readable JSON',
    '  --help                     Show this message'
  ].join('\n');
}

function parseArguments(argv) {
  const options = { manifest: path.join(__dirname, 'manifest.json'), json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') options.help = true;
    else if (argument === '--json') options.json = true;
    else if (argument === '--report') options.report = argv[++index];
    else if (argument === '--manifest') options.manifest = argv[++index];
    else if (argument === '--max-line-distance') options.maxLineDistance = Number(argv[++index]);
    else if (argument === '--fail-under-f1') options.failUnderF1 = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    console.log(usage());
    return 0;
  }
  if (!options.report) throw new Error('--report is required.');
  if (options.failUnderF1 !== undefined &&
      (!Number.isFinite(options.failUnderF1) || options.failUnderF1 < 0 || options.failUnderF1 > 1)) {
    throw new Error('--fail-under-f1 must be between 0 and 1.');
  }

  const manifest = readJson(path.resolve(options.manifest));
  const report = readJson(path.resolve(options.report));
  const result = evaluate(manifest, report, { maxLineDistance: options.maxLineDistance });
  console.log(options.json ? JSON.stringify(result, null, 2) : formatHuman(result));
  return options.failUnderF1 !== undefined && result.summary.f1 < options.failUnderF1 ? 1 : 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`Evaluation failed: ${error.message}`);
    process.exitCode = 2;
  }
}

module.exports = {
  evaluate,
  formatHuman,
  normalizePath,
  parseArguments,
  readJson,
  validateManifest
};
