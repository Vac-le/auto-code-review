import { basename, extname } from "node:path";
import type { OmissionReason } from "./types.ts";

const LOCK_FILES = new Set([
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "composer.lock",
  "deno.lock",
  "flake.lock",
  "gemfile.lock",
  "go.sum",
  "package-lock.json",
  "packages.lock.json",
  "pnpm-lock.yaml",
  "poetry.lock",
  "pubspec.lock",
  "uv.lock",
  "yarn.lock",
]);

const GENERATED_EXTENSIONS = new Set([".map", ".min.css", ".min.js"]);
const GENERATED_SEGMENTS = new Set([
  ".next",
  ".nuxt",
  ".svelte-kit",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "target",
  "vendor",
]);

const SENSITIVE_NAMES = new Set([
  ".env",
  ".env.local",
  ".npmrc",
  ".pypirc",
  ".netrc",
  "credentials",
  "credentials.json",
  "secrets.json",
]);

const SENSITIVE_EXTENSIONS = new Set([".key", ".p12", ".pfx", ".pem"]);
const SENSITIVE_YAML_NAME = /^(?:secrets?|credentials?)(?:[._-][a-z0-9-]+)?\.ya?ml$/;
const SENSITIVE_YAML_SEGMENTS = new Set([".secrets", "secret", "secrets", "credential", "credentials"]);

function normalize(path: string): string {
  return path.replaceAll("\\", "/").toLowerCase();
}

export function classifyIgnoredPath(path: string): OmissionReason | null {
  const normalized = normalize(path);
  const name = basename(normalized);
  const segments = normalized.split("/");
  const yaml = /\.ya?ml$/.test(name);

  if (LOCK_FILES.has(name) || name.endsWith(".lock")) return "lockfile";
  if (
    SENSITIVE_NAMES.has(name)
    || name.startsWith(".env.")
    || SENSITIVE_YAML_NAME.test(name)
    || (yaml && segments.slice(0, -1).some((segment) => SENSITIVE_YAML_SEGMENTS.has(segment)))
    || SENSITIVE_EXTENSIONS.has(extname(name))
    || /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/.test(name)
  ) {
    return "sensitive-path";
  }
  if (segments.some((segment) => GENERATED_SEGMENTS.has(segment))) return "generated";
  if ([...GENERATED_EXTENSIONS].some((extension) => name.endsWith(extension))) return "generated";
  if (/^(?:bundle|vendor)(?:\.[a-f0-9]{6,})?\.(?:js|css)$/.test(name)) return "generated";
  return null;
}

export function looksGenerated(content: Buffer | string): boolean {
  const sample = Buffer.isBuffer(content) ? content.subarray(0, 16_384).toString("utf8") : content.slice(0, 16_384);
  const header = sample.split(/\r?\n/).slice(0, 12).join("\n");
  if (/^\s*(?:(?:\/\/|#|\/\*+|\*|<!--)\s*)?(?:@generated|auto[- ]generated|automatically generated)\b/im.test(header)) return true;
  if (/^\s*(?:(?:\/\/|#|\/\*+|\*|<!--)\s*)?code generated\b[^\n]{0,100}\bdo not edit\b/im.test(header)) return true;
  if (/^\s*(?:(?:\/\/|#|\/\*+|\*|<!--)\s*)?this file was generated\b/im.test(header)) return true;

  const lines = sample.split(/\r?\n/);
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (nonEmpty.length > 0 && nonEmpty.some((line) => line.length > 10_000)) return true;
  return false;
}

export function isBinary(content: Buffer): boolean {
  if (content.length === 0) return false;
  const sample = content.subarray(0, Math.min(content.length, 8_192));
  if (sample.includes(0)) return true;

  let suspicious = 0;
  for (const byte of sample) {
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  return suspicious / sample.length > 0.15;
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".c": "c",
  ".cc": "cpp",
  ".cpp": "cpp",
  ".cs": "csharp",
  ".css": "css",
  ".go": "go",
  ".h": "c",
  ".hpp": "cpp",
  ".html": "html",
  ".java": "java",
  ".js": "javascript",
  ".json": "json",
  ".jsx": "javascript",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".md": "markdown",
  ".php": "php",
  ".py": "python",
  ".rb": "ruby",
  ".rs": "rust",
  ".sh": "shell",
  ".sql": "sql",
  ".swift": "swift",
  ".toml": "toml",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".vue": "vue",
  ".xml": "xml",
  ".yaml": "yaml",
  ".yml": "yaml",
};

export function detectLanguage(path: string): string {
  const name = basename(path).toLowerCase();
  if (name === "dockerfile") return "dockerfile";
  if (name === "makefile") return "makefile";
  return LANGUAGE_BY_EXTENSION[extname(name)] ?? "text";
}
