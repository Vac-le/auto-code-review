# Privacy and trust boundaries

## Default data flow

Source code stays on the developer machine except for the normal data flow of the coding agent the developer has already chosen. Auto Code Review adds no separate model provider, proxy, telemetry endpoint, or hosted source-code store in its default configuration.

The local CLI runs read-only Git commands and reads bounded repository context. It does not execute project code during snapshot or report validation.

## Local review history

The local dashboard can retain up to 50 terminal review records for each repository. These records live in the user's application-state directory, never in the repository, and contain the validated report, status, review scope, and changed-file summary. They exclude source snapshots, original patches, repository absolute paths, and dashboard session tokens. A user can delete individual records or clear all local history from the dashboard.

## Excluded inputs

Default collection excludes common secret and credential paths, environment files, private keys, binaries, generated output, vendored dependencies, lockfiles, and files outside the repository root.

Users remain responsible for the data-handling terms and configuration of their chosen Codex or Claude environment.

## Untrusted repository content

Source files, comments, documentation, diffs, filenames, and generated text are untrusted review data. Embedded instructions must never override the review protocol, request credentials, expand filesystem scope, enable network access, or cause code execution.

## Telemetry

There is no telemetry by default. Future opt-in quality feedback must document every transmitted field, avoid source content, and remain disabled until the user gives informed consent.
