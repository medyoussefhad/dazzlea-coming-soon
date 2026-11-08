// Shared helpers for the admin API (Vercel Node functions). Files starting with "_" are not exposed as routes.
//
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   ADMIN_PASSWORD   password for /admin
//   GITHUB_TOKEN     fine-grained token with "Contents: Read and write" on the site repository
// Optional:
//   GITHUB_REPO      default "medyoussefhad/dazzlea-coming-soon"
//   GITHUB_BRANCH    default "main"
//   SESSION_SECRET   signs the login cookie (defaults to a value derived from the two secrets above)
// Local development: CMS_LOCAL=1 reads/writes files on disk instead of GitHub.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const env = (k, d = '') => process.env[k] || d;
const REPO = () => env('GITHUB_REPO', 'medyoussefhad/dazzlea-coming-soon');
const BRANCH = () => env('GITHUB_BRANCH', 'main');
const LOCAL = () => env('CMS_LOCAL') === '1';
const COOKIE = 'dz_admin';
const SESSION_HOURS = 12;

const CONTENT_FILES = { work: 'content/work.json', insights: 'content/insights.json', site: 'content/site.json' };

function secret() {
  return env('SESSION_SECRET') || crypto.createHash('sha256').update('dz|' + env('ADMIN_PASSWORD') + '|' + env('GITHUB_TOKEN')).digest('hex');
}
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function signToken(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', secret()).update(body).digest());
  return body + '.' + sig;
}
function verifyToken(tok) {
  if (!tok || !tok.includes('.')) return null;
  const [body, sig] = tok.split('.');
  const exp = b64url(crypto.createHmac('sha256', secret()).update(body).digest());
  const a = Buffer.from(sig), b = Buffer.from(exp);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((c) => { const i = c.indexOf('='); if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); });
  return out;
}
function setSession(res, on) {
  const secure = LOCAL() ? '' : '; Secure';
  res.setHeader('Set-Cookie', on
    ? `${COOKIE}=${signToken({ exp: Date.now() + SESSION_HOURS * 3600e3 })}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure}`
    : `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}
function passwordOk(pw) {
  const real = env('ADMIN_PASSWORD');
  if (!real || typeof pw !== 'string') return false;
  const a = crypto.createHash('sha256').update(pw).digest(), b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}
function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}
/** Guards a handler: session cookie + same-origin JSON request (CSRF). */
function requireAuth(req, res) {
  if (!verifyToken(cookies(req)[COOKIE])) { send(res, 401, { error: 'Not signed in' }); return false; }
  if (req.method !== 'GET' && req.headers['x-dz-admin'] !== '1') { send(res, 403, { error: 'Bad request' }); return false; }
  return true;
}
function configError() {
  if (!env('ADMIN_PASSWORD')) return 'ADMIN_PASSWORD is not set in Vercel environment variables.';
  if (!LOCAL() && !env('GITHUB_TOKEN')) return 'GITHUB_TOKEN is not set in Vercel environment variables.';
  return null;
}

// ---------------------------------------------------------------- storage (GitHub or local disk)
async function gh(pathname, opts = {}) {
  const r = await fetch(`https://api.github.com${pathname}`, {
    ...opts,
    headers: { Authorization: `Bearer ${env('GITHUB_TOKEN')}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'dazzlea-admin', ...(opts.headers || {}) },
  });
  const text = await r.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!r.ok) { const e = new Error(data.message || `GitHub error ${r.status}`); e.status = r.status; throw e; }
  return data;
}
const ROOT = path.resolve(__dirname, '..');

async function readFile(rel) {
  if (LOCAL()) {
    const buf = fs.readFileSync(path.join(ROOT, rel));
    return { text: buf.toString('utf8'), sha: crypto.createHash('sha1').update(buf).digest('hex') };
  }
  const d = await gh(`/repos/${REPO()}/contents/${encodeURI(rel)}?ref=${encodeURIComponent(BRANCH())}`);
  return { text: Buffer.from(d.content, 'base64').toString('utf8'), sha: d.sha };
}
async function writeFile(rel, buffer, sha, message) {
  if (LOCAL()) {
    const p = path.join(ROOT, rel);
    if (sha && fs.existsSync(p)) {
      const cur = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
      if (cur !== sha) { const e = new Error('conflict'); e.status = 409; throw e; }
    }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, buffer);
    return { sha: crypto.createHash('sha1').update(buffer).digest('hex'), commit: 'local' };
  }
  const d = await gh(`/repos/${REPO()}/contents/${encodeURI(rel)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: Buffer.from(buffer).toString('base64'), branch: BRANCH(), ...(sha ? { sha } : {}) }),
  });
  return { sha: d.content.sha, commit: d.commit.sha };
}
async function deployStatus(commit) {
  if (LOCAL()) return { state: 'success', description: 'Local mode — run the build to preview' };
  const ref = commit || BRANCH();
  const d = await gh(`/repos/${REPO()}/commits/${encodeURIComponent(ref)}/status`);
  const v = (d.statuses || []).find((s) => /vercel/i.test(s.context)) || d.statuses?.[0];
  return { state: v ? v.state : 'pending', description: v ? v.description : 'Waiting for Vercel…', url: v ? v.target_url : null };
}

module.exports = { CONTENT_FILES, send, requireAuth, setSession, passwordOk, configError, readFile, writeFile, deployStatus, verifyToken, cookies, COOKIE };
