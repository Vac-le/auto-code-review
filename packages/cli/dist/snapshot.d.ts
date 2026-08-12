import type { DiffHunk, ReviewSnapshot, SnapshotFile, SnapshotMode } from "./types.ts";
export interface SnapshotOptions {
    cwd: string;
    mode?: SnapshotMode;
    base?: string;
    head?: string;
    ignorePaths?: string[];
    contextLines?: number;
    maxContextLines?: number;
    maxFiles?: number;
    maxFileBytes?: number;
    maxPatchBytes?: number;
    maxTotalBytes?: number;
}
interface ChangedPath {
    path: string;
    oldPath?: string;
    status: SnapshotFile["status"];
    untracked?: boolean;
}
export declare function parseNameStatus(output: Buffer | string): ChangedPath[];
export declare function parseHunks(patch: string): DiffHunk[];
export declare function createSnapshot(input: SnapshotOptions): ReviewSnapshot;
export {};
//# sourceMappingURL=snapshot.d.ts.map