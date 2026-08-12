import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDashboardServer } from "../dist/ui.js";
import { git, seedRepository, write } from "./helpers.mjs";

async function setup(reviewOverride, options = {}) {
  const root = options.root ?? seedRepository();
  if (!options.root) write(root, "src/dashboard.ts", "export const enabled = true;\n");
  const historyDirectory = options.historyDirectory ?? mkdtempSync(join(tmpdir(), "acr-history-"));
  const review = async ({ snapshot }) => {
    const file = snapshot.files[0];
    const line = file.hunks.find((hunk) => hunk.newRange)?.newRange.start ?? 1;
    return {
      schemaVersion: "1.0",
      scope: { kind: "working-tree", base: null, head: snapshot.repository.head },
      summary: "One verified issue was found in the current change.",
      findings: [{
        id: "ACR-DASHBOARD-1",
        priority: "P2",
        confidence: 0.91,
        category: "testing",
        file: file.path,
        startLine: line,
        endLine: line,
        title: "New behavior has no regression coverage",
        evidence: "The changed export adds behavior without a matching test in this bounded snapshot.",
        failureScenario: "A future change can break this branch without a test detecting the regression.",
        suggestedFix: "Add a focused regression test for the new branch.",
      }],
    };
  };
  const dashboard = createDashboardServer({ cwd: root, port: 0, open: false }, {
    detectHosts: () => [
      { host: "codex", available: true, version: "codex-test" },
      { host: "claude", available: false, version: null },
    ],
    review: reviewOverride ?? review,
    historyDirectory,
    onEvent: options.onEvent,
  });
  dashboard.server.listen(0, "127.0.0.1");
  await once(dashboard.server, "listening");
  const address = dashboard.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { ...dashboard, baseUrl, historyDirectory };
}

async function waitForTerminal(dashboard, id) {
  let job;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await fetch(`${dashboard.baseUrl}/api/reviews/${id}`, {
      headers: { "x-auto-code-review-token": dashboard.token },
    });
    job = await response.json();
    if (["complete", "failed", "cancelled"].includes(job.state)) return job;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return job;
}

