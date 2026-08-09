import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlan, parseArgs, runPlan } from '../src/install.mjs';

test('defaults to both platforms without an API key or gateway', () => {
  const options = parseArgs([]);
  assert.deepEqual(options, {
    platform: 'all', scope: 'user', source: 'Vac-le/auto-code-review', dryRun: false, local: false
  });
  const plan = buildPlan(options);
  assert.equal(plan.length, 4);
  assert.equal(plan.some((step) => step.args.some((arg) => /api[-_]?key|gateway/i.test(arg))), false);
});

test('local mode installs from the current cloned repository', () => {
  const options = parseArgs(['--local', '--platform', 'codex']);
  assert.equal(options.source, '.');
  assert.equal(options.local, true);
  assert.deepEqual(buildPlan(options)[0].args, ['plugin', 'marketplace', 'add', '.']);
});

test('local Claude source uses an explicitly relative path', () => {
  const plan = buildPlan(parseArgs(['--local', '--platform', 'claude']));
  assert.deepEqual(plan[0].args, ['plugin', 'marketplace', 'add', './', '--scope', 'user']);
});

test('builds a scoped Claude-only plan', () => {
  const options = parseArgs(['--platform', 'claude', '--scope', 'project']);
  assert.deepEqual(buildPlan(options), [
    { host: 'claude', args: ['plugin', 'marketplace', 'add', 'Vac-le/auto-code-review', '--scope', 'project'] },
    { host: 'claude', args: ['plugin', 'install', 'auto-code-review@auto-code-review', '--scope', 'project'] }
  ]);
});

test('rejects unknown options and invalid enum values', () => {
  assert.throws(() => parseArgs(['--platform', 'other']), /platform/);
  assert.throws(() => parseArgs(['--scope']), /requires a value/);
  assert.throws(() => parseArgs(['--yes']), /Unknown option/);
});

test('dry run never launches a child process', () => {
  let calls = 0;
  const result = runPlan(buildPlan(parseArgs(['--platform', 'codex'])), {
    dryRun: true,
    spawn: () => { calls += 1; }
  });
  assert.equal(calls, 0);
  assert.deepEqual(result.map((item) => item.status), ['planned', 'planned']);
});

test('reports missing hosts and failed commands', () => {
  const plan = [{ host: 'codex', args: ['plugin', 'add', 'x'] }];
  assert.throws(() => runPlan(plan, { runtimePlatform: 'linux', spawn: () => ({ error: { code: 'ENOENT' } }) }), /not installed/);
  assert.throws(() => runPlan(plan, { runtimePlatform: 'linux', spawn: () => ({ status: 2, stderr: 'denied' }) }), /denied/);
});

test('all-platform mode skips a missing host and continues', () => {
  const plan = buildPlan(parseArgs([]));
  const calls = [];
  const result = runPlan(plan, {
    runtimePlatform: 'linux',
    allowMissingHosts: true,
    spawn: (command) => {
      calls.push(command);
      return command.startsWith('codex') ? { error: { code: 'ENOENT' } } : { status: 0 };
    }
  });
  assert.deepEqual(result.map((item) => item.status), [
    'skipped-missing', 'skipped-missing', 'installed', 'installed'
  ]);
  assert.equal(calls.length, 3);
});

test('detects a missing Windows command wrapper', () => {
  const plan = buildPlan(parseArgs(['--platform', 'codex']));
  const result = runPlan(plan, {
    runtimePlatform: 'win32',
    allowMissingHosts: true,
    hostExists: () => false,
    spawn: () => { throw new Error('missing commands must not be spawned'); }
  });
  assert.deepEqual(result.map((item) => item.status), ['skipped-missing', 'skipped-missing']);
});

test('treats already-installed responses as idempotent success', () => {
  const plan = [{ host: 'claude', args: ['plugin', 'install', 'x'] }];
  const result = runPlan(plan, { runtimePlatform: 'linux', spawn: () => ({ status: 1, stderr: 'Plugin is already installed' }) });
  assert.equal(result[0].status, 'already-installed');
});

test('fails closed when a marketplace name already exists', () => {
  const plan = [{ host: 'codex', args: ['plugin', 'marketplace', 'add', 'Vac-le/auto-code-review'] }];
  assert.throws(
    () => runPlan(plan, { runtimePlatform: 'linux', spawn: () => ({ status: 1, stderr: 'Marketplace already exists' }) }),
    /already exists/
  );
});

test('uses the Windows command shell only for fixed allowlisted commands', () => {
  const calls = [];
  runPlan(buildPlan(parseArgs(['--platform', 'codex'])), {
    runtimePlatform: 'win32',
    hostExists: () => true,
    spawn: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0 };
    }
  });
  assert.equal(calls[0].command, 'codex.cmd plugin marketplace add Vac-le/auto-code-review');
  assert.deepEqual(calls[0].args, []);
  assert.equal(calls[0].options.shell, true);
  assert.equal(calls.every((call) => !/[&|<>^%\r\n]/.test(call.command)), true);
});
