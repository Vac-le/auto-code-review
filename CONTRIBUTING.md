# Contributing

Thank you for improving Auto Code Review.

## Development

Requirements:

- Node.js 20 or newer
- Git 2.30 or newer
- Python 3.10 or newer for plugin validation

Install and verify:

```bash
npm install
npm run quality
```

Run the local documentation site:

```bash
npm run site
```

## Pull requests

- Keep the default workflow local-first and read-only.
- Add a benchmark case for changes to review behavior.
- Add a regression test for bug fixes.
- Document user-visible behavior.
- Keep findings evidence-based and avoid style-only rules.

Small, focused pull requests are easier to validate. Describe the failure mode, the intended behavior, and the checks you ran.
