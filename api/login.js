const { send, setSession, passwordOk, configError, verifyToken, cookies, COOKIE } = require('./_lib');

const failures = new Map(); // ip -> { n, until }  (best effort, per warm instance)

module.exports = async (req, res) => {
  if (req.method === 'GET') return send(res, 200, { signedIn: !!verifyToken(cookies(req)[COOKIE]), configError: configError() });
  if (req.method === 'DELETE') { setSession(res, false); return send(res, 200, { ok: true }); }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (req.headers['x-dz-admin'] !== '1') return send(res, 403, { error: 'Bad request' });

  const cfg = configError();
  if (cfg) return send(res, 500, { error: cfg });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const f = failures.get(ip);
  if (f && f.until > Date.now()) return send(res, 429, { error: 'Too many attempts. Try again in a few minutes.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (!passwordOk(body.password)) {
    const n = (f?.n || 0) + 1;
    failures.set(ip, { n, until: n >= 5 ? Date.now() + 10 * 60e3 : 0 });
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: 'Wrong password' });
  }
  failures.delete(ip);
  setSession(res, true);
  return send(res, 200, { ok: true });
};
