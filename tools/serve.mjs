// Offline launcher: serves dist/ on localhost (no network needed) and opens the default browser.
// Usage: npm run play   (builds first)   |   node tools/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { exec } from 'node:child_process';
const root = new URL('../dist/', import.meta.url).pathname;
const port = Number(process.argv[2] ?? 4173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.md': 'text/markdown' };
createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let p = normalize(join(root, url));
    if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
    if ((await stat(p).catch(() => null))?.isDirectory()) p = join(p, 'index.html');
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}/`;
  console.log(`Bells of the Unlived — ${url}`);
  const open = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  if (!process.env.NO_OPEN) exec(open, () => {});
});
