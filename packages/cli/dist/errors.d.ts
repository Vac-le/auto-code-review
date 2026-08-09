export declare class CliError extends Error {
    readonly exitCode: number;
    readonly code: string;
    constructor(message: string, options?: {
        exitCode?: number;
        code?: string;
        cause?: unknown;
    });
}
export declare function errorMessage(error: unknown): string;
//# sourceMappingURL=errors.d.ts.map