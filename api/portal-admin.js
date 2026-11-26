// Admin-only: manage client-area clients, documents and activity.
const { send, requireAuth } = require('./_lib');
const P = require('./_portal');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const [clients, docs, events] = await Promise.all([P.listClients(), P.listDocs(), P.recentEvents(150)]);
      return send(res, 200, { clients, docs, events, storage: P.local() ? 'local' : (P.blobConfigured() ? 'blob' : 'missing'), categories: P.CATEGORIES });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const ok = (data) => send(res, 200, { ok: true, ...data });
    switch (b.action) {
      case 'createClient':
        if (!String(b.name || '').trim()) return send(res, 400, { error: 'The client name is required' });
        return ok({ client: await P.createClient({ name: b.name.trim(), note: b.note }) });
      case 'updateClient': {
        const c = await P.updateClient(String(b.id), b);
        return c ? ok({ client: c }) : send(res, 404, { error: 'Client not found' });
      }
      case 'deleteClient':
        return (await P.deleteClient(String(b.id))) ? ok({}) : send(res, 404, { error: 'Client not found' });
      case 'createDoc':
        return ok({ doc: await P.createDoc(b) });
      case 'updateDoc': {
        const d = await P.updateDoc(String(b.id), b);
        return d ? ok({ doc: d }) : send(res, 404, { error: 'Document not found' });
      }
      case 'deleteDoc':
        return (await P.deleteDoc(String(b.id))) ? ok({}) : send(res, 404, { error: 'Document not found' });
      default:
        return send(res, 400, { error: 'Unknown action' });
    }
  } catch (e) {
    console.error(e);
    return send(res, e.status || 500, { error: e.status ? e.message : 'The client area database is not reachable right now.' });
  }
};
