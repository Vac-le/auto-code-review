# Auto Code Review for Claude Code

This directory is both a Claude Code plugin and a self-contained marketplace root. It provides one explicit command:

```text
/auto-code-review:review
```

The command runs an isolated reviewer with read/search tools and a bundled read-only Git broker, but without general shell or file-editing access. The broker validates every operation, disables external diff programs and pagers, rejects output redirection, and launches fixed Git/GitHub commands without a shell. The review performs static analysis only and does not change files, Git state, pull requests, or dependencies.

## Try locally

Load the plugin for one Claude Code session:

```bash
claude --plugin-dir ./integrations/claude
```

Then invoke it from a Git repository:

```text
/auto-code-review:review
```

## Install from the local marketplace

From Claude Code, point to this directory and install the plugin:

```text
/plugin marketplace add ./integrations/claude
/plugin install auto-code-review@auto-code-review
```

If Claude Code asks for it, run `/reload-plugins` before using the command.

For hosted distribution, publish the contents of this directory as the root of a Git repository so `.claude-plugin/marketplace.json` remains at the marketplace root. Users can then run:

```text
/plugin marketplace add owner/repository
/plugin install auto-code-review@auto-code-review
```

## Review targets

```text
/auto-code-review:review
/auto-code-review:review --staged
/auto-code-review:review --base main
/auto-code-review:review src/auth
/auto-code-review:review 123
```

With no arguments, the command reviews local tracked changes relative to `HEAD` and includes relevant untracked source files. Pull-request review requires an installed and authenticated GitHub CLI. The plugin reads PR data but never posts comments.

## Validate

Run the dependency-free static checks from this directory:

```bash
node scripts/validate.mjs
```

When Claude Code is installed, also run its official validator:

```bash
claude plugin validate . --strict
```

The plugin and marketplace versions are intentionally pinned. Bump every manifest version together for each release so installed users receive updates.
