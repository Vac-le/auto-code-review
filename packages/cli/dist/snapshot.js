import { closeSync, constants, fstatSync, lstatSync, openSync, readSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { CliError } from "./errors.js";
import { findRepositoryRoot, gitText, readGitBlob, resolveGitRevision, runGit } from "./git.js";
import { classifyIgnoredPath, detectLanguage, isBinary, looksGenerated } from "./ignore.js";
import { redactSecrets } from "./redact.js";
const DEFAULTS = {
    contextLines: 8,
    maxContextLines: 400,
    maxFiles: 80,
    maxFileBytes: 512 * 1024,
    maxPatchBytes: 128 * 1024,
    maxTotalBytes: 2 * 1024 * 1024,
};
function boundedInteger(name, value, minimum, maximum) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
        throw new CliError(`${name} must be an integer between ${minimum} and ${maximum}.`, { code: "INVALID_LIMIT" });
    }
    return value;
}
function resolveOptions(options) {
    const mode = options.mode ?? "working";
    if (mode === "base" && !options.base) {
        throw new CliError("snapshot --base requires a Git revision.", { code: "MISSING_BASE" });
    }
    if (mode !== "base" && options.base) {
        throw new CliError("A base revision can only be used in base mode.", { code: "UNEXPECTED_BASE" });
    }
    if (options.base && (options.base.startsWith("-") || options.base.length > 1024 || /[\u0000-\u001f\u007f]/.test(options.base))) {
        throw new CliError("The base revision is not a safe Git revision string.", { code: "INVALID_BASE" });
    }
    return {
        cwd: options.cwd,
        mode,
        base: options.base ?? null,
        contextLines: boundedInteger("contextLines", options.contextLines ?? DEFAULTS.contextLines, 0, 1_000),
        maxContextLines: boundedInteger("maxContextLines", options.maxContextLines ?? DEFAULTS.maxContextLines, 1, 5_000),
        maxFiles: boundedInteger("maxFiles", options.maxFiles ?? DEFAULTS.maxFiles, 1, 1_000),
        maxFileBytes: boundedInteger("maxFileBytes", options.maxFileBytes ?? DEFAULTS.maxFileBytes, 1024, 16 * 1024 * 1024),
        maxPatchBytes: boundedInteger("maxPatchBytes", options.maxPatchBytes ?? DEFAULTS.maxPatchBytes, 1024, 4 * 1024 * 1024),
        maxTotalBytes: boundedInteger("maxTotalBytes", options.maxTotalBytes ?? DEFAULTS.maxTotalBytes, 4096, 64 * 1024 * 1024),
    };
}
function normalizeGitPath(path) {
    return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
function safeWorktreePath(root, gitPath) {
    if (!gitPath || isAbsolute(gitPath) || gitPath.includes("\0"))
        return null;
    const absolute = resolve(root, gitPath);
    const back = relative(root, absolute);
    if (!back || back === ".")
        return null;
    if (back === ".." || back.startsWith(`..\\`) || back.startsWith("../") || isAbsolute(back))
        return null;
    return absolute;
}
function isSafeGitPath(path) {
    if (!path || isAbsolute(path) || path.includes("\0") || /[\u0000-\u001f\u007f]/.test(path))
        return false;
    const normalized = normalizeGitPath(path);
    if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized))
        return false;
    return normalized.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
