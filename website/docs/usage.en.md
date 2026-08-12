# Auto Code Review user guide

> The interactive demo on the website only illustrates the review stages. It does not read your code. Run the plugin from Codex or Claude Code inside a Git repository for a real review.

## 1. Requirements

- Node.js 20 or newer
- Git 2.30 or newer
- Codex or Claude Code installed
- A Git repository containing the change you want to review

## 2. Install the plugin

Clone the project and install its dependencies:

```bash
git clone https://github.com/Vac-le/auto-code-review.git
cd auto-code-review
npm install
npm run install:agents
```

The installer detects supported hosts and installs the native plugin for Codex and Claude Code. To install one host only:

```bash
npm run install:agents -- --platform codex
npm run install:agents -- --platform claude
```

Start a new Codex task or restart your Claude Code session after installation.

## 3. Open the local review dashboard

Run this from the cloned Auto Code Review checkout and point `--repo` at the Git repository you want to review:

```bash
npm run ui -- --repo /path/to/your-project
```

After the CLI is released or installed globally, you can instead run `auto-code-review ui` directly inside the repository you want to review.

Start it from a normal PowerShell, Windows Terminal, or system shell. Do not launch it from a sandboxed Codex or Claude agent task: repository access stays read-only, but the host CLI still needs write access to its own login state and runtime directory.

The command starts a local service and opens a browser at an address such as `http://127.0.0.1:4387`. The page shows the current repository, Codex and Claude Code availability, real changed files, and the validated review report. Stop the command with `Ctrl+C` to close the local dashboard.

Select one platform or a different port:

```bash
npm run ui -- --repo /path/to/your-project --host codex
npm run ui -- --repo /path/to/your-project --host claude --port 4390
```

The dashboard listens only on `127.0.0.1` and creates a fresh random session token every time. It does not send code to an Auto Code Review server; model requests use the signed-in Codex or Claude Code account you select.

### Review history

The dashboard saves up to 1,000 recent reviews for each repository, so completed, failed, and cancelled reports remain available after restarting the local service and can power the annual activity view. The records are stored outside the repository at `%LOCALAPPDATA%\auto-code-review\history` on Windows, `~/Library/Application Support/auto-code-review/history` on macOS, or `$XDG_STATE_HOME/auto-code-review/history` on Linux. They contain the validated report, finding triage state, status, scope, and changed-file summary only: no source snapshot, original patch, repository absolute path, or session token is stored. Open a record from **Review history**, delete one record, or clear the local history at any time.

### Project configuration

Add an optional `.auto-code-review.json` at the repository root to define `defaultHost`, `defaultScope`, `baseRevision`, `minimumConfidence`, `maxFindings`, `ignorePaths`, and review `instructions`. Configuration is parsed strictly and instructions cannot override safety or evidence rules. See the repository README for a complete example.

## 4. Use with Codex

Open the Git project in Codex and enter this in a new task:

```text
$auto-code-review review my current changes
```

### Common review scopes

Review all uncommitted changes:

```text
$auto-code-review review my current changes
```

Review staged changes only:

```text
$auto-code-review review staged changes
```

Review the current branch against main:

```text
$auto-code-review review my branch against main
```

Review one directory:

```text
$auto-code-review review changes under src/auth
```

Review one commit:

```text
$auto-code-review review commit abc123
```

## 5. Use with Claude Code

Open the Git project and run:

```text
/auto-code-review:review
```

### Common arguments

```text
/auto-code-review:review --staged
/auto-code-review:review --base main
/auto-code-review:review src/auth
/auto-code-review:review 123
/auto-code-review:review --staged --json
```

- `--staged`: review the index only
- `--base main`: review the current branch against main
- `src/auth`: review one file or directory
- `123`: review pull request 123
- `--json`: return the structured JSON report

## 6. Read the report

Every finding should include:

- **Priority**: P0, P1, P2, or P3
- **Precise location**: file path and the smallest useful line range
- **Trigger**: the input, state, or execution path that reaches the problem
- **Observable impact**: the incorrect result a user or system can observe
- **Cause**: why the current code fails
- **Repair direction**: a bounded suggestion rather than an unrelated rewrite
- **Confidence**: at least 0.80 for structured reports

Priority meanings:

- **P0**: immediate, widespread loss or compromise; stop the release
- **P1**: high-impact defect that should be fixed before merge or release
- **P2**: a normal-priority, reproducible defect
- **P3**: a smaller but still concrete and reproducible problem

When no candidate survives the second verification pass, the plugin returns `No verified findings`. This means the review found no issue that met the reporting threshold; it is not a formal proof that the code is perfect.

## 7. Ask the AI to fix findings

Auto Code Review is read-only by default. After checking the report, ask Codex or Claude Code:

```text
Fix the P1 and P2 findings, add regression tests, and run the relevant test suite.
```

Run Auto Code Review again after the fix to confirm the findings are gone and no new regression was introduced.

## 8. Other command-line tools

The CLI creates bounded snapshots, validates JSON reports, and formats output. The AI model active in Codex or Claude Code still performs the actual reasoning.

```bash
npm exec -- auto-code-review snapshot --staged --output snapshot.json
npm exec -- auto-code-review validate --report report.json --snapshot snapshot.json
npm exec -- auto-code-review format --report report.json
npm exec -- auto-code-review doctor
```

## 9. Security and privacy

- Reviews are read-only by default and do not change code or Git state
- No additional model API key or model gateway is required
- Code is not sent to an Auto Code Review hosted service
- The plugin uses the model and account already active in Codex or Claude Code
- Common secret files, binaries, generated output, and lockfiles are skipped
- Common tokens, private keys, and credential formats are redacted before report output

Whether code leaves your machine still depends on the Codex or Claude Code service and account settings you use. Follow the privacy policy of the selected host platform.

## 10. Troubleshooting

### The command is missing after installation

Start a fresh Codex task or restart the Claude Code session. Plugins are loaded when a session starts.

### The report contains no findings

Confirm that the repository contains uncommitted, staged, or branch-relative changes. A clean result is expected when no issue passes the evidence threshold.

### Can I upload code on the website

Not currently. The website demo uses fixed sample data and never receives or stores user code. Run real reviews in Codex or Claude Code.

### Does the plugin modify code automatically

No. The reviewer is read-only. Code changes happen only after you explicitly ask the host AI to implement a fix.

### Where should I report a problem

Open a [GitHub Issue](https://github.com/Vac-le/auto-code-review/issues). Report security vulnerabilities privately through the repository Security Advisory flow.
