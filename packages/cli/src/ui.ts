import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { basename, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CliError, errorMessage } from "./errors.ts";
import { findRepositoryRoot, gitText, runGit } from "./git.ts";
import { createReviewHistoryStore, type HistoryRecord, type TerminalReviewState } from "./history.ts";
import { detectReviewHosts, runHostReview, safeHostPathDirectories, type ReviewHost } from "./host-review.ts";
import { createSnapshot } from "./snapshot.ts";
import type { ReviewReport, ReviewSnapshot, SnapshotMode, ValidationResult } from "./types.ts";
import { validateReport } from "./validate.ts";

export interface DashboardOptions {
  cwd: string;
  port?: number;
  open?: boolean;
  preferredHost?: ReviewHost;
}

export interface DashboardDependencies {
  detectHosts?: typeof detectReviewHosts;
  review?: typeof runHostReview;
  historyDirectory?: string;
  onEvent?: (event: string, detail: Record<string, unknown>) => void;
}

interface ReviewJob {
  id: string;
  state: "queued" | "snapshot" | "reviewing" | "validating" | "complete" | "failed" | "cancelled";
  host: ReviewHost;
  createdAt: string;
  updatedAt: string;
  snapshot?: ReviewSnapshot;
  report?: ReviewReport;
  validation?: ValidationResult;
  error?: string;
  controller: AbortController;
}

const assets = new Map<string, { type: string; body: Buffer }>();
for (const [route, name, type] of [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/index.html", "index.html", "text/html; charset=utf-8"],
  ["/app.js", "app.js", "text/javascript; charset=utf-8"],
  ["/styles.css", "styles.css", "text/css; charset=utf-8"],
  ["/history.css", "history.css", "text/css; charset=utf-8"],
  ["/responsive.css", "responsive.css", "text/css; charset=utf-8"],
  ["/report.css", "report.css", "text/css; charset=utf-8"],
  ["/desktop.css", "desktop.css", "text/css; charset=utf-8"],
  ["/logo.svg", "logo.svg", "image/svg+xml"],
] as const) {
  assets.set(route, { type, body: readFileSync(fileURLToPath(new URL(`./dashboard/${name}`, import.meta.url))) });
}

function send(response: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  response.end(text);
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (!(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
    throw new CliError("Dashboard requests must use application/json.", { code: "INVALID_CONTENT_TYPE" });
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 64 * 1024) throw new CliError("Dashboard request is too large.", { code: "INPUT_TOO_LARGE" });
    chunks.push(buffer);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("object required");
    return value as Record<string, unknown>;
  } catch (error) {
    throw new CliError(`Dashboard request is not valid JSON: ${errorMessage(error)}`, { code: "INVALID_JSON" });
  }
}

function parseReviewRequest(body: Record<string, unknown>, preferred?: ReviewHost): { host: ReviewHost; mode: SnapshotMode; base?: string } {
  const host = body.host ?? preferred;
  if (host !== "codex" && host !== "claude") throw new CliError("Select Codex or Claude Code.", { code: "INVALID_HOST" });
  const scope = body.scope ?? "working";
  if (scope !== "working" && scope !== "staged" && scope !== "base") throw new CliError("Unknown review scope.", { code: "INVALID_SCOPE" });
  const base = body.base;
  if (scope === "base" && (typeof base !== "string" || base.length < 1 || base.length > 1024)) {
    throw new CliError("Base review requires a valid revision.", { code: "INVALID_BASE" });
  }
  return { host, mode: scope, ...(scope === "base" ? { base: base as string } : {}) };
}

function publicJob(job: ReviewJob): Omit<ReviewJob, "controller" | "snapshot"> & { snapshot?: ReviewSnapshot["summary"] & { filesList: Array<{ path: string; status: string; additions: number; deletions: number }> } } {
  return {
    id: job.id,
    state: job.state,
    host: job.host,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    ...(job.snapshot ? { snapshot: {
      ...job.snapshot.summary,
      filesList: job.snapshot.files.map(({ path, status, additions, deletions }) => ({ path, status, additions, deletions })),
    } } : {}),
    ...(job.report ? { report: job.report } : {}),
    ...(job.validation ? { validation: job.validation } : {}),
    ...(job.error ? { error: job.error.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 2_000) } : {}),
  };
}

