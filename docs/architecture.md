# Architecture

Auto Code Review separates model reasoning from deterministic review plumbing.

```text
Codex or Claude plugin
        |
        v
portable review protocol
        |
        +---- host model or host subagents
        |
        +---- local context snapshot
        |
        v
candidate verification and report validation
        |
        +---- Markdown
        +---- JSON
        +---- SARIF (planned)
```

## Components

### Review protocol

The canonical Codex skill defines scope selection, bounded context, specialist lenses, counter-evidence, severity, confidence, and output requirements. Platform adapters may add native invocation controls but must preserve these semantics.

### Deterministic CLI

The CLI owns operations where model variation is undesirable:

- Git scope and hunk enumeration;
- ignore and privacy boundaries;
- normalized repository-relative paths;
- changed-line maps;
- bounded context extraction;
- report schema and line validation;
- duplicate detection and Markdown formatting.

It has no runtime dependency on a model provider.

### Platform adapters

The Codex distribution is a marketplace-backed plugin containing an Agent Skill. The Claude Code distribution is a native Claude plugin containing the corresponding namespaced skill and optional read-only specialist agents.

Platform-only fields and commands remain in their adapter. Portable instructions use the Agent Skills common format.

## Deliberate non-goals for the default path

- No hosted model gateway.
- No required OpenAI, Anthropic, or other provider API key beyond the active coding agent.
- No automatic code modification.
- No replacement for compiler, formatter, linter, or dependency scanner output.
- No whole-repository upload or unbounded context collection.

An optional hosted policy or CI service may be added later, but it must not weaken the local-first default.
