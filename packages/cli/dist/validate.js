import { isAbsolute } from "node:path";
import { redactSecrets } from "./redact.js";
import { CATEGORIES, PRIORITIES, SCOPE_KINDS } from "./types.js";
const ROOT_KEYS = new Set(["schemaVersion", "scope", "summary", "findings"]);
const FINDING_KEYS = new Set([
    "id",
    "priority",
    "confidence",
    "category",
    "file",
    "startLine",
    "endLine",
    "side",
    "title",
    "evidence",
    "failureScenario",
    "suggestedFix",
    "fingerprint",
]);
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizePath(value) {
    if (!value || value.includes("\0") || value.includes("\\") || /[\u0000-\u001f\u007f-\u009f]/.test(value))
        return null;
    const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
    if (isAbsolute(value) || /^[A-Za-z]:\//.test(normalized) || normalized.startsWith("//"))
        return null;
    const segments = normalized.split("/");
    if (segments.some((segment) => segment === "" || segment === "." || segment === ".."))
        return null;
    return normalized;
}
function rangeContains(hunks, side, line) {
    return hunks.some((hunk) => {
        const range = side === "new" ? hunk.newRange : hunk.oldRange;
        return Boolean(range && line >= range.start && line <= range.end);
    });
}
function contextContains(file, side, line) {
    const contextSide = file.status === "deleted" ? "old" : "new";
    if (side !== contextSide)
        return false;
    return file.context.some((block) => line >= block.start && line <= block.end);
}
function titleTokens(title) {
    const normalized = title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const stopWords = new Set(["a", "an", "the", "is", "of", "to", "in", "for", "with", "and"]);
    return new Set(normalized.split(/\s+/).filter((token) => token.length > 1 && !stopWords.has(token)));
}
function similarity(left, right) {
    const a = titleTokens(left);
    const b = titleTokens(right);
    if (a.size === 0 || b.size === 0)
        return left.trim().toLowerCase() === right.trim().toLowerCase() ? 1 : 0;
    let intersection = 0;
    for (const token of a)
        if (b.has(token))
            intersection += 1;
    return intersection / (a.size + b.size - intersection);
}
function snapshotError(issues, path, message) {
    issues.push({ level: "error", code: "INVALID_SNAPSHOT", path, message });
}
function isNonNegativeInteger(value) {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function isValidSnapshotRange(value, start, lines) {
    if (lines === 0)
        return value === null;
    return isRecord(value)
        && isNonNegativeInteger(value.start)
        && value.start >= 1
        && isNonNegativeInteger(value.end)
        && value.start === start
        && value.end === start + lines - 1;
}
function snapshotHunksFromPatch(patch) {
    const hunks = [];
    for (const match of patch.matchAll(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/gm)) {
        hunks.push({
            oldStart: Number.parseInt(match[1], 10),
            oldLines: Number.parseInt(match[2] ?? "1", 10),
            newStart: Number.parseInt(match[3], 10),
            newLines: Number.parseInt(match[4] ?? "1", 10),
        });
    }
    return hunks;
}
function sameHunkCoordinates(left, right) {
    return left.oldStart === right.oldStart && left.oldLines === right.oldLines
        && left.newStart === right.newStart && left.newLines === right.newLines;
}
function contextTextMatchesRange(text, start, end) {
    const lines = text === "" ? [] : text.split("\n");
    if (lines.length !== end - start + 1)
        return false;
    return lines.every((line, index) => line.startsWith(`${start + index}: `));
}
function mergeSnapshotRanges(ranges) {
    const sorted = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
    const merged = [];
    for (const range of sorted) {
        const previous = merged.at(-1);
        if (previous && range.start <= previous.end + 1)
            previous.end = Math.max(previous.end, range.end);
        else
            merged.push({ ...range });
    }
    return merged;
}
function validateSnapshot(input, issues) {
    if (!isRecord(input) || input.schemaVersion !== "1.0" || !Array.isArray(input.files)) {
        snapshotError(issues, "$snapshot", "Snapshot must be a version 1.0 snapshot with a files array.");
        return null;
    }
    let valid = true;
    const paths = new Set();
    const rootKeys = new Set(["schemaVersion", "repository", "limits", "summary", "files", "omitted"]);
    for (const key of Object.keys(input)) {
        if (!rootKeys.has(key)) {
            snapshotError(issues, `$snapshot.${key}`, `Unknown snapshot property '${key}'.`);
            valid = false;
        }
    }
    if (!isRecord(input.repository)
        || input.repository.root !== "."
        || !["working", "staged", "base", "commit", "branch", "pull-request"].includes(String(input.repository.mode))) {
        snapshotError(issues, "$snapshot.repository", "Snapshot repository metadata is missing or invalid.");
        valid = false;
    }
    else {
        const repositoryKeys = new Set(["root", "head", "branch", "mode", "base"]);
        if (Object.keys(input.repository).some((key) => !repositoryKeys.has(key))) {
            snapshotError(issues, "$snapshot.repository", "Snapshot repository metadata contains unknown properties.");
            valid = false;
        }
        for (const key of ["head", "branch", "base"]) {
            if (input.repository[key] !== null && typeof input.repository[key] !== "string") {
                snapshotError(issues, `$snapshot.repository.${key}`, `${key} must be a string or null.`);
                valid = false;
            }
        }
    }
    if (!isRecord(input.limits) || !isRecord(input.summary) || !Array.isArray(input.omitted)) {
        snapshotError(issues, "$snapshot", "Snapshot limits, summary, and omitted metadata are required.");
        valid = false;
    }
    let contextLines = null;
    let maxContextLines = null;
    if (isRecord(input.limits)) {
        const limitRules = [
            ["contextLines", 0, 1_000], ["maxContextLines", 1, 5_000], ["maxFiles", 1, 1_000],
            ["maxFileBytes", 1_024, 16 * 1_024 * 1_024], ["maxPatchBytes", 1_024, 4 * 1_024 * 1_024],
            ["maxTotalBytes", 4_096, 64 * 1_024 * 1_024],
        ];
        const allowed = new Set(limitRules.map(([key]) => key));
        if (Object.keys(input.limits).some((key) => !allowed.has(key))) {
            snapshotError(issues, "$snapshot.limits", "Snapshot limits contain unknown properties.");
            valid = false;
        }
        for (const [key, minimum, maximum] of limitRules) {
            const value = input.limits[key];
            if (!isNonNegativeInteger(value) || value < minimum || value > maximum) {
                snapshotError(issues, `$snapshot.limits.${key}`, `${key} is outside the supported range.`);
                valid = false;
            }
        }
        if (isNonNegativeInteger(input.limits.contextLines))
            contextLines = input.limits.contextLines;
        if (isNonNegativeInteger(input.limits.maxContextLines))
            maxContextLines = input.limits.maxContextLines;
    }
    for (let index = 0; index < input.files.length; index += 1) {
        const file = input.files[index];
        const prefix = `$snapshot.files[${index}]`;
        if (!isRecord(file)) {
            snapshotError(issues, prefix, "Snapshot file entries must be objects.");
            valid = false;
            continue;
        }
        const normalized = typeof file.path === "string" ? normalizePath(file.path) : null;
        if (!normalized || normalized !== file.path) {
            snapshotError(issues, `${prefix}.path`, "Snapshot paths must be normalized repository-relative paths.");
            valid = false;
        }
        else if (paths.has(normalized)) {
            snapshotError(issues, `${prefix}.path`, "Snapshot paths must be unique.");
            valid = false;
        }
        else
            paths.add(normalized);
        if (file.oldPath !== undefined && (typeof file.oldPath !== "string" || normalizePath(file.oldPath) !== file.oldPath)) {
            snapshotError(issues, `${prefix}.oldPath`, "oldPath must be a normalized repository-relative path.");
            valid = false;
        }
        if (!["added", "modified", "deleted", "renamed", "copied", "type-changed", "unmerged"].includes(String(file.status))
            || typeof file.language !== "string"
            || !isNonNegativeInteger(file.additions)
            || !isNonNegativeInteger(file.deletions)
            || !isNonNegativeInteger(file.redactions)
            || typeof file.truncated !== "boolean") {
            snapshotError(issues, prefix, "Snapshot file status and counters are invalid.");
            valid = false;
        }
        const validHunks = [];
        if (!Array.isArray(file.hunks)) {
            snapshotError(issues, `${prefix}.hunks`, "hunks must be an array.");
            valid = false;
        }
        else {
            file.hunks.forEach((hunk, hunkIndex) => {
                const hunkPath = `${prefix}.hunks[${hunkIndex}]`;
                if (!isRecord(hunk)
                    || !isNonNegativeInteger(hunk.oldStart)
                    || !isNonNegativeInteger(hunk.oldLines)
                    || !isNonNegativeInteger(hunk.newStart)
                    || !isNonNegativeInteger(hunk.newLines)) {
                    snapshotError(issues, hunkPath, "Hunk coordinates must be non-negative integers.");
                    valid = false;
                    return;
                }
                if (!isValidSnapshotRange(hunk.oldRange, hunk.oldStart, hunk.oldLines)) {
                    snapshotError(issues, `${hunkPath}.oldRange`, "oldRange must exactly match the old hunk coordinates.");
                    valid = false;
                }
                if (!isValidSnapshotRange(hunk.newRange, hunk.newStart, hunk.newLines)) {
                    snapshotError(issues, `${hunkPath}.newRange`, "newRange must exactly match the new hunk coordinates.");
                    valid = false;
                }
                if (isValidSnapshotRange(hunk.oldRange, hunk.oldStart, hunk.oldLines)
                    && isValidSnapshotRange(hunk.newRange, hunk.newStart, hunk.newLines)) {
                    validHunks.push(hunk);
                }
            });
        }
        const contextSide = file.status === "deleted" ? "old" : "new";
        const expandedRanges = mergeSnapshotRanges(contextLines === null ? [] : validHunks.flatMap((hunk) => {
            const range = contextSide === "old" ? hunk.oldRange : hunk.newRange;
            return range ? [{ start: Math.max(1, range.start - contextLines), end: range.end + contextLines }] : [];
        }));
        let totalContextLines = 0;
        if (!Array.isArray(file.context)) {
            snapshotError(issues, `${prefix}.context`, "context must be an array.");
            valid = false;
        }
        else {
            file.context.forEach((block, blockIndex) => {
                const blockPath = `${prefix}.context[${blockIndex}]`;
                if (!isRecord(block)
                    || !isNonNegativeInteger(block.start)
                    || block.start < 1
                    || !isNonNegativeInteger(block.end)
                    || block.end < block.start
                    || typeof block.text !== "string"
                    || (block.source !== "worktree" && block.source !== "index" && block.source !== "base")) {
                    snapshotError(issues, blockPath, "Context blocks require valid source, line range, and text.");
                    valid = false;
                    return;
                }
                const blockStart = block.start;
                const blockEnd = block.end;
                const blockText = block.text;
                totalContextLines += blockEnd - blockStart + 1;
                if (!contextTextMatchesRange(blockText, blockStart, blockEnd)) {
                    snapshotError(issues, `${blockPath}.text`, "Context text must contain exactly one correctly numbered line per declared line.");
                    valid = false;
                }
                if (!expandedRanges.some((range) => blockStart >= range.start && blockEnd <= range.end)) {
                    snapshotError(issues, blockPath, "Context must be bounded around an authentic changed hunk.");
                    valid = false;
                }
            });
            if (maxContextLines !== null && totalContextLines > maxContextLines) {
                snapshotError(issues, `${prefix}.context`, "Context exceeds the snapshot maxContextLines limit.");
                valid = false;
            }
        }
        if (typeof file.patch !== "string") {
            snapshotError(issues, `${prefix}.patch`, "patch must be a string.");
            valid = false;
        }
        else if (validHunks.length > 0) {
            const patchHunks = snapshotHunksFromPatch(file.patch);
            if (patchHunks.length !== validHunks.length || !validHunks.every((hunk, index) => sameHunkCoordinates(hunk, patchHunks[index]))) {
                snapshotError(issues, `${prefix}.hunks`, "Hunk metadata must exactly match the patch headers retained in the snapshot.");
                valid = false;
            }
        }
    }
    return valid ? input : null;
}
function addTypeIssue(issues, path, expected) {
    issues.push({ level: "error", code: "SCHEMA_TYPE", path, message: `Expected ${expected}.` });
}
function validateText(value, path, minimum, maximum, issues) {
    if (typeof value !== "string") {
        addTypeIssue(issues, path, "a string");
        return false;
    }
    const length = value.trim().length;
    if (length < minimum || length > maximum) {
        issues.push({ level: "error", code: "SCHEMA_LENGTH", path, message: `Text length must be between ${minimum} and ${maximum} characters.` });
        return false;
    }
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value)) {
        issues.push({ level: "error", code: "UNSAFE_CONTROL_CHARACTER", path, message: "Text contains a terminal or control character that is unsafe to render." });
        return false;
    }
    return true;
}
function validateNoSecrets(value, path, issues) {
    if (redactSecrets(value).count === 0)
        return true;
    issues.push({ level: "error", code: "SECRET_IN_REPORT", path, message: "Text appears to contain a secret; replace it with [REDACTED]." });
    return false;
}
function findSnapshotFile(snapshot, path, side) {
    return snapshot.files.find((file) => file.path === path || (side === "old" && file.oldPath === path)) ?? null;
}
export function validateReport(input, snapshotInput, options = {}) {
    const errors = [];
    const warnings = [];
    const allIssues = [];
    const minimumConfidence = options.minimumConfidence ?? 0.8;
    if (!Number.isFinite(minimumConfidence) || minimumConfidence < 0.8 || minimumConfidence > 1) {
        errors.push({ level: "error", code: "INVALID_OPTION", path: "$options.minimumConfidence", message: "Minimum confidence must be between 0.8 and 1." });
    }
    const snapshot = snapshotInput === undefined ? null : validateSnapshot(snapshotInput, allIssues);
    let findingCount = 0;
    const candidates = [];
    if (!isRecord(input)) {
        allIssues.push({ level: "error", code: "SCHEMA_TYPE", path: "$", message: "Review report must be a JSON object." });
    }
    else {
        for (const key of Object.keys(input)) {
            if (!ROOT_KEYS.has(key))
                allIssues.push({ level: "error", code: "SCHEMA_UNKNOWN_PROPERTY", path: `$.${key}`, message: `Unknown report property '${key}'.` });
        }
        if (input.schemaVersion !== "1.0") {
            allIssues.push({ level: "error", code: "SCHEMA_VERSION", path: "$.schemaVersion", message: "schemaVersion must equal '1.0'." });
        }
        if (!isRecord(input.scope)) {
            addTypeIssue(allIssues, "$.scope", "an object");
        }
        else {
            const scopeKeys = new Set(["kind", "base", "head"]);
            for (const key of Object.keys(input.scope)) {
                if (!scopeKeys.has(key))
                    allIssues.push({ level: "error", code: "SCHEMA_UNKNOWN_PROPERTY", path: `$.scope.${key}`, message: `Unknown scope property '${key}'.` });
            }
            const scopeKindValid = typeof input.scope.kind === "string" && SCOPE_KINDS.includes(input.scope.kind);
            if (!scopeKindValid) {
                allIssues.push({ level: "error", code: "SCHEMA_ENUM", path: "$.scope.kind", message: `scope.kind must be one of: ${SCOPE_KINDS.join(", ")}.` });
            }
            for (const key of ["base", "head"]) {
                const value = input.scope[key];
                if (value !== null && (typeof value !== "string" || value.trim().length === 0 || value.length > 1024 || /[\u0000-\u001f\u007f-\u009f]/.test(value))) {
                    allIssues.push({ level: "error", code: "SCHEMA_TYPE", path: `$.scope.${key}`, message: `${key} must be null or a non-empty single-line string.` });
                }
            }
            if (scopeKindValid && snapshot) {
                const expectedMode = input.scope.kind === "staged" ? "staged"
                    : input.scope.kind === "working-tree" || input.scope.kind === "path" ? "working"
                        : input.scope.kind;
                if (expectedMode && snapshot.repository.mode !== expectedMode) {
                    allIssues.push({ level: "error", code: "SCOPE_MISMATCH", path: "$.scope.kind", message: `Report scope '${input.scope.kind}' does not match snapshot mode '${snapshot.repository.mode}'.` });
                }
            }
        }
        const summaryValue = input.summary;
        const summaryValid = validateText(summaryValue, "$.summary", 1, 2000, allIssues);
        if (summaryValid)
            validateNoSecrets(summaryValue, "$.summary", allIssues);
        if (!Array.isArray(input.findings)) {
            addTypeIssue(allIssues, "$.findings", "an array");
        }
        else {
            findingCount = input.findings.length;
            if (findingCount > 10) {
                allIssues.push({ level: "error", code: "SCHEMA_MAX_ITEMS", path: "$.findings", message: "A report may contain at most 10 findings." });
            }
            input.findings.forEach((raw, index) => {
                const prefix = `$.findings[${index}]`;
                if (!isRecord(raw)) {
                    addTypeIssue(allIssues, prefix, "an object");
                    return;
                }
                for (const key of Object.keys(raw)) {
                    if (!FINDING_KEYS.has(key))
                        allIssues.push({ level: "error", code: "SCHEMA_UNKNOWN_PROPERTY", path: `${prefix}.${key}`, message: `Unknown finding property '${key}'.` });
                }
                const idValid = raw.id === undefined || (validateText(raw.id, `${prefix}.id`, 1, 64, allIssues) && /^ACR-[A-Z0-9][A-Z0-9._-]*$/i.test(raw.id));
                if (typeof raw.id === "string" && !/^ACR-[A-Z0-9][A-Z0-9._-]*$/i.test(raw.id)) {
                    allIssues.push({ level: "error", code: "INVALID_FINDING_ID", path: `${prefix}.id`, message: "id must start with 'ACR-' and contain only stable identifier characters." });
                }
                const priorityValid = typeof raw.priority === "string" && PRIORITIES.includes(raw.priority);
                if (!priorityValid)
                    allIssues.push({ level: "error", code: "SCHEMA_ENUM", path: `${prefix}.priority`, message: `priority must be one of: ${PRIORITIES.join(", ")}.` });
                const categoryValid = typeof raw.category === "string" && CATEGORIES.includes(raw.category);
                if (!categoryValid)
                    allIssues.push({ level: "error", code: "SCHEMA_ENUM", path: `${prefix}.category`, message: `category must be one of: ${CATEGORIES.join(", ")}.` });
                const confidence = raw.confidence;
                const confidenceValid = typeof confidence === "number" && Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
                if (!confidenceValid)
                    allIssues.push({ level: "error", code: "SCHEMA_RANGE", path: `${prefix}.confidence`, message: "confidence must be a finite number between 0 and 1." });
                else if (confidence < minimumConfidence)
                    allIssues.push({ level: "error", code: "LOW_CONFIDENCE", path: `${prefix}.confidence`, message: `Confidence ${confidence} is below the ${minimumConfidence} quality threshold.` });
                const fileValue = raw.file;
                const fileValid = validateText(fileValue, `${prefix}.file`, 1, 1024, allIssues);
                const candidatePath = fileValid ? normalizePath(fileValue) : null;
                const normalizedPath = candidatePath === fileValue ? candidatePath : null;
                if (fileValid && !normalizedPath)
                    allIssues.push({ level: "error", code: "UNSAFE_PATH", path: `${prefix}.file`, message: "file must be a normalized, '/'-separated repository-relative path without traversal." });
                const lineValue = raw.startLine;
                const lineValid = typeof lineValue === "number" && Number.isSafeInteger(lineValue) && lineValue >= 1;
                if (!lineValid)
                    allIssues.push({ level: "error", code: "SCHEMA_RANGE", path: `${prefix}.startLine`, message: "startLine must be a positive integer." });
                const endLineValid = typeof raw.endLine === "number" && Number.isSafeInteger(raw.endLine) && raw.endLine >= 1;
                if (!endLineValid)
                    allIssues.push({ level: "error", code: "SCHEMA_RANGE", path: `${prefix}.endLine`, message: "endLine must be a positive integer." });
                else if (lineValid && typeof raw.endLine === "number" && raw.endLine < lineValue)
                    allIssues.push({ level: "error", code: "INVALID_LINE_RANGE", path: `${prefix}.endLine`, message: "endLine cannot be before line." });
                const sideValid = raw.side === undefined || raw.side === "new" || raw.side === "old";
                if (!sideValid)
                    allIssues.push({ level: "error", code: "SCHEMA_ENUM", path: `${prefix}.side`, message: "side must be 'new' or 'old'." });
                const titleValue = raw.title;
                const titleTextValid = validateText(titleValue, `${prefix}.title`, 4, 100, allIssues);
                const titleValid = titleTextValid && validateNoSecrets(titleValue, `${prefix}.title`, allIssues);
                if (titleValid && /[\r\n]/.test(titleValue))
                    allIssues.push({ level: "error", code: "INVALID_TITLE", path: `${prefix}.title`, message: "title must be a single line." });
                const evidenceValue = raw.evidence;
                const evidenceTextValid = validateText(evidenceValue, `${prefix}.evidence`, 12, 4000, allIssues);
                const evidenceValid = evidenceTextValid && validateNoSecrets(evidenceValue, `${prefix}.evidence`, allIssues);
                if (evidenceValid) {
                    if (/^(?:(?:possible|potential|maybe|might|could be|可能|也许|疑似)\s*)?(?:bug|issue|problem|问题|错误)[.!。！]?$/i.test(evidenceValue.trim())) {
                        allIssues.push({ level: "error", code: "VAGUE_EVIDENCE", path: `${prefix}.evidence`, message: "Evidence must identify a concrete code fact, not a generic possibility." });
                    }
                }
                const scenarioValue = raw.failureScenario;
                const scenarioTextValid = validateText(scenarioValue, `${prefix}.failureScenario`, 12, 4000, allIssues);
                const scenarioValid = scenarioTextValid && validateNoSecrets(scenarioValue, `${prefix}.failureScenario`, allIssues);
                const fixValue = raw.suggestedFix;
                const fixValid = fixValue === undefined || (validateText(fixValue, `${prefix}.suggestedFix`, 4, 4000, allIssues)
                    && validateNoSecrets(fixValue, `${prefix}.suggestedFix`, allIssues));
                const fingerprintValid = raw.fingerprint === undefined || (validateText(raw.fingerprint, `${prefix}.fingerprint`, 6, 128, allIssues)
                    && /^[A-Za-z0-9][A-Za-z0-9._:-]+$/.test(raw.fingerprint));
                if (typeof raw.fingerprint === "string" && !/^[A-Za-z0-9][A-Za-z0-9._:-]+$/.test(raw.fingerprint)) {
                    allIssues.push({ level: "error", code: "INVALID_FINGERPRINT", path: `${prefix}.fingerprint`, message: "fingerprint contains unsupported characters." });
                }
                let resolvedSide = (raw.side ?? "new");
                if (snapshot && normalizedPath && lineValid && endLineValid && sideValid) {
                    let file = findSnapshotFile(snapshot, normalizedPath, resolvedSide);
                    if (raw.side === undefined && file?.status === "deleted")
                        resolvedSide = "old";
                    file = findSnapshotFile(snapshot, normalizedPath, resolvedSide);
                    if (!file) {
                        allIssues.push({ level: "error", code: "UNKNOWN_FILE", path: `${prefix}.file`, message: "file is not present in the supplied review snapshot." });
                    }
                    else {
                        const startChanged = rangeContains(file.hunks, resolvedSide, lineValue);
                        const startInContext = contextContains(file, resolvedSide, lineValue);
                        if (!startChanged && !startInContext) {
                            allIssues.push({ level: "error", code: "LINE_OUTSIDE_SNAPSHOT", path: `${prefix}.startLine`, message: `Line ${lineValue} is neither changed nor present in bounded snapshot context.` });
                        }
                        else if (!startChanged) {
                            warnings.push({ level: "warning", code: "UNCHANGED_ANCHOR", path: `${prefix}.startLine`, message: "The finding is anchored to unchanged context; evidence must show that the change makes this failure newly reachable." });
                        }
                        if (typeof raw.endLine === "number") {
                            const endChanged = rangeContains(file.hunks, resolvedSide, raw.endLine);
                            const endInContext = contextContains(file, resolvedSide, raw.endLine);
                            if (!endChanged && !endInContext) {
                                allIssues.push({ level: "error", code: "END_LINE_OUTSIDE_SNAPSHOT", path: `${prefix}.endLine`, message: `Line ${raw.endLine} is neither changed nor present in bounded snapshot context.` });
                            }
                            else if (!endChanged && raw.endLine !== lineValue) {
                                warnings.push({ level: "warning", code: "UNCHANGED_END_ANCHOR", path: `${prefix}.endLine`, message: "The finding range ends on unchanged context." });
                            }
                        }
                        // A changed anchor is already present in the bounded patch. The
                        // optional full-file context block may be truncated independently,
                        // which must not invalidate evidence that remains visible in the
                        // patch itself.
                    }
                }
                if (idValid && priorityValid && categoryValid && confidenceValid && normalizedPath && lineValid && endLineValid && sideValid
                    && titleValid && evidenceValid && scenarioValid && fixValid && fingerprintValid) {
                    candidates.push({ index, finding: raw, normalizedPath, side: resolvedSide });
                }
            });
        }
    }
    const fingerprints = new Map();
    const findingIds = new Map();
    for (const candidate of candidates) {
        if (candidate.finding.id) {
            const id = candidate.finding.id.toLowerCase();
            const previousId = findingIds.get(id);
            if (previousId !== undefined) {
                allIssues.push({ level: "error", code: "DUPLICATE_FINDING_ID", path: `$.findings[${candidate.index}].id`, message: `Finding id duplicates findings[${previousId}].id.` });
            }
            else
                findingIds.set(id, candidate.index);
        }
        const explicit = candidate.finding.fingerprint?.toLowerCase();
        const computed = [
            candidate.normalizedPath.toLowerCase(),
            candidate.side,
            candidate.finding.startLine,
            candidate.finding.endLine,
            candidate.finding.category,
            candidate.finding.title.normalize("NFKC").trim().toLowerCase(),
        ].join("|");
        for (const key of [explicit, computed].filter((value) => Boolean(value))) {
            const previous = fingerprints.get(key);
            if (previous !== undefined) {
                allIssues.push({ level: "error", code: "DUPLICATE_FINDING", path: `$.findings[${candidate.index}]`, message: `Finding duplicates findings[${previous}].` });
            }
            else
                fingerprints.set(key, candidate.index);
        }
    }
    for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
        const left = candidates[leftIndex];
        for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
            const right = candidates[rightIndex];
            if (left.normalizedPath !== right.normalizedPath || left.side !== right.side || left.finding.category !== right.finding.category)
                continue;
            const leftEnd = left.finding.endLine;
            const rightEnd = right.finding.endLine;
            const overlaps = left.finding.startLine <= rightEnd && right.finding.startLine <= leftEnd;
            const near = Math.abs(left.finding.startLine - right.finding.startLine) <= 3;
            if ((overlaps || near) && similarity(left.finding.title, right.finding.title) >= 0.72) {
                const alreadyExact = allIssues.some((issue) => issue.code === "DUPLICATE_FINDING" && issue.path === `$.findings[${right.index}]`);
                if (!alreadyExact)
                    allIssues.push({ level: "error", code: "OVERLAPPING_FINDING", path: `$.findings[${right.index}]`, message: `Finding substantially overlaps findings[${left.index}].` });
            }
        }
    }
    for (const issue of allIssues)
        (issue.level === "error" ? errors : warnings).push(issue);
    if (options.strict && warnings.length > 0) {
        errors.push(...warnings.map((issue) => ({ ...issue, level: "error", code: `STRICT_${issue.code}` })));
        warnings.length = 0;
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        stats: { findings: findingCount, errors: errors.length, warnings: warnings.length },
    };
}
//# sourceMappingURL=validate.js.map