# Auto Code Review Public Benchmark

This directory is a small, deterministic benchmark for code-review adapters and
agents. It deliberately uses compact synthetic diffs so failures are easy to
inspect and reproduce.

The first version contains 16 cases across TypeScript, JavaScript, Python, and
Go: 11 buggy diffs and 5 clean diffs. Clean cases are first-class test data;
hallucinating a finding on one counts as a false positive.

## Layout

- `manifest.json` is the source of truth for cases and expected findings.
- `cases/*.diff` contains the review input for each case.
- `evaluate.cjs` validates and scores a normalized candidate report.
- `fixtures/` contains a perfect report and a deliberately noisy report.
- `test/evaluate.test.cjs` verifies the corpus, scorer, and CLI with Node's
  built-in test runner.

No production dependencies are required.

## Candidate report contract

Normalize a reviewer's output to this JSON shape:

```json
{
  "schemaVersion": "1.0",
  "benchmark": "auto-code-review-public-v1",
  "cases": [
    {
      "caseId": "ts-auth-fail-open",
      "findings": [
        {
          "ruleId": "authorization-bypass",
          "file": "src/auth.ts",
          "line": 6,
          "severity": "high",
          "message": "Missing users are allowed to delete resources."
        }
      ]
    }
  ]
}
```

Rules:

- Omitted benchmark cases are treated as having zero findings.
- `ruleId`, `file`, and a positive integer `line` are required on every
  finding. `severity` and `message` are optional.
- Case IDs not present in the manifest and duplicate case entries are rejected.
- File paths are normalized to forward slashes and may start with `./`.
- A finding matches the nearest still-unmatched expectation with the same
  `ruleId` and file, up to the manifest's line-distance tolerance (3 by
  default). Duplicate reports therefore become false positives.

The benchmark uses a public normalized rule taxonomy. An integration should map
provider-specific labels to these rule IDs before evaluation; the scorer does
not attempt unreliable semantic grading of prose.

## Run it

```sh
node evaluate.cjs --report fixtures/perfect-report.json
node evaluate.cjs --report fixtures/noisy-report.json --json
node evaluate.cjs --report my-report.json --fail-under-f1 0.75
node --test test/evaluate.test.cjs
```

Optional flags:

- `--manifest <path>` evaluates another compatible manifest.
- `--max-line-distance <n>` overrides the matching tolerance.
- `--json` prints the full machine-readable result.
- `--fail-under-f1 <0..1>` exits with status 1 when the score is lower.

## Metrics

- **Precision** = matched findings / all reported findings.
- **Recall** = matched findings / all expected findings.
- **F1** is the harmonic mean of precision and recall.
- **False positives** include wrong rules, wrong files, out-of-tolerance lines,
  duplicates, and every finding on a clean case.
- **Clean-case false-positive rate** is the share of clean cases receiving one
  or more findings.
- **Line accuracy** is the share of matched findings attached to the exact
  expected line. The output also includes within-one-line accuracy and mean line
  distance.
- **Severity accuracy** is reported for matched findings that supply severity;
  it does not affect precision or recall.

Scores are emitted globally, per language, and per case. Ratios are rounded to
four decimal places.

## Scope and anti-overfitting note

This public corpus is intended for integration checks, regression detection,
and transparent comparisons. Because both inputs and answers are public, it
must not be the only release gate. A serious quality program should retain a
larger hidden holdout set built from real pull requests and periodically rotate
it.
