export interface ToolDiagnostic {
    name: "git" | "codex" | "claude";
    available: boolean;
    executable: string | null;
    version: string | null;
    detail: string | null;
}
export interface DoctorReport {
    schemaVersion: "1.0";
    ok: boolean;
    platform: NodeJS.Platform;
    node: {
        version: string;
        supported: boolean;
    };
    repository: {
        ok: boolean;
        root: string | null;
        detail: string | null;
    };
    tools: ToolDiagnostic[];
    recommendations: string[];
}
export declare function findExecutable(name: string, options?: {
    path?: string;
    pathExt?: string;
    platform?: NodeJS.Platform;
}): string | null;
export declare function probeTool(name: ToolDiagnostic["name"], executable?: string | null): ToolDiagnostic;
export declare function runDoctor(cwd: string): DoctorReport;
//# sourceMappingURL=doctor.d.ts.map