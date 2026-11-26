// Client area ("Espace client"): private brochures & sales presentations, reachable only through a secret link per client.
// Metadata: MongoDB collections portal_clients / portal_docs / portal_events (local dev: .data/portal.json)
// Files:    private Vercel Blob store (BLOB_STORE_ID via OIDC, or BLOB_READ_WRITE_TOKEN) under the "portal/" prefix.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getDb, useMongo } = require('./_store');

const LOCAL_FILE = path.resolve(__dirname, '..', '.data', 'portal.json');
const local = () => process.env.CMS_LOCAL === '1' && !useMongo();
const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();
const newKey = () => crypto.randomBytes(18).toString('base64url'); // 24 chars, ~144 bits — unguessable

const CATEGORIES = ['brochure', 'presentation', 'case-study', 'offer', 'other'];

// ---------------------------------------------------------------- storage helpers
function readLocal() { try { return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); } catch { return { clients: [], docs: [], events: [] }; } }
function writeLocal(d) { fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true }); fs.writeFileSync(LOCAL_FILE, JSON.stringify(d, null, 2)); }

async function cols() {
  const db = await getDb();
  const c = { clients: db.collection('portal_clients'), docs: db.collection('portal_docs'), events: db.collection('portal_events') };
  if (!cols._indexed) {
    cols._indexed = true;
    c.clients.createIndex({ key: 1 }, { unique: true }).catch(() => {});
    c.clients.createIndex({ id: 1 }, { unique: true }).catch(() => {});
    c.docs.createIndex({ id: 1 }, { unique: true }).catch(() => {});
    c.events.createIndex({ at: -1 }).catch(() => {});
  }
  return c;
}
const strip = (d) => { if (!d) return d; const { _id, ...r } = d; return r; };

// ---------------------------------------------------------------- clients
async function listClients() {
  if (local()) return readLocal().clients;
  return (await (await cols()).clients.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray());
}
async function createClient({ name, note }) {
  const c = { id: newId(), key: newKey(), name: String(name).slice(0, 120), note: String(note || '').slice(0, 600), active: true, createdAt: now(), visits: 0, lastVisitAt: null };
  if (local()) { const d = readLocal(); d.clients.unshift(c); writeLocal(d); return c; }
  await (await cols()).clients.insertOne({ ...c });
  return c;
}
async function updateClient(id, patch) {
  const allowed = {};
  if (patch.name !== undefined) allowed.name = String(patch.name).slice(0, 120);
  if (patch.note !== undefined) allowed.note = String(patch.note).slice(0, 600);
  if (patch.active !== undefined) allowed.active = !!patch.active;
  if (patch.regenerate) allowed.key = newKey();
  allowed.updatedAt = now();
  if (local()) { const d = readLocal(); const c = d.clients.find((x) => x.id === id); if (!c) return null; Object.assign(c, allowed); writeLocal(d); return c; }
  const r = await (await cols()).clients.findOneAndUpdate({ id }, { $set: allowed }, { returnDocument: 'after', projection: { _id: 0 } });
  return r && (r.value !== undefined ? r.value : r);
}
async function deleteClient(id) {
  if (local()) { const d = readLocal(); d.clients = d.clients.filter((x) => x.id !== id); d.docs.forEach((doc) => { doc.clientIds = (doc.clientIds || []).filter((c) => c !== id); }); writeLocal(d); return true; }
  const c = await cols();
  await c.docs.updateMany({ clientIds: id }, { $pull: { clientIds: id } });
  return (await c.clients.deleteOne({ id })).deletedCount > 0;
}
async function clientByKey(key) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(key || '')) return null;
  if (local()) return readLocal().clients.find((c) => c.key === key) || null;
  return strip(await (await cols()).clients.findOne({ key }));
}

