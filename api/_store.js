// Lead storage for the mini CRM.
// Production: MongoDB (MONGODB_URI, optional MONGODB_DB) — collection "crm_leads".
// Local dev (CMS_LOCAL=1, no MONGODB_URI): .data/leads.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const COLLECTION = 'crm_leads';
const LOCAL_FILE = path.resolve(__dirname, '..', '.data', 'leads.json');
const useMongo = () => !!process.env.MONGODB_URI;

let clientPromise = null;
async function collection() {
  if (!clientPromise) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 6000, maxPoolSize: 5 });
    clientPromise = client.connect().catch((e) => { clientPromise = null; throw e; });
  }
  const client = await clientPromise;
  const col = client.db(process.env.MONGODB_DB || undefined).collection(COLLECTION);
  if (!collection._indexed) {
    collection._indexed = true;
    col.createIndex({ createdAt: -1 }).catch(() => {});
    col.createIndex({ email: 1, source: 1 }).catch(() => {});
  }
  return col;
}

// ---------- local JSON fallback
const readLocal = () => { try { return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); } catch { return []; } };
const writeLocal = (rows) => { fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true }); fs.writeFileSync(LOCAL_FILE, JSON.stringify(rows, null, 2)); };

const clean = (doc) => { if (!doc) return doc; const { _id, ...rest } = doc; return rest; };

async function addLead(lead) {
  const now = new Date().toISOString();
  const upsert = lead.source === 'gate' || lead.source === 'newsletter'; // one row per email for these
  if (useMongo()) {
    const col = await collection();
    if (upsert) {
      // fields in $set / $inc must not also appear in $setOnInsert (MongoDB rejects the conflict)
      const { page, language, email, source, ...rest } = lead;
      const r = await col.findOneAndUpdate(
        { email, source },
        { $set: { lastSeenAt: now, page, language }, $inc: { hits: 1 },
          $setOnInsert: { ...rest, id: crypto.randomUUID(), createdAt: now, status: 'new', notes: '' } },
        { upsert: true, returnDocument: 'after' });
      return clean(r && (r.value || r));
    }
    const doc = { ...lead, id: crypto.randomUUID(), createdAt: now, lastSeenAt: now, status: 'new', notes: '', hits: 1 };
    await col.insertOne(doc);
    return clean(doc);
  }
  if (process.env.CMS_LOCAL !== '1') throw new Error('No lead storage configured (MONGODB_URI missing)');
  const rows = readLocal();
  const ex = upsert && rows.find((r) => r.email === lead.email && r.source === lead.source);
  if (ex) { ex.lastSeenAt = now; ex.hits = (ex.hits || 1) + 1; writeLocal(rows); return ex; }
  const doc = { ...lead, id: crypto.randomUUID(), createdAt: now, lastSeenAt: now, status: 'new', notes: '', hits: 1 };
  rows.unshift(doc); writeLocal(rows);
  return doc;
}

async function listLeads() {
  if (useMongo()) {
    const col = await collection();
    return (await col.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(5000).toArray());
  }
  return readLocal().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function updateLead(id, patch) {
  if (useMongo()) {
    const col = await collection();
    const r = await col.findOneAndUpdate({ id }, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after', projection: { _id: 0 } });
    return r && (r.value !== undefined ? r.value : r);
  }
  const rows = readLocal(); const r = rows.find((x) => x.id === id);
  if (!r) return null; Object.assign(r, patch, { updatedAt: new Date().toISOString() }); writeLocal(rows); return r;
}

async function deleteLead(id) {
  if (useMongo()) { const col = await collection(); const r = await col.deleteOne({ id }); return r.deletedCount > 0; }
  const rows = readLocal(); const n = rows.length; const left = rows.filter((x) => x.id !== id); writeLocal(left); return left.length < n;
}

async function health() {
  if (useMongo()) { const col = await collection(); await col.estimatedDocumentCount(); return { storage: 'mongodb', ok: true }; }
  return { storage: process.env.CMS_LOCAL === '1' ? 'local' : 'none', ok: process.env.CMS_LOCAL === '1' };
}

module.exports = { addLead, listLeads, updateLead, deleteLead, health };
