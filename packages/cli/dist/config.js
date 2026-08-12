import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { CliError } from "./errors.js";
const FILE_NAME = ".auto-code-review.json";
const MAX_BYTES = 64 * 1024;
const ALLOWED_KEYS = new Set(["defaultHost", "defaultScope", "baseRevision", "minimumConfidence", "maxFindings", "ignorePaths", "instructions"]);
const SCOPES = new Set(["working", "staged", "base", "commit", "branch", "pull-request"]);
function safeSingleLine(value, name, maximum = 1024) {
    if (value === undefined)
        return undefined;
    if (typeof value !== "string" || value.length < 1 || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value) || value.startsWith("-")) {
        throw new CliError(`${name} must be a safe non-empty string.`, { code: "INVALID_CONFIG" });
    }
    return value;
}
function parseConfig(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new CliError(`${FILE_NAME} must contain a JSON object.`, { code: "INVALID_CONFIG" });
    const raw = value;
    for (const key of Object.keys(raw))
        if (!ALLOWED_KEYS.has(key))
            throw new CliError(`Unknown ${FILE_NAME} property '${key}'.`, { code: "INVALID_CONFIG" });
    if (raw.defaultHost !== undefined && raw.defaultHost !== "codex" && raw.defaultHost !== "claude")
        throw new CliError("defaultHost must be codex or claude.", { code: "INVALID_CONFIG" });
    if (raw.defaultScope !== undefined && (typeof raw.defaultScope !== "string" || !SCOPES.has(raw.defaultScope)))
        throw new CliError("defaultScope is not supported.", { code: "INVALID_CONFIG" });
    if (raw.minimumConfidence !== undefined && (typeof raw.minimumConfidence !== "number" || !Number.isFinite(raw.minimumConfidence) || raw.minimumConfidence < 0.8 || raw.minimumConfidence > 1))
        throw new CliError("minimumConfidence must be between 0.8 and 1.", { code: "INVALID_CONFIG" });
    if (raw.maxFindings !== undefined && (typeof raw.maxFindings !== "number" || !Number.isSafeInteger(raw.maxFindings) || raw.maxFindings < 1 || raw.maxFindings > 10))
        throw new CliError("maxFindings must be an integer between 1 and 10.", { code: "INVALID_CONFIG" });
    if (raw.ignorePaths !== undefined && (!Array.isArray(raw.ignorePaths) || raw.ignorePaths.length > 100))
        throw new CliError("ignorePaths must be an array with at most 100 entries.", { code: "INVALID_CONFIG" });
    const ignorePaths = (raw.ignorePaths ?? []).map((entry, index) => {
        const path = safeSingleLine(entry, `ignorePaths[${index}]`, 512);
        const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
        if (!normalized || normalized.startsWith("/") || normalized.split("/").some((segment) => segment === ".."))
            throw new CliError(`ignorePaths[${index}] is unsafe.`, { code: "INVALID_CONFIG" });
        return normalized;
    });
    const instructions = raw.instructions === undefined ? undefined : safeSingleLine(raw.instructions, "instructions", 4_000);
    return {
        ...(raw.defaultHost ? { defaultHost: raw.defaultHost } : {}),
        ...(raw.defaultScope ? { defaultScope: raw.defaultScope } : {}),
        ...(raw.baseRevision ? { baseRevision: safeSingleLine(raw.baseRevision, "baseRevision") } : {}),
        ...(raw.minimumConfidence !== undefined ? { minimumConfidence: raw.minimumConfidence } : {}),
        ...(raw.maxFindings !== undefined ? { maxFindings: raw.maxFindings } : {}),
        ignorePaths,
        ...(instructions ? { instructions } : {}),
    };
}
export function loadProjectConfig(repositoryRoot) {
    const path = join(repositoryRoot, FILE_NAME);
    if (!existsSync(path))
        return { config: { ignorePaths: [] }, path, exists: false };
    try {
        if (statSync(path).size > MAX_BYTES)
            throw new CliError(`${FILE_NAME} exceeds ${MAX_BYTES} bytes.`, { code: "INVALID_CONFIG" });
        return { config: parseConfig(JSON.parse(readFileSync(path, "utf8"))), path, exists: true };
    }
    catch (error) {
        if (error instanceof CliError)
            throw error;
        throw new CliError(`Unable to read ${FILE_NAME}: ${error instanceof Error ? error.message : String(error)}`, { code: "INVALID_CONFIG", cause: error });
    }
}
export function pathIgnoredByConfig(path, ignorePaths) {
    const normalized = path.replaceAll("\\", "/");
    return ignorePaths.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}
//# sourceMappingURL=config.js.map