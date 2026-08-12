import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { ReviewReport, SnapshotMode } from "./types.ts";
import { validateReport } from "./validate.ts";

export type TerminalReviewState = "complete" | "failed" | "cancelled";

export interface HistorySnapshot {
  files: number;
  additions: number;
  deletions: number;
  omitted: number;
  redactions: number;
  truncated: boolean;
  filesList: Array<{ path: string; status: string; additions: number; deletions: number }>;
}

export interface HistoryRecord {
  id: string;
  state: TerminalReviewState;
  host: "codex" | "claude";
  createdAt: string;
  updatedAt: string;
  scope: { mode: SnapshotMode; base: string | null; head: string | null; branch: string | null };
  snapshot?: HistorySnapshot;
  report?: ReviewReport;
  error?: string;
  findingStates?: Record<string, "open" | "resolved" | "false-positive">;
}

export interface HistorySummary {
  id: string;
  state: TerminalReviewState;
  host: "codex" | "claude";
  createdAt: string;
  updatedAt: string;
  scope: HistoryRecord["scope"];
  files: number;
  findings: number;
  summary: string | null;
}

export interface ReviewHistoryStore {
  path: string;
  list(): HistorySummary[];
  get(id: string): HistoryRecord | null;
  save(record: HistoryRecord): void;
  delete(id: string): boolean;
  clear(): void;
  setFindingState(id: string, findingId: string, state: "open" | "resolved" | "false-positive"): HistoryRecord | null;
}

const MAX_HISTORY_RECORDS = 1_000;
const MAX_HISTORY_BYTES = 64 * 1024 * 1024;
const SAFE_ID = /^[0-9a-f-]{8,64}$/i;

function stateDirectory(platform = process.platform, env = process.env, home = homedir()): string {
  if (platform === "win32") return env.LOCALAPPDATA || join(home, "AppData", "Local");
  if (platform === "darwin") return join(home, "Library", "Application Support");
  return env.XDG_STATE_HOME || join(home, ".local", "state");
}

export function defaultHistoryDirectory(): string {
  return join(stateDirectory(), "auto-code-review", "history");
}

function repositoryKey(repositoryRoot: string): string {
  const canonical = process.platform === "win32" ? resolve(repositoryRoot).toLowerCase() : resolve(repositoryRoot);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

function safeString(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !/[\u0000-\u001f\u007f-\u009f]/.test(value) ? value : null;
}

function safeCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 10_000_000 ? value : null;
}

function parseSnapshot(value: unknown): HistorySnapshot | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const files = safeCount(raw.files);
  const additions = safeCount(raw.additions);
  const deletions = safeCount(raw.deletions);
  const omitted = safeCount(raw.omitted);
  const redactions = safeCount(raw.redactions);
  if ([files, additions, deletions, omitted, redactions].some((item) => item === null) || typeof raw.truncated !== "boolean" || !Array.isArray(raw.filesList)) return undefined;
  const filesList = raw.filesList.slice(0, 1_000).flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const file = entry as Record<string, unknown>;
    const path = safeString(file.path, 1_024);
    const status = safeString(file.status, 32);
    const fileAdditions = safeCount(file.additions);
    const fileDeletions = safeCount(file.deletions);
    return path && status && fileAdditions !== null && fileDeletions !== null
      ? [{ path, status, additions: fileAdditions, deletions: fileDeletions }]
      : [];
  });
  return { files: files!, additions: additions!, deletions: deletions!, omitted: omitted!, redactions: redactions!, truncated: raw.truncated, filesList };
}

