import { spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { delimiter, extname, join, resolve } from "node:path";
import { findRepositoryRoot } from "./git.js";
function cleanVersion(output) {
    const firstLine = output.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").split(/\r?\n/).find((line) => line.trim());
    return firstLine ? firstLine.trim().slice(0, 240) : null;
}
export function findExecutable(name, options = {}) {
    if (!/^[A-Za-z0-9._-]+$/.test(name))
        return null;
    const platform = options.platform ?? process.platform;
    const pathValue = options.path ?? process.env.PATH ?? "";
    const extensions = platform === "win32"
        ? (options.pathExt ?? process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
        : [""];
    const hasExtension = platform === "win32" && extname(name) !== "";
    for (const rawDirectory of pathValue.split(delimiter)) {
        const directory = rawDirectory.replace(/^"|"$/g, "").trim();
        if (!directory)
            continue;
        for (const extension of hasExtension ? [""] : extensions) {
            const candidate = resolve(join(directory, platform === "win32" ? `${name}${extension.toLowerCase()}` : name));
            try {
                const stat = statSync(candidate);
                if (!stat.isFile())
                    continue;
                accessSync(candidate, platform === "win32" ? constants.F_OK : constants.X_OK);
                return candidate;
            }
            catch {
                // Continue searching PATH.
            }
        }
    }
    return null;
}
export function probeTool(name, executable) {
    const path = executable === undefined ? findExecutable(name) : executable;
    if (!path)
        return { name, available: false, executable: null, version: null, detail: "Not found on PATH." };
    const extension = extname(path).toLowerCase();
    if (process.platform === "win32" && (extension === ".cmd" || extension === ".bat")) {
        return {
            name,
            available: true,
            executable: path,
            version: null,
            detail: "Command shim found; it was not executed during the safety check.",
        };
    }
    const result = spawnSync(path, ["--version"], {
        encoding: "utf8",
        shell: false,
        windowsHide: true,
        timeout: 5_000,
        maxBuffer: 256 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", NO_COLOR: "1" },
    });
    if (result.error) {
        return { name, available: true, executable: path, version: null, detail: result.error.message.slice(0, 240) };
    }
    const version = cleanVersion(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    return {
        name,
        available: true,
        executable: path,
        version,
        detail: result.status === 0 ? null : `Version probe exited with status ${result.status ?? "unknown"}.`,
    };
}
export function runDoctor(cwd) {
    const tools = ["git", "codex", "claude"].map((name) => probeTool(name));
    const git = tools[0];
    let repository;
    if (!git.available) {
        repository = { ok: false, root: null, detail: "Git is required to collect deterministic diffs." };
    }
    else {
        try {
            repository = { ok: true, root: findRepositoryRoot(cwd), detail: null };
        }
        catch (error) {
            repository = { ok: false, root: null, detail: error instanceof Error ? error.message : String(error) };
        }
    }
    const major = Number.parseInt(process.versions.node.split(".")[0], 10);
    const supported = Number.isSafeInteger(major) && major >= 20;
    const agentAvailable = tools.slice(1).some((tool) => tool.available);
    const recommendations = [];
    if (!supported)
        recommendations.push("Install Node.js 20 or newer.");
    if (!git.available)
        recommendations.push("Install Git and add it to PATH.");
    else if (!repository.ok)
        recommendations.push("Run the command inside the Git repository you want to review.");
    if (!agentAvailable)
        recommendations.push("Install Codex or Claude Code to invoke the review workflow from an agent.");
    return {
        schemaVersion: "1.0",
        ok: supported && git.available && repository.ok && agentAvailable,
        platform: process.platform,
        node: { version: process.version, supported },
        repository,
        tools,
        recommendations,
    };
}
//# sourceMappingURL=doctor.js.map