test("local dashboard requires its session token and never exposes patch bodies", async () => {
  const dashboard = await setup();
  try {
    const page = await fetch(`${dashboard.baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-security-policy"), /connect-src 'self'/);
    assert.match(await page.text(), /真实本地审查/);

    const responsive = await fetch(`${dashboard.baseUrl}/responsive.css`);
    assert.equal(responsive.status, 200);
    assert.match(await responsive.text(), /overflow-wrap:\s*anywhere/);

    const reportStyles = await fetch(`${dashboard.baseUrl}/report.css`);
    assert.equal(reportStyles.status, 200);
    assert.match(await reportStyles.text(), /\.report-overview/);

    const dashboardHtml = await (await fetch(`${dashboard.baseUrl}/`)).text();
    assert.match(dashboardHtml, /class="brand-mark"[^>]*><img src="\.\/logo\.svg"/);
    assert.match(dashboardHtml, /href="\.\/report\.css"/);
    assert.match(dashboardHtml, /href="\.\/desktop\.css"/);
    assert.match(dashboardHtml, /data-i18n="filesLoading"/);
    assert.match(dashboardHtml, /data-desktop-sidebar/);
    assert.match(dashboardHtml, /data-branch-select/);
    assert.match(dashboardHtml, /data-branch-options[^>]*role="listbox"/);
    assert.match(dashboardHtml, /data-activity-calendar/);
    assert.match(dashboardHtml, /data-log-viewer/);
    assert.match(dashboardHtml, /data-log-content/);

    const dashboardScript = await (await fetch(`${dashboard.baseUrl}/app.js`)).text();
    assert.match(dashboardScript, /filesLoading:'Reading Git changes…'/);
    assert.match(dashboardScript, /reviewLoading:'Reviewing the current code change…'/);
    assert.match(dashboardScript, /api\/activity/);
    assert.match(dashboardScript, /desktopApi\.getLogs\(\)/);
    assert.match(dashboardScript, /function setMainInert\(value\)/);
    assert.match(dashboardScript, /setMainInert\(true\)/);
    assert.match(dashboardScript, /selectedScope==='working'&&!workingHasChanges/);
    assert.doesNotMatch(dashboardScript, /loading:'(?:Reading Git changes|Reviewing the current code change)/);

    const unauthorized = await fetch(`${dashboard.baseUrl}/api/status`);
    assert.equal(unauthorized.status, 401);

    const status = await fetch(`${dashboard.baseUrl}/api/status`, {
      headers: { "x-auto-code-review-token": dashboard.token },
    });
    assert.equal(status.status, 200);
    const body = await status.json();
    assert.equal(body.hosts[0].available, true);
    assert.equal(body.snapshot.files, 1);
    assert.equal(Object.hasOwn(body.snapshot.filesList[0], "patch"), false);

    const diagnostics = await fetch(`${dashboard.baseUrl}/api/diagnostics`, {
      headers: { "x-auto-code-review-token": dashboard.token },
    });
    const diagnosticsBody = await diagnostics.json();
    assert.equal(diagnostics.status, 200);
    assert.equal(typeof diagnosticsBody.doctor.ok, "boolean");
    assert.equal(diagnosticsBody.config.path, ".auto-code-review.json");
    assert.equal(diagnosticsBody.history.path, dashboard.historyPath);
  } finally {
    dashboard.server.close();
    await once(dashboard.server, "close");
  }
});

test("local dashboard runs a review and returns only a validated report", async () => {
  const dashboard = await setup();
  try {
    const headers = {
      "x-auto-code-review-token": dashboard.token,
      "content-type": "application/json",
      origin: dashboard.baseUrl,
    };
    const start = await fetch(`${dashboard.baseUrl}/api/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({ host: "codex", scope: "working" }),
    });
    assert.equal(start.status, 202);
    const { id } = await start.json();
    const job = await waitForTerminal(dashboard, id);
    assert.equal(job.state, "complete", job.error);
    assert.equal(job.validation.valid, true);
    assert.equal(job.report.findings[0].id, "ACR-DASHBOARD-1");
    assert.equal(Object.hasOwn(job, "controller"), false);

    const restored = await fetch(`${dashboard.baseUrl}/api/status`, {
      headers: { "x-auto-code-review-token": dashboard.token },
    });
    assert.equal(restored.status, 200);
    const restoredBody = await restored.json();
    assert.equal(restoredBody.activeReview.id, id);
    assert.equal(restoredBody.activeReview.state, "complete");
    assert.equal(restoredBody.activeReview.report.findings[0].id, "ACR-DASHBOARD-1");

    const history = await fetch(`${dashboard.baseUrl}/api/history`, {
      headers: { "x-auto-code-review-token": dashboard.token },
    });
    const historyBody = await history.json();
    assert.equal(history.status, 200);
    assert.equal(historyBody.records.length, 1);
    assert.equal(historyBody.records[0].findings, 1);
    assert.equal(Object.hasOwn(historyBody.records[0], "report"), false);

    const detail = await fetch(`${dashboard.baseUrl}/api/history/${id}`, {
      headers: { "x-auto-code-review-token": dashboard.token },
    });
    const detailBody = await detail.json();
    assert.equal(detail.status, 200);
    assert.equal(detailBody.report.findings[0].id, "ACR-DASHBOARD-1");
    assert.equal(Object.hasOwn(detailBody.snapshot.filesList[0], "patch"), false);

    const triaged = await fetch(`${dashboard.baseUrl}/api/history/${id}/findings/ACR-DASHBOARD-1`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ state: "resolved" }),
    });
    const triagedBody = await triaged.json();
    assert.equal(triaged.status, 200);
    assert.equal(triagedBody.findingStates["ACR-DASHBOARD-1"], "resolved");
    assert.equal(triagedBody.updatedAt, detailBody.updatedAt);

    const persisted = readFileSync(dashboard.historyPath, "utf8");
    assert.doesNotMatch(persisted, /@@|return user|export const enabled/);
    assert.equal(persisted.includes(dashboard.repositoryRoot), false);
  } finally {
    dashboard.server.close();
    await once(dashboard.server, "close");
  }
});

test("dashboard exposes annual activity and safely switches allowlisted local branches", async () => {
  const dashboard = await setup();
  try {
    const auth = { "x-auto-code-review-token": dashboard.token };
    const mutation = { ...auth, "content-type": "application/json", origin: dashboard.baseUrl };
    const start = await fetch(`${dashboard.baseUrl}/api/reviews`, {
      method: "POST",
      headers: mutation,
      body: JSON.stringify({ host: "codex", scope: "working" }),
    });
    const { id } = await start.json();
    assert.equal((await waitForTerminal(dashboard, id)).state, "complete");

    const activity = await (await fetch(`${dashboard.baseUrl}/api/activity`, { headers: auth })).json();
    assert.equal(activity.records.length, 1);
    assert.equal(activity.records[0].state, "complete");
    assert.equal(activity.records[0].branch, "main");

    git(dashboard.repositoryRoot, ["branch", "feature/dashboard"]);
    const listed = await (await fetch(`${dashboard.baseUrl}/api/branches`, { headers: auth })).json();
    assert.equal(listed.current, "main");
    assert.deepEqual(listed.branches.map(({ name }) => name), ["main", "feature/dashboard"]);

    const dirtyRejected = await fetch(`${dashboard.baseUrl}/api/branches/switch`, {
      method: "POST",
      headers: mutation,
      body: JSON.stringify({ branch: "feature/dashboard" }),
    });
    assert.equal(dirtyRejected.status, 409);

    git(dashboard.repositoryRoot, ["add", "."]);
    git(dashboard.repositoryRoot, ["commit", "-m", "prepare branches"]);
    const switched = await fetch(`${dashboard.baseUrl}/api/branches/switch`, {
      method: "POST",
      headers: mutation,
      body: JSON.stringify({ branch: "feature/dashboard" }),
    });
    assert.equal(switched.status, 200);
    assert.equal((await switched.json()).current, "feature/dashboard");
  } finally {
    dashboard.server.close();
    await once(dashboard.server, "close");
  }
});

