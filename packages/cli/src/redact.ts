const REDACTED = "[REDACTED]";

const SECRET_QUOTED = /\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|private[_-]?key|secret)["']?\s*[:=]\s*)(["'])([^"'\r\n]{6,})(["'])/gi;
const SECRET_ENV = /^((?:(?:[ +\-])|(?:\d+:\s*))?\s*(?:export\s+)?[A-Z][A-Z0-9_]*(?:API_KEY|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|SECRET_ACCESS_KEY|PASSWORD|PASSWD|PRIVATE_KEY|SECRET)\s*=\s*)([^\s#;]{6,})/gm;
const SECRET_YAML = /^((?:(?:[ +\-])|(?:\d+:\s*))?\s*["']?(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|secret[_-]?access[_-]?key|password|passwd|private[_-]?key|secret)["']?\s*:\s*)(?![|>])([^"'#\s][^#\r\n]{4,}?\S)(\s*(?:#.*)?)$/gim;
const AUTHORIZATION = /\b(authorization\s*:\s*(?:bearer|basic)\s+)([^\s,"']+)/gi;
const WELL_KNOWN_TOKENS = /\b(?:AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|gh[opusr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const HIGH_ENTROPY_TOKEN = /(?<![A-Za-z0-9+/_=-])(?=[A-Za-z0-9+/_=-]{32,}(?![A-Za-z0-9+/_=-]))(?=[A-Za-z0-9+/_=-]*[A-Z])(?=[A-Za-z0-9+/_=-]*[a-z])(?=[A-Za-z0-9+/_=-]*\d)[A-Za-z0-9+/_=-]{32,}(?![A-Za-z0-9+/_=-])/g;
const PRIVATE_KEY = /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/g;
const URL_CREDENTIALS = /(https?:\/\/[^\s/:]+:)([^@\s/]+)(@)/gi;
const YAML_BLOCK_HEADER = /^(?<prefix>(?:(?:[ +\-])|(?:\d+: ?))?)(?<indent>\s*)["']?(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|secret[_-]?access[_-]?key|password|passwd|private[_-]?key|secret)["']?\s*:\s*[|>][+\-]?\d?\s*(?:#.*)?$/i;
const PATCH_LINE = /^(?<prefix>(?:(?:[ +\-])|(?:\d+: ?))?)(?<body>.*)$/;

export interface RedactionResult {
  text: string;
  count: number;
}

export function redactSecrets(input: string): RedactionResult {
  let count = 0;
  const lines = input.split("\n");
  let blockIndent: number | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const header = line.match(YAML_BLOCK_HEADER);
    if (header?.groups) {
      blockIndent = header.groups.indent.length;
      continue;
    }
    if (blockIndent === undefined) continue;
    const parsed = line.match(PATCH_LINE)?.groups;
    const body = parsed?.body ?? line;
    if (!body.trim()) continue;
    const indentation = body.match(/^\s*/)?.[0].length ?? 0;
    if (indentation <= blockIndent) {
      blockIndent = undefined;
      index -= 1;
      continue;
    }
    lines[index] = `${parsed?.prefix ?? ""}${body.slice(0, indentation)}${REDACTED}`;
    count += 1;
  }
  let text = lines.join("\n");

  const replace = (pattern: RegExp, replacement: string | ((...args: string[]) => string)): void => {
    text = text.replace(pattern, (...args: string[]) => {
      count += 1;
      return typeof replacement === "string" ? replacement : replacement(...args);
    });
  };

  replace(PRIVATE_KEY, (match) => `${REDACTED}${"\n".repeat((match.match(/\n/g) ?? []).length)}`);
  replace(SECRET_QUOTED, (_match, prefix, quote) => `${prefix}${quote}${REDACTED}${quote}`);
  replace(SECRET_ENV, (_match, prefix) => `${prefix}${REDACTED}`);
  replace(SECRET_YAML, (_match, prefix, _secret, suffix) => `${prefix}${REDACTED}${suffix}`);
  replace(AUTHORIZATION, (_match, prefix) => `${prefix}${REDACTED}`);
  replace(URL_CREDENTIALS, (_match, prefix, _password, suffix) => `${prefix}${REDACTED}${suffix}`);
  replace(WELL_KNOWN_TOKENS, REDACTED);
  replace(JWT, REDACTED);
  replace(HIGH_ENTROPY_TOKEN, REDACTED);

  return { text, count };
}
