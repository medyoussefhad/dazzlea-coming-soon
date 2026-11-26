// Public: the client area page asks here for "its" documents, using the secret key from its link.
const { send } = require('./_lib');
const P = require('./_portal');

const misses = new Map(); // ip -> [timestamps] of invalid keys (slows down guessing)

module.exports = async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const recent = (misses.get(ip) || []).filter((t) => Date.now() - t < 15 * 60e3);
  if (recent.length >= 20) return send(res, 429, { error: 'Too many attempts' });

  const key = new URL(req.url, 'http://x').searchParams.get('k') || '';
  try {
    const client = await P.clientByKey(key);
    if (!client || !client.active) {
      recent.push(Date.now()); misses.set(ip, recent);
      return send(res, 404, { error: 'invalid' });
    }
    const docs = (await P.listDocs()).filter((d) => P.visibleTo(d, client)).map((d) => ({
      id: d.id, title: d.title, description: d.description, category: d.category, size: d.size, contentType: d.contentType,
      filename: d.filename, date: d.updatedAt || d.createdAt, personal: d.audience === 'clients',
    }));
    P.touchVisit(client).catch(() => {});
    P.logEvent({ type: 'visit', clientId: client.id, clientName: client.name });
    return send(res, 200, { client: { name: client.name, note: client.note || '' }, docs });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'unavailable' });
  }
};
