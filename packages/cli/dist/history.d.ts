import type { ReviewReport, SnapshotMode } from "./types.ts";
export type TerminalReviewState = "complete" | "failed" | "cancelled";
export interface HistorySnapshot {
    files: number;
    additions: number;
    deletions: number;
    omitted: number;
    redactions: number;
    truncated: boolean;
    filesList: Array<{
        path: string;
        status: string;
        additions: number;
        deletions: number;
    }>;
}
export interface HistoryRecord {
    id: string;
    state: TerminalReviewState;
    host: "codex" | "claude";
    createdAt: string;
    updatedAt: string;
    scope: {
        mode: SnapshotMode;
        base: string | null;
        branch: string | null;
    };
    snapshot?: HistorySnapshot;
    report?: ReviewReport;
    error?: string;
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
}
export declare function defaultHistoryDirectory(): string;
export declare function createReviewHistoryStore(repositoryRoot: string, directory?: string): ReviewHistoryStore;
//# sourceMappingURL=history.d.ts.map