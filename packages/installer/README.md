# @auto-code-review/install

Zero-dependency installer for the Auto Code Review Codex and Claude Code plugins.

```bash
npx @auto-code-review/install
```

Use `--platform codex` or `--platform claude` to configure one host, and use `--dry-run` to inspect every command first. The installer registers only the official repository as a plugin marketplace and installs the native adapter. It never asks for or stores a model API key. If a marketplace with the same name already exists, installation fails closed so a different source cannot be mistaken for the official plugin.
