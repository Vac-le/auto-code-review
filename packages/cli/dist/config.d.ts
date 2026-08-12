import type { SnapshotMode } from "./types.ts";
export interface ProjectConfig {
    defaultHost?: "codex" | "claude";
    defaultScope?: SnapshotMode;
    baseRevision?: string;
    minimumConfidence?: number;
    maxFindings?: number;
    ignorePaths: string[];
    instructions?: string;
}
export declare function loadProjectConfig(repositoryRoot: string): {
    config: ProjectConfig;
    path: string;
    exists: boolean;
};
export declare function pathIgnoredByConfig(path: string, ignorePaths: string[]): boolean;
//# sourceMappingURL=config.d.ts.map