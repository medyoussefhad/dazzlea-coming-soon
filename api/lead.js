// Public endpoint: website forms post leads here (email gate, newsletter, contact form).
// GET → storage health check (no data returned).
const { send } = require('./_lib');
const { addLead, health } = require('./_store');

const SOURCES = new Set(['gate', 'newsletter', 'contact']);
const hits = new Map(); // ip -> [timestamps]  (best effort, per warm instance)
const cut = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try { return send(res, 200, await health()); } catch (e) { return send(res, 503, { ok: false, error: 'storage unavailable' }); }
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60e3);
  if (recent.length >= 15) return send(res, 429, { error: 'Too many requests' });
  recent.push(now); hits.set(ip, recent);

  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body || '{}'); } catch { return send(res, 400, { error: 'Bad JSON' }); }
  body = body || {};
  if (body._gotcha) return send(res, 200, { ok: true }); // honeypot

  const source = String(body.source || '');
  const email = cut(body.email, 160).toLowerCase();
  if (!SOURCES.has(source)) return send(res, 400, { error: 'Unknown source' });
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return send(res, 400, { error: 'Invalid email' });

  const lead = {
    source, email,
    name: cut(body.name, 120), phone: cut(body.phone, 40), company: cut(body.company, 160),
    profile: cut(body.profile, 60), service: cut(body.service, 80), message: cut(body.message, 4000),
    page: cut(body.page, 200), language: body.language === 'fr' ? 'fr' : 'en',
    domain: email.split('@')[1],
  };
  try {
    await addLead(lead);
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error('lead store failed', e && e.message);
    return send(res, 503, { error: 'Could not save' });
  }
};
