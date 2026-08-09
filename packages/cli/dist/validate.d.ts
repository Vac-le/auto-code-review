import type { ValidationResult } from "./types.ts";
export interface ValidateOptions {
    strict?: boolean;
    minimumConfidence?: number;
}
export declare function validateReport(input: unknown, snapshotInput?: unknown, options?: ValidateOptions): ValidationResult;
//# sourceMappingURL=validate.d.ts.map