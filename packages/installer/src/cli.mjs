#!/usr/bin/env node
import { buildPlan, formatCommand, parseArgs, runPlan } from './install.mjs';

const HELP = `Auto Code Review installer

Usage:
  npx @auto-code-review/install [options]

Options:
  --platform all|codex|claude  Host to configure (default: all)
  --scope user|project|local   Claude installation scope (default: user)
  --local                      Register the current cloned repository
  --dry-run                    Print commands without changing host config
  -h, --help                   Show this help
`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
  } else {
    const results = runPlan(buildPlan(options), {
      dryRun: options.dryRun,
      allowMissingHosts: options.platform === 'all'
    });
    if (!options.dryRun && results.every((result) => result.status === 'skipped-missing')) {
      throw new Error('Neither Codex nor Claude Code is installed or available on PATH');
    }
    for (const result of results) {
      const marker = result.status === 'planned' ? 'PLAN'
        : result.status === 'already-installed' ? 'OK'
          : result.status === 'skipped-missing' ? 'SKIP'
            : 'DONE';
      process.stdout.write(`[${marker}] ${formatCommand(result)}\n`);
    }
    if (!options.dryRun) process.stdout.write('Auto Code Review is ready. Start a fresh agent session before reviewing.\n');
  }
} catch (error) {
  process.stderr.write(`Install failed: ${error.message}\n`);
  process.exitCode = 1;
}