test("review history survives a server restart and supports protected deletion", async () => {
  const first = await setup();
  let id;
  try {
    const headers = {
      "x-auto-code-review-token": first.token,
      "content-type": "application/json",
      origin: first.baseUrl,
    };
    const start = await fetch(`${first.baseUrl}/api/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({ host: "codex", scope: "working" }),
    });
    ({ id } = await start.json());
    assert.equal((await waitForTerminal(first, id)).state, "complete");
  } finally {
    first.server.close();
    await once(first.server, "close");
  }

  const second = await setup(undefined, { root: first.repositoryRoot, historyDirectory: first.historyDirectory });
  try {
    const auth = { "x-auto-code-review-token": second.token };
    const history = await fetch(`${second.baseUrl}/api/history`, { headers: auth });
    const body = await history.json();
    assert.equal(body.records.length, 1);
    assert.equal(body.records[0].id, id);

    const rejected = await fetch(`${second.baseUrl}/api/history/${id}`, { method: "DELETE", headers: auth });
    assert.equal(rejected.status, 403);

    const removed = await fetch(`${second.baseUrl}/api/history/${id}`, {
      method: "DELETE",
      headers: { ...auth, origin: second.baseUrl },
    });
    assert.equal(removed.status, 200);
    const empty = await fetch(`${second.baseUrl}/api/history`, { headers: auth });
    assert.deepEqual((await empty.json()).records, []);

    const startAgain = await fetch(`${second.baseUrl}/api/reviews`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json", origin: second.baseUrl },
      body: JSON.stringify({ host: "codex", scope: "working" }),
    });
    const next = await startAgain.json();
    assert.equal((await waitForTerminal(second, next.id)).state, "complete");
    const cleared = await fetch(`${second.baseUrl}/api/history`, {
      method: "DELETE",
      headers: { ...auth, origin: second.baseUrl },
    });
    assert.equal(cleared.status, 200);
    const clearedHistory = await fetch(`${second.baseUrl}/api/history`, { headers: auth });
    assert.deepEqual((await clearedHistory.json()).records, []);
  } finally {
    second.server.close();
    await once(second.server, "close");
  }
});

test("status exposes the active review so a refreshed page can reconnect", async () => {
  const dashboard = await setup(async () => await new Promise(() => {}));
  try {
    const headers = {
      "x-auto-code-review-token": dashboard.token,
      "content-type": "application/json",
      origin: dashboard.baseUrl,
    };
    const start = await fetch(`${dashboard.baseUrl}/api/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({ host: "codex", scope: "working" }),
    });
    const started = await start.json();
    assert.equal(start.status, 202);

    const status = await fetch(`${dashboard.baseUrl}/api/status`, {
      headers: { "x-auto-code-review-token": dashboard.token },
    });
    const body = await status.json();
    assert.equal(status.status, 200);
    assert.equal(body.activeReview.id, started.id);
    assert.equal(body.activeReview.state, "reviewing");
    assert.equal(Object.hasOwn(body.activeReview, "controller"), false);
    assert.equal(Object.hasOwn(body.activeReview.snapshot.filesList[0], "patch"), false);
  } finally {
    dashboard.server.close();
    await once(dashboard.server, "close");
  }
});

test("dashboard shutdown cancels an active host review before closing", async () => {
  const events = [];
  const dashboard = await setup(({ signal }) => new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(new Error("review aborted")), { once: true });
  }), { onEvent: (event, detail) => events.push({ event, detail }) });
  const headers = {
    "x-auto-code-review-token": dashboard.token,
    "content-type": "application/json",
    origin: dashboard.baseUrl,
  };
  const start = await fetch(`${dashboard.baseUrl}/api/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify({ host: "codex", scope: "working" }),
  });
  assert.equal(start.status, 202);
  await dashboard.shutdown();
  for (let attempt = 0; attempt < 20 && !events.some(({ event }) => event === "finished"); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(dashboard.server.listening, false);
  assert.equal(events.find(({ event }) => event === "finished")?.detail.state, "cancelled");
});
