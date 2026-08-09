import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const broker = resolve(root, 'integrations', 'claude', 'bin', 'auto-code-review-git');

function run(program, args, cwd, options = {}) {
  return spawnSync(program, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    ...options
  });
}

function fixture() {
  const directory = mkdtempSync(resolve(tmpdir(), 'acr-broker-'));
  assert.equal(run('git', ['init', '-b', 'main'], directory).status, 0);
  writeFileSync(resolve(directory, 'example.js'), 'export const value = 1;\n');
  assert.equal(run('git', ['add', '.'], directory).status, 0);
  assert.equal(run('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'baseline'], directory).status, 0);
  writeFileSync(resolve(directory, 'example.js'), 'export const value = 2;\n');
  return directory;
}

test('Claude Git broker exposes the working diff through fixed read-only operations', () => {
  const directory = fixture();
  const status = run(process.execPath, [broker, 'status'], directory);
  const diff = run(process.execPath, [broker, 'diff'], directory);
  assert.equal(status.status, 0, status.stderr);
  assert.match(status.stdout, /example\.js/);
  assert.equal(diff.status, 0, diff.stderr);
  assert.match(diff.stdout, /export const value = 2/);
});

test('Claude Git broker rejects mutating flags and output redirection', () => {
  const directory = fixture();
  const mutation = run(process.execPath, [broker, 'show', '--output=stolen.txt'], directory);
  assert.notEqual(mutation.status, 0);
  assert.equal(run('git', ['branch', '--show-current'], directory).stdout.trim(), 'main');

  const redirectedPath = resolve(directory, 'redirected.txt');
  const descriptor = openSync(redirectedPath, 'w');
  const redirected = spawnSync(process.execPath, [broker, 'status'], {
    cwd: directory,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    stdio: ['ignore', descriptor, 'pipe']
  });
  closeSync(descriptor);
  assert.notEqual(redirected.status, 0);
  assert.equal(readFileSync(redirectedPath, 'utf8'), '');
});
