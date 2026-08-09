import { spawn } from "node:child_process";
import { type IncomingMessage, type ServerResponse } from "node:http";
import { detectReviewHosts, runHostReview, type ReviewHost } from "./host-review.ts";
export interface DashboardOptions {
    cwd: string;
    port?: number;
    open?: boolean;
    preferredHost?: ReviewHost;
}
export interface DashboardDependencies {
    detectHosts?: typeof detectReviewHosts;
    review?: typeof runHostReview;
}
export declare function resolveBrowserOpener(runtimePlatform?: NodeJS.Platform, pathValue?: string, excludedRoots?: string[]): string | null;
export declare function launchBrowser(url: string, runtimePlatform?: NodeJS.Platform, spawnProcess?: typeof spawn, excludedRoots?: string[], pathValue?: string): boolean;
export declare function createDashboardServer(options: DashboardOptions, dependencies?: DashboardDependencies): {
    server: import("http").Server<typeof IncomingMessage, typeof ServerResponse>;
    token: string;
    repositoryRoot: string;
};
export declare function startDashboard(options: DashboardOptions): void;
//# sourceMappingURL=ui.d.ts.map