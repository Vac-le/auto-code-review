import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const broker = fileURLToPath(new URL('../bin/auto-code-review-git', import.meta.url));
const MAX_OUTPUT = 32 * 1024 * 1024;

const tools = [
  {
    name: 'git_status',
    description: 'Read the current repository status without changing Git state.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} }
  },
  {
    name: 'git_diff',
    description: 'Read a working-tree, staged, or merge-base Git diff through the hardened read-only broker.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        staged: { type: 'boolean' },
        base: { type: 'string', minLength: 1, maxLength: 512 },
        paths: { type: 'array', maxItems: 100, items: { type: 'string', minLength: 1, maxLength: 4096 } }
      }
    }
  },
  {
    name: 'git_show',
    description: 'Read one commit and its patch without executing repository configuration.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['ref'],
      properties: { ref: { type: 'string', minLength: 1, maxLength: 512 } }
    }
  },
  {
    name: 'default_branch',
    description: 'Resolve the repository default branch from local refs only.',
    inputSchema: { type: 'object', additionalProperties: false, properties: {} }
  },
  {
    name: 'pr_view',
    description: 'Read bounded pull-request metadata through a fixed gh command.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['target'],
      properties: { target: { type: 'string', minLength: 1, maxLength: 512 } }
    }
  },
  {
    name: 'pr_diff',
    description: 'Read a pull-request diff through a fixed gh command.',
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['target'],
      properties: { target: { type: 'string', minLength: 1, maxLength: 512 } }
    }
  }
];

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function safeString(value, label) {
  if (typeof value !== 'string' || !value || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function brokerArgs(name, input) {
  const value = asObject(input);
  if (name === 'git_status') return ['status'];
  if (name === 'default_branch') return ['default-branch'];
  if (name === 'git_show') return ['show', safeString(value.ref, 'revision')];
  if (name === 'pr_view' || name === 'pr_diff') {
    return ['pr', name === 'pr_view' ? 'view' : 'diff', safeString(value.target, 'pull request')];
  }
  if (name === 'git_diff') {
    if (value.staged === true && value.base !== undefined) throw new Error('staged and base are mutually exclusive');
    const args = ['diff'];
    if (value.staged === true) args.push('--staged');
    if (value.base !== undefined) args.push('--base', safeString(value.base, 'base revision'));
    if (value.paths !== undefined) {
      if (!Array.isArray(value.paths) || value.paths.length > 100) throw new Error('Invalid paths');
      args.push('--', ...value.paths.map((path) => safeString(path, 'path')));
    }
    return args;
  }
  throw new Error(`Unknown tool: ${name}`);
}

function runBroker(args, cwd) {
  const result = spawnSync(process.execPath, [broker, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: MAX_OUTPUT,
    shell: false,
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `broker exited ${result.status}`).trim());
  return result.stdout;
}

export function handleRequest(message, cwd = process.cwd()) {
  if (!message || message.jsonrpc !== '2.0') throw new Error('Invalid JSON-RPC request');
  if (message.method === 'initialize') {
    return {
      protocolVersion: message.params?.protocolVersion ?? '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'auto-code-review', version: '0.2.5' }
    };
  }
  if (message.method === 'ping') return {};
  if (message.method === 'tools/list') return { tools };
  if (message.method === 'tools/call') {
    try {
      const name = safeString(message.params?.name, 'tool name');
      const text = runBroker(brokerArgs(name, message.params?.arguments), cwd);
      return { content: [{ type: 'text', text }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
    }
  }
  throw new Error(`Unsupported method: ${message.method}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function start() {
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    for (;;) {
      const newline = buffer.indexOf('\n');
      if (newline < 0) break;
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      let request;
      try {
        request = JSON.parse(line);
        if (request.id === undefined) continue;
        send({ jsonrpc: '2.0', id: request.id, result: handleRequest(request) });
      } catch (error) {
        send({
          jsonrpc: '2.0', id: request?.id ?? null,
          error: { code: -32603, message: error instanceof Error ? error.message : String(error) }
        });
      }
    }
  });
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entry === import.meta.url) start();
