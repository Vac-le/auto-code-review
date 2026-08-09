# Quality gates

The project is release-ready only when every required gate below has evidence in CI or the public benchmark.

## Functional gates

- Offline Codex/Claude structure and policy validators pass in CI.
- Before a tagged release, the exact artifacts also pass the currently supported native Codex and Claude validators; record their CLI versions in the release evidence.
- The default invocation remains read-only.
- Working-tree, staged, commit, branch, and selected-file scopes are covered.
- Snapshot output is deterministic for the same Git state.
- Report validation rejects invalid paths, invalid lines, low confidence, missing evidence, and duplicates.
- Windows, macOS, and Linux pass the same test suite.
- The documentation site has no console errors and works at desktop and mobile widths.

## Benchmark gates for 1.0

| Metric | Required threshold |
| --- | ---: |
| Precision on reportable findings | at least 0.80 |
| Recall on P0/P1 expected defects | at least 0.70 |
| F1 across labeled defects | at least 0.75 |
| Average false positives on clean cases | at most 0.50 |
| Correct file and line range | at least 0.98 |

These thresholds describe the behavior of a named host/model/version on the versioned public corpus. Results must not be generalized to untested models.

## Review gates

Before release:

1. Run the complete automated suite with coverage.
2. Run a correctness-focused independent review.
3. Run a security and privacy-focused independent review.
4. Forward-test each platform skill on unseen buggy and clean patches.
5. Fix confirmed findings and rerun all earlier gates.
6. Record residual risks instead of hiding them.

Native validator runs are release evidence rather than ordinary CI because the host CLIs are not runtime dependencies of this repository. For 0.1.0, run the Codex Skill and Plugin Creator validators against `plugins/auto-code-review`, then run `claude plugin validate . --strict` and `claude plugin validate integrations/claude --strict` with the supported Claude Code CLI. CI independently checks the same required files, policies, adapter restrictions, schemas, and package contents.
