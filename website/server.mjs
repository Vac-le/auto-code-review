import { createServer } from 'node:http';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const requestedPort = Number.parseInt(process.env.AUTO_CODE_REVIEW_SITE_PORT ?? '4173', 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536 ? requestedPort : 4173;
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png']
]);
const MAX_STATIC_BYTES = 2 * 1024 * 1024;

function isInsideRoot(path) {
  return path.startsWith(`${root}${sep}`);
}

function safePath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  const candidate = resolve(root, `.${decoded === '/' ? '/index.html' : decoded}`);
  return candidate === root || isInsideRoot(candidate) ? candidate : null;
}

export const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  const path = safePath(url.pathname);
  if (!path) {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Not a regular file');
    if (info.size > MAX_STATIC_BYTES) {
      response.writeHead(413, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('File too large');
      return;
    }
    const canonical = await realpath(path);
    if (!isInsideRoot(canonical)) throw new Error('File resolves outside the website root');
    const body = await readFile(path);
    response.writeHead(200, {
      'content-type': contentTypes.get(extname(path)) ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'",
      'referrer-policy': 'no-referrer'
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`Auto Code Review site: http://127.0.0.1:${port}`);
  });
}
