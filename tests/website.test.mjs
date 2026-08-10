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
  assert.match(html, /role="listbox"/);
  assert.match(html, /data-scope-option="branch"/);
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /无需额外 API Key/);
  assert.match(html, /href="\.\/docs\/index\.html"/);
  assert.match(html, /property="og:image" content="https:\/\/vac-le\.github\.io\/auto-code-review\/og\.png"/);
  assert.match(html, /data-language="zh" aria-pressed="true"/);
  assert.match(html, /data-language="en" aria-pressed="false"/);
  assert.match(html, /class="brand-mark"/);
  assert.match(html, /class="nav-menu"/);
  assert.match(html, /class="globe-icon"/);
  assert.doesNotMatch(html, /<svg[^>]*viewBox="0 0 40 40"/);
  assert.match(html, /npm run install:agents -- --platform codex/);
  assert.match(html, /npm run install:agents -- --platform claude/);
  assert.match(html, /npm run ui -- --repo \/path\/to\/project/);
  assert.match(html, /结果公开，评分可复现/);
  assert.doesNotMatch(html, /and other coding agents/);
  assert.doesNotMatch(html, /SARIF/);
  assert.doesNotMatch(html, /智能体|薄弱候选|自我庆祝|审查流水线|宿主模型|映射完整 diff/);
});

test('serves static assets with correct content types', async () => {
  const css = await fetch(`${baseUrl}/styles.css`);
  const script = await fetch(`${baseUrl}/app.js`);
  const preview = await fetch(`${baseUrl}/og.png`);
  assert.match(css.headers.get('content-type'), /^text\/css/);
  assert.match(script.headers.get('content-type'), /^text\/javascript/);
  assert.match(preview.headers.get('content-type'), /^image\/png/);
  const source = await script.text();
  const stylesheet = await css.text();
  assert.match(source, /localStorage\.getItem\('auto-code-review-language'\)/);
  assert.match(source, /One review standard, every coding agent/);
  assert.match(source, /一套标准，审查每一次代码变更/);
  assert.match(stylesheet, /grid-template-columns:\s*minmax\(250px,1fr\) auto minmax\(250px,1fr\)/);
  assert.match(stylesheet, /gap:\s*clamp\(2\.25rem,3\.6vw,4\.75rem\)/);
});

test('serves the Markdown-backed documentation page in both languages', async () => {
  const [page, chinese, english, script, styles] = await Promise.all([
    fetch(`${baseUrl}/docs/index.html`),
    fetch(`${baseUrl}/docs/usage.zh-CN.md`),
    fetch(`${baseUrl}/docs/usage.en.md`),
    fetch(`${baseUrl}/docs/docs.js`),
    fetch(`${baseUrl}/docs/docs.css`)
  ]);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /data-markdown/);
  assert.match(html, /data-doc-language="zh"/);
  assert.match(html, /class="nav-menu docs-nav-menu"/);
  assert.match(html, /href="\.\/usage\.zh-CN\.md"/);
  assert.match(chinese.headers.get('content-type'), /^text\/markdown/);
  assert.match(await chinese.text(), /官网中的“交互演示”只展示审查步骤/);
  assert.match(await english.text(), /interactive demo on the website only illustrates/);
  assert.match(await script.text(), /usage\.zh-CN\.md/);
  assert.match(styles.headers.get('content-type'), /^text\/css/);
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
