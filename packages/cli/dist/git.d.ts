export interface GitResult {
    status: number;
    stdout: Buffer;
    stderr: string;
}
interface GitOptions {
    allowFailure?: boolean;
    maxBuffer?: number;
    timeout?: number;
}
export declare function runGit(cwd: string, args: string[], options?: GitOptions): GitResult;
export declare function gitText(cwd: string, args: string[], options?: GitOptions): string;
export declare function findRepositoryRoot(cwd: string): string;
export declare function resolveGitRevision(cwd: string, revision: string): string | null;
export declare function readGitBlob(cwd: string, object: string, maxBytes: number): Buffer | null;
export {};
//# sourceMappingURL=git.d.ts.map