function parseRecord(value: unknown): HistoryRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !SAFE_ID.test(raw.id)) return null;
  if (raw.state !== "complete" && raw.state !== "failed" && raw.state !== "cancelled") return null;
  if (raw.host !== "codex" && raw.host !== "claude") return null;
  const createdAt = safeString(raw.createdAt, 64);
  const updatedAt = safeString(raw.updatedAt, 64);
  if (!createdAt || !updatedAt || !Number.isFinite(Date.parse(createdAt)) || !Number.isFinite(Date.parse(updatedAt))) return null;
  if (!raw.scope || typeof raw.scope !== "object" || Array.isArray(raw.scope)) return null;
  const scope = raw.scope as Record<string, unknown>;
  if (!["working", "staged", "base", "commit", "branch", "pull-request"].includes(scope.mode as string)) return null;
  const base = scope.base === null ? null : safeString(scope.base, 1_024);
  if (scope.base !== null && !base) return null;
  const branch = scope.branch === undefined || scope.branch === null ? null : safeString(scope.branch, 1_024);
  if (scope.branch !== undefined && scope.branch !== null && !branch) return null;
  const head = scope.head === undefined || scope.head === null ? null : safeString(scope.head, 1_024);
  if (scope.head !== undefined && scope.head !== null && !head) return null;

  const snapshot = parseSnapshot(raw.snapshot);
  const reportValidation = raw.report === undefined ? null : validateReport(raw.report);
  const report = reportValidation?.valid ? raw.report as ReviewReport : undefined;
  if (raw.state === "complete" && !report) return null;
  const error = raw.error === undefined ? undefined : safeString(raw.error, 2_000) ?? undefined;
  const findingStates: Record<string, "open" | "resolved" | "false-positive"> = {};
  if (raw.findingStates && typeof raw.findingStates === "object" && !Array.isArray(raw.findingStates)) {
    for (const [id, state] of Object.entries(raw.findingStates as Record<string, unknown>)) {
      if (/^ACR-[A-Za-z0-9._-]+$/.test(id) && (state === "open" || state === "resolved" || state === "false-positive")) findingStates[id] = state;
    }
  }
  return {
    id: raw.id,
    state: raw.state,
    host: raw.host,
    createdAt,
    updatedAt,
    scope: { mode: scope.mode as SnapshotMode, base, head, branch },
    ...(snapshot ? { snapshot } : {}),
    ...(report ? { report } : {}),
    ...(error ? { error } : {}),
    ...(Object.keys(findingStates).length ? { findingStates } : {}),
  };
}

function readRecords(path: string): HistoryRecord[] {
  try {
    if (!existsSync(path) || statSync(path).size > MAX_HISTORY_BYTES) return [];
    const value = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    if (value.schemaVersion !== 1 || !Array.isArray(value.records)) return [];
    return value.records.map(parseRecord).filter((record): record is HistoryRecord => record !== null).slice(0, MAX_HISTORY_RECORDS);
  } catch {
    return [];
  }
}

function writeRecords(path: string, records: HistoryRecord[]): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify({ schemaVersion: 1, records })}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function fitWithinHistoryLimit(records: HistoryRecord[]): HistoryRecord[] {
  const bounded = records.slice(0, MAX_HISTORY_RECORDS);
  if (Buffer.byteLength(JSON.stringify({ schemaVersion: 1, records: bounded }), "utf8") <= MAX_HISTORY_BYTES) return bounded;
  let low = 1;
  let high = bounded.length - 1;
  let accepted = 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const size = Buffer.byteLength(JSON.stringify({ schemaVersion: 1, records: bounded.slice(0, middle) }), "utf8");
    if (size <= MAX_HISTORY_BYTES) {
      accepted = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return bounded.slice(0, accepted);
}

export function createReviewHistoryStore(repositoryRoot: string, directory = defaultHistoryDirectory()): ReviewHistoryStore {
  const path = join(directory, `${repositoryKey(repositoryRoot)}.json`);
  let records = readRecords(path);
  const persist = () => {
    records = fitWithinHistoryLimit(records);
    writeRecords(path, records);
  };
  return {
    path,
    list: () => records.map((record) => ({
      id: record.id,
      state: record.state,
      host: record.host,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      scope: record.scope,
      files: record.snapshot?.files ?? 0,
      findings: record.report?.findings.length ?? 0,
      summary: record.report?.summary ?? null,
    })),
    get: (id) => records.find((record) => record.id === id) ?? null,
    save: (record) => {
      const safe = parseRecord(record);
      if (!safe) throw new Error("Refusing to persist an invalid review history record.");
      records = [safe, ...records.filter((item) => item.id !== safe.id)]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, MAX_HISTORY_RECORDS);
      persist();
    },
    delete: (id) => {
      const next = records.filter((record) => record.id !== id);
      if (next.length === records.length) return false;
      records = next;
      persist();
      return true;
    },
    clear: () => {
      records = [];
      persist();
    },
    setFindingState: (id, findingId, state) => {
      const index = records.findIndex((record) => record.id === id);
      if (index < 0 || !records[index].report?.findings.some((finding) => finding.id === findingId)) return null;
      const record = records[index];
      // Finding triage is metadata on an existing review. Keep the review's
      // completion timestamp stable so activity charts and ordering remain true.
      const updated = parseRecord({ ...record, findingStates: { ...(record.findingStates ?? {}), [findingId]: state } });
      if (!updated) return null;
      records[index] = updated;
      persist();
      return updated;
    },
  };
}
