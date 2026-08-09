# @auto-code-review/cli

Deterministic local tooling for the Auto Code Review skills used by Codex and Claude Code. The package has no runtime dependencies and supports Node.js 20 or newer.

## Commands

Install the released package globally, or use `npm exec -- auto-code-review ...` from a cloned monorepo after `npm install`:

```bash
npm install --global @auto-code-review/cli
```

```bash
auto-code-review snapshot --staged --output snapshot.json
auto-code-review validate --report report.json --snapshot snapshot.json
auto-code-review format --report report.json --snapshot snapshot.json
auto-code-review doctor
```

- `snapshot` collects Git hunks and bounded context without running repository code. It skips binaries, generated output, lockfiles, sensitive paths, and symbolic links, and redacts common credentials.
- `validate` enforces the canonical `scope`, `P0`–`P3`, confidence, category, evidence, path, line, and deduplication contract against a snapshot.
- `format` renders a validated report as Markdown.
- `doctor` safely detects Git, Codex, Claude Code, and repository readiness.

Run `auto-code-review --help` for every option. Snapshot and validation output is JSON on stdout; diagnostics are written to stderr and use stable non-zero exit codes.

## Privacy model

The CLI is local and read-only apart from an explicitly selected output file. It invokes Git with argument arrays rather than a shell, never executes project code, never follows worktree symbolic links, and never contacts a network service. Review snapshots are deterministic for the same Git state.

The published report and snapshot JSON Schemas are included under `dist/schemas/`.

Licensed under Apache-2.0.