function historyRecord(job: ReviewJob): HistoryRecord {
  if (!job.snapshot || (job.state !== "complete" && job.state !== "failed" && job.state !== "cancelled")) {
    throw new Error("Only terminal review jobs with a snapshot can be persisted.");
  }
  const visible = publicJob(job);
  return {
    id: job.id,
    state: job.state as TerminalReviewState,
    host: job.host,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    scope: { mode: job.snapshot.repository.mode, base: job.snapshot.repository.base, branch: job.snapshot.repository.branch },
    ...(visible.snapshot ? { snapshot: visible.snapshot } : {}),
    ...(job.report ? { report: job.report } : {}),
    ...(visible.error ? { error: visible.error } : {}),
  };
}

export function resolveBrowserOpener(runtimePlatform = process.platform, pathValue = process.env.PATH ?? "", excludedRoots: string[] = []): string | null {
  if (runtimePlatform === "win32") {
    const command = process.env.ComSpec ?? "";
    return isAbsolute(command) && safeHostPathDirectories(command, excludedRoots).length === 1 ? command : null;
  }
  const name = runtimePlatform === "darwin" ? "open" : "xdg-open";
  return safeHostPathDirectories(pathValue, excludedRoots).map((directory) => join(directory, name)).find((candidate) => existsSync(candidate)) ?? null;
}

export function launchBrowser(url: string, runtimePlatform = process.platform, spawnProcess: typeof spawn = spawn, excludedRoots: string[] = [], pathValue = process.env.PATH ?? ""): boolean {
  const command = resolveBrowserOpener(runtimePlatform, pathValue, excludedRoots);
  if (!command) return false;
  const args = runtimePlatform === "win32" ? ["/d", "/s", "/c", "start", "", url] : [url];
  const child = spawnProcess(command, args, { detached: true, shell: false, stdio: "ignore", windowsHide: true });
  child.on("error", () => {});
  child.unref();
  return true;
}

