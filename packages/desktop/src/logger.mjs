import { appendFileSync, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const MAX_LOG_BYTES = 1024 * 1024;

function safeDetail(detail) {
  return String(detail ?? "")
    .replace(/#[^\s]*token=[0-9a-f]+/gi, "#token=[redacted]")
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
    .trim()
    .slice(0, 2_000);
}

export function createLogger(path) {
  mkdirSync(dirname(path), { recursive: true });
  return (event, detail = "") => {
    try {
      if (existsSync(path) && statSync(path).size >= MAX_LOG_BYTES) renameSync(path, `${path}.previous`);
      const suffix = safeDetail(detail);
      appendFileSync(path, `${new Date().toISOString()} ${event}${suffix ? ` ${suffix}` : ""}\n`, { encoding: "utf8", mode: 0o600 });
    } catch {
      try { writeFileSync(path, "", { encoding: "utf8", mode: 0o600 }); } catch { /* Logging must never crash the app. */ }
    }
  };
}
