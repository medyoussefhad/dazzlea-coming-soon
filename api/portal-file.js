// Public: opens one document for a client — checks the secret key, then redirects to a private link valid for 10 minutes.
const { send } = require('./_lib');
const P = require('./_portal');

module.exports = async (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const url = new URL(req.url, 'http://x');
  const key = url.searchParams.get('k') || '';
  const id = url.searchParams.get('id') || '';
  try {
    const client = await P.clientByKey(key);
    if (!client || !client.active) return send(res, 404, { error: 'invalid' });
    const doc = (await P.listDocs()).find((d) => d.id === id);
    if (!doc || !P.visibleTo(doc, client)) return send(res, 404, { error: 'not found' });
    const link = await P.signedFileUrl(doc, 10);
    P.countDownload(doc).catch(() => {});
    P.logEvent({ type: 'open', clientId: client.id, clientName: client.name, docId: doc.id, docTitle: (doc.title && (doc.title.fr || doc.title.en)) || doc.filename });
    if (!link) return send(res, 200, { ok: true, local: true, note: 'Local mode: file storage is only available online.' });
    res.statusCode = 302;
    res.setHeader('Location', link);
    return res.end();
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'unavailable' });
  }
};