export function createDashboardServer(options: DashboardOptions, dependencies: DashboardDependencies = {}) {
  const repositoryRoot = findRepositoryRoot(resolve(options.cwd));
  const token = randomBytes(24).toString("hex");
  const jobs = new Map<string, ReviewJob>();
  let activeJob: ReviewJob | null = null;
  const schemaPath = fileURLToPath(new URL("./schemas/review-host-output.schema.json", import.meta.url));
  const detectHosts = dependencies.detectHosts ?? detectReviewHosts;
  const review = dependencies.review ?? runHostReview;
  const emitEvent = (event: string, detail: Record<string, unknown>): void => {
    try { dependencies.onEvent?.(event, detail); } catch { /* Optional observers cannot affect a review. */ }
  };
  const history = createReviewHistoryStore(repositoryRoot, dependencies.historyDirectory);
  const currentBranch = (): string | null => {
    const result = runGit(repositoryRoot, ["symbolic-ref", "--quiet", "--short", "HEAD"], { allowFailure: true });
    return result.status === 0 ? result.stdout.toString("utf8").trim() || null : null;
  };
  const branches = () => {
    const active = currentBranch();
    return gitText(repositoryRoot, ["for-each-ref", "--format=%(refname:short)%00%(objectname:short)", "refs/heads"])
      .split(/\r?\n/)
      .filter(Boolean)
      .flatMap((line) => {
        const [name, commit] = line.split("\0");
        return name && commit ? [{ name, commit, current: name === active }] : [];
      })
      .sort((left, right) => Number(right.current) - Number(left.current) || left.name.localeCompare(right.name));
  };

  const server = createServer(async (request, response) => {
    const address = server.address();
    const port = address && typeof address === "object" ? address.port : options.port ?? 4387;
    const host = request.headers.host ?? "";
    const validHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!validHosts.has(host)) return send(response, 421, { error: "Invalid local host header." });
    const url = new URL(request.url ?? "/", `http://${host}`);
    const asset = assets.get(url.pathname);
    if (request.method === "GET" && asset) {
      response.writeHead(200, {
        "content-type": asset.type,
        "content-length": asset.body.length,
        "cache-control": "no-store",
        "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      });
      response.end(asset.body);
      return;
    }
    if (!url.pathname.startsWith("/api/")) return send(response, 404, { error: "Not found." });
    if (request.headers["x-auto-code-review-token"] !== token) return send(response, 401, { error: "This local session is not authorized." });
    const expectedOrigin = `http://${host}`;
    if (request.method !== "GET" && request.headers.origin !== expectedOrigin) return send(response, 403, { error: "Invalid local request origin." });

    try {
      if (request.method === "GET" && url.pathname === "/api/status") {
        const hosts = detectHosts([repositoryRoot]);
        const snapshot = createSnapshot({ cwd: repositoryRoot, mode: "working" });
        return send(response, 200, {
          repository: { name: basename(repositoryRoot), path: repositoryRoot, branch: snapshot.repository.branch },
          hosts,
          preferredHost: options.preferredHost ?? hosts.find((item) => item.available)?.host ?? null,
          snapshot: { ...snapshot.summary, filesList: snapshot.files.map(({ path, status, additions, deletions }) => ({ path, status, additions, deletions })) },
          activeReview: activeJob ? publicJob(activeJob) : null,
        });
      }
      if (request.method === "GET" && url.pathname === "/api/history") {
        return send(response, 200, { records: history.list() });
      }
      if (request.method === "GET" && url.pathname === "/api/activity") {
        const records = history.list();
        return send(response, 200, {
          records: records.map(({ updatedAt, state, findings, files, host, scope }) => ({ updatedAt, state, findings, files, host, branch: scope.branch })),
        });
      }
      if (request.method === "GET" && url.pathname === "/api/branches") {
        return send(response, 200, { current: currentBranch(), branches: branches() });
      }
      if (request.method === "POST" && url.pathname === "/api/branches/switch") {
        if (activeJob && !["complete", "failed", "cancelled"].includes(activeJob.state)) {
          return send(response, 409, { error: "A branch cannot be switched while a review is running." });
        }
        const body = await readJson(request);
        if (typeof body.branch !== "string" || body.branch.length < 1 || body.branch.length > 1_024) {
          throw new CliError("Select a valid local branch.", { code: "INVALID_BRANCH" });
        }
        const available = branches();
        if (!available.some((branch) => branch.name === body.branch)) {
          throw new CliError("The selected local branch no longer exists.", { code: "UNKNOWN_BRANCH" });
        }
        if (body.branch !== currentBranch()) {
          const dirty = gitText(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=normal"]);
          if (dirty.trim()) return send(response, 409, { error: "Commit, stash, or discard local changes before switching branches." });
          runGit(repositoryRoot, ["switch", body.branch]);
          activeJob = null;
          emitEvent("branch-switched", { branch: body.branch });
        }
        return send(response, 200, { current: currentBranch(), branches: branches() });
      }
      if (request.method === "DELETE" && url.pathname === "/api/history") {
        history.clear();
        return send(response, 200, { ok: true });
      }
      const historyMatch = url.pathname.match(/^\/api\/history\/([0-9a-f-]{8,64})$/i);
      if (request.method === "GET" && historyMatch) {
        const record = history.get(historyMatch[1]);
        return record ? send(response, 200, record) : send(response, 404, { error: "Review history record not found." });
      }
      if (request.method === "DELETE" && historyMatch) {
        return history.delete(historyMatch[1]) ? send(response, 200, { ok: true }) : send(response, 404, { error: "Review history record not found." });
      }
      if (request.method === "POST" && url.pathname === "/api/reviews") {
        if (activeJob && !["complete", "failed", "cancelled"].includes(activeJob.state)) {
          return send(response, 409, { error: "A review is already running." });
        }
        const input = parseReviewRequest(await readJson(request), options.preferredHost);
        const availability = detectHosts([repositoryRoot]).find((item) => item.host === input.host);
        if (!availability?.available) return send(response, 400, { error: `${input.host === "codex" ? "Codex" : "Claude Code"} is not available on this computer.` });
        const now = new Date().toISOString();
        const job: ReviewJob = { id: randomUUID(), state: "queued", host: input.host, createdAt: now, updatedAt: now, controller: new AbortController() };
        jobs.set(job.id, job);
        activeJob = job;
        emitEvent("started", { id: job.id, host: job.host, scope: input.mode });
        void (async () => {
          try {
            job.state = "snapshot";
            job.updatedAt = new Date().toISOString();
            job.snapshot = createSnapshot({ cwd: repositoryRoot, mode: input.mode, base: input.base });
            job.state = "reviewing";
            job.updatedAt = new Date().toISOString();
            job.report = await review({ host: input.host, repositoryRoot, snapshot: job.snapshot, schemaPath, signal: job.controller.signal });
            job.state = "validating";
            job.updatedAt = new Date().toISOString();
            job.validation = validateReport(job.report, job.snapshot, { strict: true });
            if (!job.validation.valid) {
              const messages = job.validation.errors.slice(0, 3).map((issue) => issue.message).join("; ");
              throw new Error(`The model report failed evidence validation: ${messages}`);
            }
            job.state = "complete";
          } catch (error) {
            job.state = job.controller.signal.aborted ? "cancelled" : "failed";
            job.error = errorMessage(error);
          } finally {
            job.updatedAt = new Date().toISOString();
            emitEvent("finished", { id: job.id, host: job.host, state: job.state, findings: job.report?.findings.length ?? 0 });
            if (job.snapshot && ["complete", "failed", "cancelled"].includes(job.state)) {
              try { history.save(historyRecord(job)); } catch { /* Review success does not depend on optional local history persistence. */ }
            }
          }
        })();
        return send(response, 202, { id: job.id, state: job.state });
      }
      const match = url.pathname.match(/^\/api\/reviews\/([0-9a-f-]+)$/);
      if (request.method === "GET" && match) {
        const job = jobs.get(match[1]);
        return job ? send(response, 200, publicJob(job)) : send(response, 404, { error: "Review not found." });
      }
      const cancelMatch = url.pathname.match(/^\/api\/reviews\/([0-9a-f-]+)\/cancel$/);
      if (request.method === "POST" && cancelMatch) {
        const job = jobs.get(cancelMatch[1]);
        if (!job) return send(response, 404, { error: "Review not found." });
        if (!["complete", "failed", "cancelled"].includes(job.state)) job.controller.abort();
        return send(response, 202, { id: job.id, state: job.state });
      }
      return send(response, 404, { error: "Not found." });
    } catch (error) {
      const status = error instanceof CliError ? 400 : 500;
      return send(response, status, { error: errorMessage(error) });
    }
  });

  const shutdown = async (): Promise<void> => {
    if (activeJob && !["complete", "failed", "cancelled"].includes(activeJob.state)) activeJob.controller.abort();
    if (server.listening) await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  };

  return { server, token, repositoryRoot, historyPath: history.path, shutdown };
}

export function startDashboard(options: DashboardOptions): void {
  const { server, token, repositoryRoot } = createDashboardServer(options);
  const port = options.port ?? 4387;
  server.on("error", (error) => {
    process.stderr.write(`auto-code-review: Unable to start local UI: ${errorMessage(error)}\n`);
    process.exitCode = 2;
  });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    const activePort = address && typeof address === "object" ? address.port : port;
    const url = `http://127.0.0.1:${activePort}/#token=${token}`;
    process.stdout.write(`Auto Code Review UI\nRepository: ${repositoryRoot}\nLocal URL: ${url}\nPress Ctrl+C to stop.\n`);
    if (options.open !== false) launchBrowser(url, process.platform, spawn, [repositoryRoot]);
  });
}
