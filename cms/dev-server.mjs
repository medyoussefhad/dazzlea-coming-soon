// Local preview of the production setup: serves dist/ like Vercel (clean URLs) and runs /api/* functions.
// Content edits from /admin are written to content/*.json (CMS_LOCAL=1) and the site is rebuilt.
//   ADMIN_PASSWORD=test node cms/dev-server.mjs   → http://localhost:3000
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 3000);
process.env.CMS_LOCAL = '1';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dazzlea-local';
const require = createRequire(import.meta.url);

const build = () => { try { execFileSync(process.execPath, [path.join(ROOT, 'cms/build.mjs')], { stdio: 'inherit' }); } catch (e) { console.error('build failed'); } };
build();

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };

function serveFile(res, file, status = 200) {
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
    const file = path.join(ROOT, 'api', name + '.js');
    if (!fs.existsSync(file) || name.startsWith('_')) { res.writeHead(404); return res.end(); }
    let raw = ''; for await (const c of req) raw += c;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
    delete require.cache[file];
    const origEnd = res.end.bind(res);
    res.end = (...a) => { origEnd(...a); if (req.method !== 'GET' && /content|upload/.test(name) && res.statusCode === 200) build(); };
    return require(file)(req, res);
  }
  // uploads land in the project root until the next build copies them; serve them directly
  let p = decodeURIComponent(url.pathname);
  const candidates = [];
  if (p === '/admin' || p === '/admin/') p = '/admin/index.html';
  if (p.startsWith('/admin/')) candidates.push(path.join(ROOT, p)); // live-edit the admin without rebuilding
  const base = path.join(DIST, p);
  if (p.endsWith('/')) candidates.push(path.join(base, 'index.html'));
  candidates.push(base, base + '.html', path.join(base, 'index.html'), path.join(ROOT, p));
  for (const c of candidates) {
    if (c.startsWith(DIST) || c.startsWith(path.join(ROOT, 'assets')) || c.startsWith(path.join(ROOT, 'admin'))) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return serveFile(res, c);
    }
  }
  serveFile(res, path.join(DIST, '404.html'), 404);
}).listen(PORT, () => console.log(`Dazzlea dev → http://localhost:${PORT}  (admin password: ${process.env.ADMIN_PASSWORD})`));
