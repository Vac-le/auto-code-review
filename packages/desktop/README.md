# Auto Code Review Desktop

Windows desktop shell for the shared local Auto Code Review dashboard.

```bash
npm run build
npm run start --workspace @auto-code-review/desktop
```

Build the x64 NSIS installer with:

```bash
npm run dist:win --workspace @auto-code-review/desktop
```

Output is written to `release/`. The desktop renderer is sandboxed and has no Node.js integration. Repository selection, recent projects, tray lifecycle, and logs are handled by the Electron main process; reviews, validation, and history are provided by `@auto-code-review/cli`.
