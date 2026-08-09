import { spawnSync } from 'node:child_process';

export const DEFAULT_SOURCE = 'Vac-le/auto-code-review';
const PLATFORMS = new Set(['all', 'codex', 'claude']);
const SCOPES = new Set(['user', 'project', 'local']);

export function parseArgs(argv) {
  const options = { platform: 'all', scope: 'user', source: DEFAULT_SOURCE, dryRun: false, local: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--dry-run') options.dryRun = true;
    else if (token === '--local') {
      options.local = true;
      options.source = '.';
    }
    else if (token === '--platform' || token === '--scope') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${token} requires a value`);
      options[token.slice(2)] = value;
      index += 1;
    } else if (token === '--help' || token === '-h') options.help = true;
    else throw new Error(`Unknown option: ${token}`);
  }
  if (!PLATFORMS.has(options.platform)) throw new Error('--platform must be all, codex, or claude');
  if (!SCOPES.has(options.scope)) throw new Error('--scope must be user, project, or local');
  return options;
}

export function buildPlan({ platform, scope, source }) {
  const plan = [];
  if (platform === 'all' || platform === 'codex') {
    plan.push({ host: 'codex', args: ['plugin', 'marketplace', 'add', source] });
    plan.push({ host: 'codex', args: ['plugin', 'add', 'auto-code-review@auto-code-review'] });
  }
  if (platform === 'all' || platform === 'claude') {
    const claudeSource = source === '.' ? './' : source;
    plan.push({ host: 'claude', args: ['plugin', 'marketplace', 'add', claudeSource, '--scope', scope] });
    plan.push({ host: 'claude', args: ['plugin', 'install', 'auto-code-review@auto-code-review', '--scope', scope] });
  }
  return plan;
}

function executable(host, platform = process.platform) {
  return platform === 'win32' ? `${host}.cmd` : host;
}

function windowsInvocation(command, args) {
  const tokens = [command, ...args];
  if (tokens.some((token) => !/^[A-Za-z0-9@._/:\\-]+$/.test(token))) {
    throw new Error('Installer refused an unsafe Windows command token');
  }
  return { command: tokens.join(' '), args: [] };
}

function isIdempotentSuccess(step, output) {
  if (step.args[1] === 'marketplace') return false;
  return /already (?:added|exists|installed|configured)|is already/i.test(output);
}

function isMissingHost(result, output, platform) {
  if (result.error?.code === 'ENOENT') return true;
  return platform === 'win32' && /not recognized as an internal or external command|不是内部或外部命令|无法将.+识别为/i.test(output);
}

function defaultHostExists(command, platform) {
  if (platform !== 'win32') return true;
  const result = spawnSync('where.exe', [command], {
    encoding: 'utf8', shell: false, windowsHide: true
  });
  return result.status === 0;
}

export function runPlan(plan, {
  dryRun = false,
  spawn = spawnSync,
  runtimePlatform = process.platform,
  allowMissingHosts = false,
  hostExists = defaultHostExists
} = {}) {
  const results = [];
  const missingHosts = new Set();
  for (const step of plan) {
    const command = executable(step.host, runtimePlatform);
    if (dryRun) {
      results.push({ ...step, command, status: 'planned' });
      continue;
    }
    if (missingHosts.has(step.host)) {
      results.push({ ...step, command, status: 'skipped-missing' });
      continue;
    }
    if (runtimePlatform === 'win32' && !hostExists(command, runtimePlatform)) {
      if (allowMissingHosts) {
        missingHosts.add(step.host);
        results.push({ ...step, command, status: 'skipped-missing' });
        continue;
      }
      throw new Error(`${step.host} is not installed or is not on PATH`);
    }
    const invocation = runtimePlatform === 'win32'
      ? windowsInvocation(command, step.args)
      : { command, args: step.args };
    const result = spawn(invocation.command, invocation.args, {
      encoding: 'utf8',
      shell: runtimePlatform === 'win32',
      windowsHide: true
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    if (isMissingHost(result, output, runtimePlatform)) {
      if (allowMissingHosts) {
        missingHosts.add(step.host);
        results.push({ ...step, command, status: 'skipped-missing' });
        continue;
      }
      throw new Error(`${step.host} is not installed or is not on PATH`);
    }
    if (result.status !== 0 && !isIdempotentSuccess(step, output)) {
      throw new Error(`${step.host} command failed (${result.status ?? 'unknown'}): ${output || 'no output'}`);
    }
    results.push({ ...step, command, status: result.status === 0 ? 'installed' : 'already-installed', output });
  }
  return results;
}

export function formatCommand(step) {
  return [step.command, ...step.args].map((part) => /\s/.test(part) ? JSON.stringify(part) : part).join(' ');
}
