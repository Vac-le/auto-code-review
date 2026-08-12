# Desktop application architecture

The Windows desktop application is a shell around the existing local-first review system. It does not fork the product into separate CLI, web, and desktop implementations.

## Shared path

1. Electron's main process asks the user to select a Git repository.
2. The main process calls the shared `createDashboardServer()` API directly.
3. The server creates the same bounded snapshot, invokes the already signed-in Codex or Claude Code host, validates evidence, and writes to the shared repository-isolated history store.
4. The sandboxed renderer loads the existing dashboard from a random loopback port and session token.

## Desktop-only responsibilities

- native repository selection plus searchable, favoritable recent projects;
- application/window lifecycle and single-instance behavior;
- system tray operation while a review is running;
- bounded local lifecycle logs with session tokens redacted;
- in-app read-only diagnostics and user-triggered GitHub release checks;
- Windows NSIS packaging, shortcuts, and application identity.

## Security boundaries

- Renderer Node integration is disabled.
- Context isolation and Chromium sandboxing are enabled.
- The preload bridge exposes only narrow, validated operations.
- IPC requests are accepted only from the active main frame.
- Navigation, new windows, and renderer permission requests are denied.
- The dashboard remains bound to `127.0.0.1` and retains its random token, Host-header, Origin, CSP, and read-only review protections.
- Repository content is never executed by the desktop shell.

## Local data

Desktop preferences remember at most eight repository paths and their favorite state in the per-user application data directory. Lifecycle logs rotate at 1 MiB and never record dashboard session tokens. Review history keeps using the shared CLI history location and does not contain patches, source snapshots, or repository absolute paths. No update request runs in the background; the application contacts GitHub's release API only when the user explicitly checks for updates.
