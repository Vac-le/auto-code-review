import type { ReviewReport, ReviewSnapshot } from "./types.ts";
export type ReviewHost = "codex" | "claude";
export interface HostAvailability {
    host: ReviewHost;
    available: boolean;
    version: string | null;
}
export interface HostCommand {
    command: string;
    prefix: string[];
}
export declare function safeHostFailureDetail(value: string): string;
export declare function safeHostPathDirectories(pathValue: string, excludedRoots?: string[]): string[];
export declare function commandFromNpmWrapper(path: string, pathValue?: string, excludedRoots?: string[]): HostCommand | null;
export declare function detectReviewHosts(excludedRoots?: string[]): HostAvailability[];
export declare function canonicalizeHostReport(report: ReviewReport): ReviewReport;
export declare function runHostReview(input: {
    host: ReviewHost;
    repositoryRoot: string;
    snapshot: ReviewSnapshot;
    schemaPath: string;
    signal?: AbortSignal;
}): Promise<ReviewReport>;
//# sourceMappingURL=host-review.d.ts.map