// ---------------------------------------------------------------- documents
function cleanDoc(input, existing = {}) {
  const t = (o, n) => ({ fr: String((o && o.fr) || '').slice(0, n), en: String((o && o.en) || '').slice(0, n) });
  const out = { ...existing };
  if (input.title !== undefined) out.title = t(input.title, 160);
  if (input.description !== undefined) out.description = t(input.description, 600);
  if (input.category !== undefined) out.category = CATEGORIES.includes(input.category) ? input.category : 'other';
  if (input.audience !== undefined) out.audience = input.audience === 'clients' ? 'clients' : 'all';
  if (input.clientIds !== undefined) out.clientIds = Array.isArray(input.clientIds) ? input.clientIds.map(String).slice(0, 500) : [];
  if (input.order !== undefined) out.order = Number(input.order) || 0;
  return out;
}
async function listDocs() {
  if (local()) return readLocal().docs;
  return (await (await cols()).docs.find({}, { projection: { _id: 0 } }).sort({ order: 1, createdAt: -1 }).toArray());
}
async function createDoc(input) {
  if (!/^portal\//.test(input.pathname || '')) throw Object.assign(new Error('Invalid file'), { status: 400 });
  const doc = cleanDoc(input, {
    id: newId(), pathname: input.pathname, filename: String(input.filename || '').slice(0, 200), size: Number(input.size) || 0,
    contentType: String(input.contentType || '').slice(0, 120), createdAt: now(), downloads: 0, audience: 'all', clientIds: [], order: 0,
  });
  if (local()) { const d = readLocal(); d.docs.unshift(doc); writeLocal(d); return doc; }
  await (await cols()).docs.insertOne({ ...doc });
  return doc;
}
async function updateDoc(id, input) {
  if (local()) { const d = readLocal(); const i = d.docs.findIndex((x) => x.id === id); if (i < 0) return null; d.docs[i] = cleanDoc(input, d.docs[i]); d.docs[i].updatedAt = now(); writeLocal(d); return d.docs[i]; }
  const c = await cols();
  const cur = strip(await c.docs.findOne({ id }));
  if (!cur) return null;
  const next = { ...cleanDoc(input, cur), updatedAt: now() };
  await c.docs.replaceOne({ id }, next);
  return next;
}
async function deleteDoc(id) {
  let doc;
  if (local()) { const d = readLocal(); doc = d.docs.find((x) => x.id === id); d.docs = d.docs.filter((x) => x.id !== id); writeLocal(d); }
  else { const c = await cols(); doc = strip(await c.docs.findOne({ id })); if (doc) await c.docs.deleteOne({ id }); }
  if (doc && !local()) { try { const { del } = require('@vercel/blob'); await del(doc.pathname); } catch (e) { console.error('blob delete failed', e && e.message); } }
  return !!doc;
}
const visibleTo = (doc, client) => doc.audience !== 'clients' || (doc.clientIds || []).includes(client.id);

// ---------------------------------------------------------------- activity
async function logEvent(ev) {
  const e = { at: now(), ...ev };
  try {
    if (local()) { const d = readLocal(); d.events.unshift(e); d.events = d.events.slice(0, 500); writeLocal(d); }
    else await (await cols()).events.insertOne(e);
  } catch (err) { console.error('portal event log failed', err && err.message); }
}
async function recentEvents(limit = 200) {
  if (local()) return readLocal().events.slice(0, limit);
  return (await (await cols()).events.find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(limit).toArray());
}
async function touchVisit(client) {
  const patch = { lastVisitAt: now() };
  if (local()) { const d = readLocal(); const c = d.clients.find((x) => x.id === client.id); if (c) { c.lastVisitAt = patch.lastVisitAt; c.visits = (c.visits || 0) + 1; writeLocal(d); } return; }
  await (await cols()).clients.updateOne({ id: client.id }, { $set: patch, $inc: { visits: 1 } });
}
async function countDownload(doc) {
  if (local()) { const d = readLocal(); const x = d.docs.find((y) => y.id === doc.id); if (x) { x.downloads = (x.downloads || 0) + 1; writeLocal(d); } return; }
  await (await cols()).docs.updateOne({ id: doc.id }, { $inc: { downloads: 1 } });
}

// ---------------------------------------------------------------- private file links (short-lived)
async function signedFileUrl(doc, minutes = 10) {
  if (local()) return null;
  const { issueSignedToken, presignUrl } = require('@vercel/blob');
  const validUntil = Date.now() + minutes * 60e3;
  const token = await issueSignedToken({ pathname: doc.pathname, operations: ['get'], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: 'get', pathname: doc.pathname, access: 'private', validUntil });
  return presignedUrl;
}

function blobConfigured() {
  return !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

module.exports = {
  CATEGORIES, listClients, createClient, updateClient, deleteClient, clientByKey,
  listDocs, createDoc, updateDoc, deleteDoc, visibleTo, logEvent, recentEvents, touchVisit, countDownload, signedFileUrl, blobConfigured, local,
};
