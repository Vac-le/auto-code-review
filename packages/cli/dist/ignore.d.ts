import type { OmissionReason } from "./types.ts";
export declare function classifyIgnoredPath(path: string): OmissionReason | null;
export declare function looksGenerated(content: Buffer | string): boolean;
export declare function isBinary(content: Buffer): boolean;
export declare function detectLanguage(path: string): string;
//# sourceMappingURL=ignore.d.ts.map