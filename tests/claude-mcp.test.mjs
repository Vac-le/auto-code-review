import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { handleRequest } from '../integrations/claude/mcp/git-server.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'auto-code-review-mcp-'));
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false });
  assert.equal(git('init').status, 0);
  writeFileSync(join(root, 'sample.js'), 'export const value = 1;\n');
  assert.equal(git('add', 'sample.js').status, 0);
  assert.equal(git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'initial').status, 0);
  writeFileSync(join(root, 'sample.js'), 'export const value = 2;\n');
  return root;
}

test('Claude MCP server exposes only typed read tools and returns a diff', () => {
  const root = fixture();
  const listed = handleRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, root);
  assert.deepEqual(listed.tools.map((tool) => tool.name), ['git_status', 'git_diff', 'git_show', 'default_branch', 'pr_view', 'pr_diff']);
  const result = handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'git_diff', arguments: {} } }, root);
  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /value = 2/);
});

test('Claude MCP arguments cannot invoke a shell', () => {
  const root = fixture();
  const marker = join(root, 'must-not-exist');
  const result = handleRequest({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'git_diff', arguments: { paths: [`$(echo unsafe>${marker})`] } },
  }, root);
  assert.equal(result.isError, undefined);
  assert.equal(existsSync(marker), false);
});
