# Auto Code Review

**One review standard for every coding agent.**

Auto Code Review is a local-first, evidence-first AI review workflow for Codex and Claude Code. It uses the model and account already active in your coding agent, so the default path needs no additional model API key, hosted gateway, or source-code upload.

Every reported defect must include a concrete trigger, observable impact, precise location, and repository evidence. Candidates that cannot survive a second verification pass are discarded.

## Why this project exists

Coding agents already know how to read a diff. The hard part is making review behavior trustworthy and repeatable across platforms:

- one severity rubric and report schema;
- complete diff coverage with bounded context;
- explicit counter-evidence and false-positive filtering;
- deterministic file and line validation;
- a public corpus containing both buggy and clean patches;
- read-only behavior unless the user separately asks for a fix.

## One-command install

Requirements: Node.js 20+ and either Codex or Claude Code.

From a cloned checkout, run:

```bash
npm run install:agents
```

This registers the local checkout as a marketplace and installs the native AI-review plugin for every detected target. Select one host with `npm run install:agents -- --platform codex` or `--platform claude`. Use `--dry-run` to print the exact host commands without changing configuration. The companion CLI remains optional; the plugins fall back to read-only Git inspection when it is not installed.

After the first public package release, the same installer is distributed as `npx @auto-code-review/install`. The repository does not claim that unpublished package is currently available.

## Install from source

Requirements: Node.js 20+, Git 2.30+, and either Codex or Claude Code.

```bash
git clone https://github.com/Vac-le/auto-code-review.git
cd auto-code-review
npm install
npm run quality
npm run install:agents
```

### Codex

```bash
codex plugin marketplace add .
codex plugin add auto-code-review@auto-code-review
```

Start a fresh task in a Git repository and invoke:

```text
$auto-code-review review my current changes
```

### Claude Code

```bash
claude plugin marketplace add ./integrations/claude
claude plugin install auto-code-review@auto-code-review
```

Then invoke:

```text
/auto-code-review:review
```

## Optional companion CLI

The CLI includes a real local review dashboard. From the Git repository you want to review, run:

From the cloned Auto Code Review checkout, point the dashboard at any repository:

```bash
npm run ui -- --repo /path/to/your-project
```

After the CLI package is released or installed globally, run `auto-code-review ui` directly inside the repository you want to review.

It opens a browser on `127.0.0.1`, detects the repository and signed-in Codex or Claude Code installation, and displays validated findings from a real review. The server is available only while that command is running; press `Ctrl+C` to stop it. Select a platform or port with `--host codex`, `--host claude`, or `--port 4387`.

The remaining commands provide deterministic plumbing:

```bash
npm exec -- auto-code-review snapshot --staged --output snapshot.json
npm exec -- auto-code-review validate --report report.json --snapshot snapshot.json
npm exec -- auto-code-review format --report report.json
npm exec -- auto-code-review doctor
```

`snapshot` enumerates changed hunks and bounded context while excluding binaries, generated output, lockfiles, and common secret paths. `validate` rejects invalid paths, line ranges, weak evidence, duplicate findings, unsupported categories, and low-confidence results.

## Review behavior

The default review checks:

- correctness and edge cases;
- authentication, authorization, injection, and data exposure;
- state transitions, retries, concurrency, and idempotency;
- resource and performance regressions with a concrete trigger;
- API, schema, migration, and backward compatibility;
- test gaps tied to a specific changed behavior.

It does not report formatting preferences, generic refactoring ideas, or hypothetical risks without a reachable failure scenario.

## Public benchmark

The `benchmark/` directory contains labeled patches across multiple languages, including clean changes designed to punish false-positive-heavy reviewers. The scorer reports precision, recall, F1, clean-case false positives, and file/line accuracy. CI tests the scorer with known reports; those fixture scores are not model-quality claims. Any published reviewer score must name the host, model, version, and corpus revision.

Release quality gates are documented in [docs/quality.md](docs/quality.md). Architecture and trust boundaries are covered in [docs/architecture.md](docs/architecture.md) and [docs/privacy.md](docs/privacy.md).

## Project status

The repository is in pre-release development. The plugin formats, deterministic core, benchmark, and documentation site are exercised in CI on Windows, macOS, and Linux before the first public release.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Apache-2.0
