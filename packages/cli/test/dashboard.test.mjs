import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createDashboardServer } from "../dist/ui.js";
import { seedRepository, write } from "./helpers.mjs";

async function setup(reviewOverride) {
  const root = seedRepository();
  write(root, "src/dashboard.ts", "export const enabled = true;\n");
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
  });
  dashboard.server.listen(0, "127.0.0.1");
  await once(dashboard.server, "listening");
  const address = dashboard.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { ...dashboard, baseUrl };
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
    let job;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await fetch(`${dashboard.baseUrl}/api/reviews/${id}`, {
        headers: { "x-auto-code-review-token": dashboard.token },
      });
      job = await response.json();
      if (["complete", "failed"].includes(job.state)) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
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
  } finally {
    dashboard.server.close();
    await once(dashboard.server, "close");
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
