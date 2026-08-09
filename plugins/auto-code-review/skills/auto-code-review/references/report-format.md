# Structured report format

Return this JSON shape when the user requests machine-readable output or the companion CLI will validate the result:

```json
{
  "schemaVersion": "1.0",
  "scope": {
    "kind": "working-tree",
    "base": null,
    "head": null
  },
  "summary": "One verified finding",
  "findings": [
    {
      "id": "ACR-001",
      "priority": "P1",
      "confidence": 0.94,
      "category": "correctness",
      "file": "src/example.ts",
      "startLine": 42,
      "endLine": 44,
      "title": "Retry path commits the same payment twice",
      "evidence": "The timeout branch retries after the first request may have committed, and no idempotency key is reused.",
      "failureScenario": "A gateway timeout after a successful charge causes the retry to create a second charge.",
      "suggestedFix": "Persist and reuse one idempotency key for all attempts of the logical payment."
    }
  ]
}
```

Constraints:

- Use repository-relative paths with `/` separators.
- Pin `startLine` and `endLine` to existing lines, with `startLine <= endLine`.
- Keep titles under 100 characters and phrase them as the defect, not the remedy.
- Use one root cause per finding.
- Use categories: `correctness`, `security`, `data-integrity`, `concurrency`, `performance`, `compatibility`, or `testing`.
- Use an empty `findings` array when no issue survives verification.
- Do not add prose before or after JSON when strict structured output is requested.