function mapStatus(raw) {
    switch (raw[0]) {
        case "A": return "added";
        case "M": return "modified";
        case "D": return "deleted";
        case "R": return "renamed";
        case "C": return "copied";
        case "T": return "type-changed";
        default: return "unmerged";
    }
}
export function parseNameStatus(output) {
    const text = Buffer.isBuffer(output) ? output.toString("utf8") : output;
    const tokens = text.split("\0");
    if (tokens.at(-1) === "")
        tokens.pop();
    const entries = [];
    for (let index = 0; index < tokens.length;) {
        let statusToken = tokens[index++] ?? "";
        let inlinePath;
        const tab = statusToken.indexOf("\t");
        if (tab >= 0) {
            inlinePath = statusToken.slice(tab + 1);
            statusToken = statusToken.slice(0, tab);
        }
        if (!/^[A-Z][0-9]*$/.test(statusToken)) {
            throw new CliError("Git produced an unrecognized name-status record.", { code: "INVALID_GIT_OUTPUT" });
        }
        const renamed = statusToken.startsWith("R") || statusToken.startsWith("C");
        const firstPath = normalizeGitPath(inlinePath ?? tokens[index++] ?? "");
        const secondPath = renamed ? normalizeGitPath(tokens[index++] ?? "") : undefined;
        const path = secondPath ?? firstPath;
        if (!path)
            throw new CliError("Git produced a change with an empty path.", { code: "INVALID_GIT_OUTPUT" });
        entries.push({ path, ...(renamed ? { oldPath: firstPath } : {}), status: mapStatus(statusToken) });
    }
    return entries;
}
function resolveScope(root, options, head) {
    if (options.mode === "staged")
        return { args: ["--cached"], baseCommit: head };
    if (options.mode === "base") {
        if (!head)
            throw new CliError("Base comparison requires a repository with at least one commit.", { code: "MISSING_HEAD" });
        const base = resolveGitRevision(root, options.base);
        if (!base)
            throw new CliError(`The base revision '${options.base}' does not resolve to a commit.`, { code: "INVALID_BASE" });
        const mergeBaseResult = runGit(root, ["merge-base", base, head], { allowFailure: true });
        if (mergeBaseResult.status !== 0) {
            throw new CliError(`No merge base exists between '${options.base}' and HEAD.`, { code: "NO_MERGE_BASE" });
        }
        const mergeBase = mergeBaseResult.stdout.toString("utf8").trim();
        return { args: [`${mergeBase}..${head}`], baseCommit: mergeBase };
    }
    return head ? { args: [head], baseCommit: head } : { args: ["--cached"], baseCommit: null };
}
function listChangedPaths(root, options, scope) {
    const output = runGit(root, [
        "diff",
        "--no-ext-diff",
        "--no-color",
        "--find-renames",
        "--name-status",
        "-z",
        ...scope.args,
        "--",
    ]).stdout;
    let entries = parseNameStatus(output);
    if (options.mode === "working") {
        if (!scope.baseCommit) {
            entries = entries.map((entry) => ({ path: entry.path, status: "added", untracked: true }));
        }
        const tracked = new Set(entries.flatMap((entry) => [entry.path, entry.oldPath].filter((value) => Boolean(value))));
        const untracked = gitText(root, ["ls-files", "--others", "--exclude-standard", "-z"])
            .split("\0")
            .filter(Boolean)
            .map(normalizeGitPath)
            .filter((path) => !tracked.has(path));
        entries.push(...untracked.map((path) => ({ path, status: "added", untracked: true })));
    }
    return entries.sort((left, right) => left.path.localeCompare(right.path, "en"));
}
function readWorktreeFile(root, path, maxBytes) {
    const absolute = safeWorktreePath(root, path);
    if (!absolute)
        return null;
    let descriptor = null;
    try {
        const stat = lstatSync(absolute);
        if (stat.isSymbolicLink())
            return null;
        if (!stat.isFile() || stat.size > maxBytes)
            return null;
        const noFollow = typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
        descriptor = openSync(absolute, constants.O_RDONLY | noFollow);
        const opened = fstatSync(descriptor);
        if (!opened.isFile() || opened.size > maxBytes)
            return null;
        const buffer = Buffer.allocUnsafe(maxBytes + 1);
        let offset = 0;
        while (offset < buffer.length) {
            const count = readSync(descriptor, buffer, offset, buffer.length - offset, null);
            if (count === 0)
                break;
            offset += count;
        }
        return offset <= maxBytes ? Buffer.from(buffer.subarray(0, offset)) : null;
    }
    catch {
        return null;
    }
    finally {
        if (descriptor !== null) {
            try {
                closeSync(descriptor);
            }
            catch { /* The read failure is already represented as an omitted file. */ }
        }
    }
}
function readNewContent(root, entry, options, head) {
    if (entry.status === "deleted")
        return { data: null, source: "worktree" };
    if (entry.untracked || options.mode === "working") {
        return { data: readWorktreeFile(root, entry.path, options.maxFileBytes), source: "worktree" };
    }
    if (options.mode === "staged") {
        return { data: readGitBlob(root, `:${entry.path}`, options.maxFileBytes), source: "index" };
    }
    return { data: head ? readGitBlob(root, `${head}:${entry.path}`, options.maxFileBytes) : null, source: "base" };
}
function readOldContent(root, entry, options, scope) {
    const revision = scope.baseCommit;
    if (!revision)
        return null;
    return readGitBlob(root, `${revision}:${entry.oldPath ?? entry.path}`, options.maxFileBytes);
}
export function parseHunks(patch) {
    const hunks = [];
    const pattern = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/gm;
    for (const match of patch.matchAll(pattern)) {
        const oldStart = Number.parseInt(match[1], 10);
        const oldLines = Number.parseInt(match[2] ?? "1", 10);
        const newStart = Number.parseInt(match[3], 10);
        const newLines = Number.parseInt(match[4] ?? "1", 10);
        hunks.push({
            oldStart,
            oldLines,
            newStart,
            newLines,
            oldRange: oldLines === 0 ? null : { start: oldStart, end: oldStart + oldLines - 1 },
            newRange: newLines === 0 ? null : { start: newStart, end: newStart + newLines - 1 },
        });
    }
    return hunks;
}
function countPatchChanges(patch) {
    let additions = 0;
    let deletions = 0;
    let inHunk = false;
    for (const line of patch.split(/\r?\n/)) {
        if (line.startsWith("@@")) {
            inHunk = true;
            continue;
        }
        if (!inHunk)
            continue;
        if (line.startsWith("+"))
            additions += 1;
        else if (line.startsWith("-"))
            deletions += 1;
    }
    return { additions, deletions };
}
function mergeRanges(ranges) {
    const sorted = ranges
        .filter((range) => range.start > 0 && range.end >= range.start)
        .sort((a, b) => a.start - b.start || a.end - b.end);
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
function buildContext(content, source, ranges, contextLines, maxContextLines) {
    const redactedContent = redactSecrets(content.toString("utf8").replaceAll("\r\n", "\n"));
    const lines = splitTextLines(redactedContent.text);
    const expanded = mergeRanges(ranges.filter((range) => range !== null).map((range) => ({
        start: Math.max(1, range.start - contextLines),
        end: Math.min(lines.length, range.end + contextLines),
    })));
    const blocks = [];
    let remaining = maxContextLines;
    const redactions = redactedContent.count;
    let truncated = false;
    for (const range of expanded) {
        if (remaining <= 0) {
            truncated = true;
            break;
        }
        const end = Math.min(range.end, range.start + remaining - 1);
        if (end < range.end)
            truncated = true;
        const selected = lines.slice(range.start - 1, end);
        const numbered = selected.map((line, offset) => `${range.start + offset}: ${line}`).join("\n");
        blocks.push({ source, start: range.start, end, text: numbered });
        remaining -= end - range.start + 1;
    }
    return { blocks, redactions, truncated };
}
function splitSourceLines(content) {
    const text = content.toString("utf8").replaceAll("\r\n", "\n");
    return splitTextLines(text);
}
function splitTextLines(text) {
    if (text.length === 0)
        return [];
    const lines = text.split("\n");
    if (lines.at(-1) === "")
        lines.pop();
    return lines;
}
function truncateUtf8(input, maxBytes) {
    const buffer = Buffer.from(input, "utf8");
    if (buffer.length <= maxBytes)
        return { text: input, truncated: false };
    let end = maxBytes;
    while (end > 0 && (buffer[end] & 0xc0) === 0x80)
        end -= 1;
    return { text: `${buffer.subarray(0, end).toString("utf8")}\n[PATCH TRUNCATED]`, truncated: true };
}
function syntheticUntrackedPatch(path, content) {
    const lines = splitSourceLines(content);
    if (lines.length === 0)
        return `diff --git a/${path} b/${path}\nnew file mode 100644\n--- /dev/null\n+++ b/${path}\n`;
    const body = lines.map((line) => `+${line}`).join("\n");
    return `diff --git a/${path} b/${path}\nnew file mode 100644\n--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${lines.length} @@\n${body}\n`;
}
function getPatch(root, entry, scope, maxBuffer) {
    if (entry.untracked)
        return "";
    const paths = entry.oldPath ? [entry.oldPath, entry.path] : [entry.path];
    return gitText(root, [
        "diff",
        "--no-ext-diff",
        "--no-color",
        "--find-renames",
        "--unified=0",
        ...scope.args,
        "--",
        ...paths,
    ], { maxBuffer });
}
function processEntry(root, entry, options, scope, head) {
    const redactedPath = redactSecrets(entry.path);
    const redactedOldPath = entry.oldPath ? redactSecrets(entry.oldPath) : null;
    if (redactedPath.count > 0 || (redactedOldPath?.count ?? 0) > 0) {
        return { omitted: { path: redactedPath.text, reason: "sensitive-path", detail: "The filename appears to contain credential material." } };
    }
    if (entry.status === "unmerged") {
        return { omitted: { path: entry.path, reason: "unreadable", detail: "Resolve unmerged index entries before review." } };
    }
    if (!isSafeGitPath(entry.path) || (entry.oldPath !== undefined && !isSafeGitPath(entry.oldPath))) {
        return { omitted: { path: entry.path, reason: "unsafe-path", detail: "Control characters, absolute paths, and traversal segments are not reviewable." } };
    }
    const ignored = classifyIgnoredPath(entry.path);
    if (ignored)
        return { omitted: { path: entry.path, reason: ignored } };
    const current = readNewContent(root, entry, options, head);
    const oldContent = readOldContent(root, entry, options, scope);
    if (entry.status !== "deleted" && !current.data) {
        return { omitted: { path: entry.path, reason: "unreadable", detail: "The new file or Git blob could not be read within the configured size limit." } };
    }
    if (entry.status === "deleted" && !oldContent) {
        return { omitted: { path: entry.path, reason: "unreadable", detail: "The deleted Git blob could not be read within the configured size limit." } };
    }
    const contextContent = current.data ?? oldContent;
    const contextSource = current.data ? current.source : "base";
    if (!contextContent) {
        return { omitted: { path: entry.path, reason: "unreadable", detail: "The relevant Git blob or worktree file could not be read within the size limit." } };
    }
    if (contextContent.length > options.maxFileBytes) {
        return { omitted: { path: entry.path, reason: "too-large", detail: `File exceeds ${options.maxFileBytes} bytes.` } };
    }
    if (isBinary(contextContent))
        return { omitted: { path: entry.path, reason: "binary" } };
    if (looksGenerated(contextContent))
        return { omitted: { path: entry.path, reason: "generated" } };
    let patch;
    try {
        patch = entry.untracked ? syntheticUntrackedPatch(entry.path, contextContent) : getPatch(root, entry, scope, options.maxFileBytes * 6);
    }
    catch (error) {
        return { omitted: { path: entry.path, reason: "too-large", detail: error instanceof Error ? error.message : String(error) } };
    }
    if (/^(?:Binary files|GIT binary patch)/m.test(patch))
        return { omitted: { path: entry.path, reason: "binary" } };
    const hunks = parseHunks(patch);
    const changes = entry.untracked
        ? { additions: splitSourceLines(contextContent).length, deletions: 0 }
        : countPatchChanges(patch);
    const ranges = current.data ? hunks.map((hunk) => hunk.newRange) : hunks.map((hunk) => hunk.oldRange);
    const context = buildContext(contextContent, contextSource, ranges, options.contextLines, options.maxContextLines);
    const redactedPatch = redactSecrets(patch);
    const limitedPatch = truncateUtf8(redactedPatch.text, options.maxPatchBytes);
    // A truncated patch may omit later hunk headers. Expose only ranges whose headers
    // remain in the bounded evidence, and discard context that cannot be tied to one.
    const visibleHunks = parseHunks(limitedPatch.text);
    const visibleRanges = mergeRanges(visibleHunks.flatMap((hunk) => {
        const range = current.data ? hunk.newRange : hunk.oldRange;
        return range ? [{ start: Math.max(1, range.start - options.contextLines), end: range.end + options.contextLines }] : [];
    }));
    const visibleContext = context.blocks.filter((block) => visibleRanges.some((range) => block.start >= range.start && block.end <= range.end));
    return {
        file: {
            path: entry.path,
            ...(entry.oldPath ? { oldPath: entry.oldPath } : {}),
            status: entry.status,
            language: detectLanguage(entry.path),
            additions: changes.additions,
            deletions: changes.deletions,
            redactions: context.redactions + redactedPatch.count,
            truncated: context.truncated || limitedPatch.truncated,
            hunks: visibleHunks,
            context: visibleContext,
            patch: limitedPatch.text,
        },
    };
}
export function createSnapshot(input) {
    const options = resolveOptions(input);
    const root = findRepositoryRoot(options.cwd);
    const head = resolveGitRevision(root, "HEAD");
    const branchResult = runGit(root, ["symbolic-ref", "--quiet", "--short", "HEAD"], { allowFailure: true });
    const branch = branchResult.status === 0 ? branchResult.stdout.toString("utf8").trim() || null : null;
    const scope = resolveScope(root, options, head);
    const changed = listChangedPaths(root, options, scope);
    const files = [];
    const omitted = [];
    let payloadBytes = 0;
    let globallyTruncated = false;
    for (const entry of changed) {
        if (files.length >= options.maxFiles) {
            omitted.push({ path: entry.path, reason: "file-limit", detail: `Snapshot is limited to ${options.maxFiles} files.` });
            globallyTruncated = true;
            continue;
        }
        const result = processEntry(root, entry, options, scope, head);
        if (result.omitted) {
            omitted.push(result.omitted);
            continue;
        }
        const file = result.file;
        const bytes = Buffer.byteLength(file.patch, "utf8") + file.context.reduce((sum, block) => sum + Buffer.byteLength(block.text, "utf8"), 0);
        if (payloadBytes + bytes > options.maxTotalBytes) {
            omitted.push({ path: entry.path, reason: "file-limit", detail: `Snapshot payload is limited to ${options.maxTotalBytes} bytes.` });
            globallyTruncated = true;
            continue;
        }
        payloadBytes += bytes;
        if (file.truncated)
            globallyTruncated = true;
        files.push(file);
    }
    const additions = files.reduce((sum, file) => sum + file.additions, 0);
    const deletions = files.reduce((sum, file) => sum + file.deletions, 0);
    const redactions = files.reduce((sum, file) => sum + file.redactions, 0);
    return {
        schemaVersion: "1.0",
        repository: {
            root: ".",
            head,
            branch,
            mode: options.mode,
            base: options.mode === "base" ? scope.baseCommit : null,
        },
        limits: {
            contextLines: options.contextLines,
            maxContextLines: options.maxContextLines,
            maxFiles: options.maxFiles,
            maxFileBytes: options.maxFileBytes,
            maxPatchBytes: options.maxPatchBytes,
            maxTotalBytes: options.maxTotalBytes,
        },
        summary: {
            files: files.length,
            additions,
            deletions,
            omitted: omitted.length,
            redactions,
            truncated: globallyTruncated || omitted.some((item) => item.reason === "file-limit" || item.reason === "too-large"),
        },
        files,
        omitted,
    };
}
//# sourceMappingURL=snapshot.js.map