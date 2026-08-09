export type SnapshotMode = "working" | "staged" | "base";

export type OmissionReason =
  | "binary"
  | "generated"
  | "lockfile"
  | "sensitive-path"
  | "too-large"
  | "file-limit"
  | "unsafe-path"
  | "unreadable";

export interface LineRange {
  start: number;
  end: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  oldRange: LineRange | null;
  newRange: LineRange | null;
}

export interface ContextBlock {
  source: "worktree" | "index" | "base";
  start: number;
  end: number;
  text: string;
}

export interface SnapshotFile {
  path: string;
  oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed" | "copied" | "type-changed" | "unmerged";
  language: string;
  additions: number;
  deletions: number;
  redactions: number;
  truncated: boolean;
  hunks: DiffHunk[];
  context: ContextBlock[];
  patch: string;
}

export interface OmittedFile {
  path: string;
  reason: OmissionReason;
  detail?: string;
}

export interface ReviewSnapshot {
  schemaVersion: "1.0";
  repository: {
    root: string;
    head: string | null;
    branch: string | null;
    mode: SnapshotMode;
    base: string | null;
  };
  limits: {
    contextLines: number;
    maxContextLines: number;
    maxFiles: number;
    maxFileBytes: number;
    maxPatchBytes: number;
    maxTotalBytes: number;
  };
  summary: {
    files: number;
    additions: number;
    deletions: number;
    omitted: number;
    redactions: number;
    truncated: boolean;
  };
  files: SnapshotFile[];
  omitted: OmittedFile[];
}

export const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CATEGORIES = [
  "correctness",
  "security",
  "data-integrity",
  "concurrency",
  "performance",
  "compatibility",
  "testing",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SCOPE_KINDS = ["working-tree", "staged", "base", "commit", "branch", "path", "pull-request"] as const;
export type ScopeKind = (typeof SCOPE_KINDS)[number];

export interface ReviewScope {
  kind: ScopeKind;
  base: string | null;
  head: string | null;
}

export interface ReviewFinding {
  id?: string;
  priority: Priority;
  confidence: number;
  category: Category;
  file: string;
  startLine: number;
  endLine: number;
  side?: "new" | "old";
  title: string;
  evidence: string;
  failureScenario: string;
  suggestedFix?: string;
  fingerprint?: string;
}

export interface ReviewReport {
  schemaVersion: "1.0";
  scope: ReviewScope;
  summary: string;
  findings: ReviewFinding[];
}

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: {
    findings: number;
    errors: number;
    warnings: number;
  };
}
