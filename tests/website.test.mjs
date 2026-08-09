import assert from 'node:assert/strict';
import { once } from 'node:events';
import { symlink, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { server } from '../website/server.mjs';

let baseUrl;

test.before(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  server.close();
  await once(server, 'close');
});

test('serves health endpoint without caching', async () => {
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('serves the accessible product page with security headers', async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /data-testid="run-review"/);
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /无需额外 API Key/);
  assert.match(html, /data-language="zh" aria-pressed="true"/);
  assert.match(html, /data-language="en" aria-pressed="false"/);
  assert.match(html, /npm run install:agents -- --platform codex/);
  assert.match(html, /npm run install:agents -- --platform claude/);
  assert.match(html, /发布行为分数前必须注明宿主、模型版本和语料/);
  assert.doesNotMatch(html, /and other coding agents/);
  assert.doesNotMatch(html, /SARIF/);
});

test('serves static assets with correct content types', async () => {
  const css = await fetch(`${baseUrl}/styles.css`);
  const script = await fetch(`${baseUrl}/app.js`);
  assert.match(css.headers.get('content-type'), /^text\/css/);
  assert.match(script.headers.get('content-type'), /^text\/javascript/);
  const source = await script.text();
  assert.match(source, /localStorage\.getItem\('auto-code-review-language'\)/);
  assert.match(source, /One review standard, every coding agent/);
  assert.match(source, /一套审查标准，适配每个编程智能体/);
});

test('does not expose files outside the website root', async () => {
  const response = await fetch(`${baseUrl}/%2e%2e/README.md`);
  assert.notEqual(response.status, 200);
});

test('does not follow a website symlink outside the static root', async (context) => {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const link = resolve(projectRoot, 'website', '.security-test-link.txt');
  try {
    await symlink(resolve(projectRoot, 'README.md'), link, 'file');
  } catch (error) {
    if (error?.code === 'EPERM' || error?.code === 'EACCES') {
      context.skip(`Symbolic links are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  try {
    const response = await fetch(`${baseUrl}/.security-test-link.txt`);
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /One review standard/);
  } finally {
    await unlink(link);
  }
});

test('returns 404 for unknown files', async () => {
  const response = await fetch(`${baseUrl}/missing.txt`);
  assert.equal(response.status, 404);
});
