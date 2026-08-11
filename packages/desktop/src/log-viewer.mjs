import { existsSync, readFileSync, statSync } from "node:fs";
import { basename } from "node:path";

const MAX_VISIBLE_BYTES = 512 * 1024;

function readTail(path, byteLimit = MAX_VISIBLE_BYTES) {
  if (!existsSync(path)) return "";
  const size = statSync(path).size;
  const content = readFileSync(path);
  const start = Math.max(0, content.length - byteLimit);
  const tail = content.subarray(start).toString("utf8");
  if (start === 0) return tail;
  const firstLine = tail.indexOf("\n");
  return `[Earlier log entries are hidden]\n${firstLine >= 0 ? tail.slice(firstLine + 1) : tail}`;
}

export function readLogSnapshot(path) {
  const previousPath = `${path}.previous`;
  const previous = readTail(previousPath, Math.floor(MAX_VISIBLE_BYTES / 2));
  const current = readTail(path);
  const sections = [];
  if (previous) sections.push(`--- Previous session log ---\n${previous.trimEnd()}`);
  if (current) sections.push(`--- Current log ---\n${current.trimEnd()}`);
  return {
    content: sections.join("\n\n"),
    fileName: basename(path),
    updatedAt: existsSync(path) ? statSync(path).mtime.toISOString() : null,
  };
}
