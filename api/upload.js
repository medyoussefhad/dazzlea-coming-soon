const crypto = require('crypto');
const { send, requireAuth, writeFile } = require('./_lib');

// Images only (no SVG: it can carry scripts). The admin resizes photos in the browser before upload.
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAGIC = { jpg: [0xff, 0xd8, 0xff], png: [0x89, 0x50, 0x4e, 0x47], webp: [0x52, 0x49, 0x46, 0x46], gif: [0x47, 0x49, 0x46] };
const MAX = 3 * 1024 * 1024; // base64 must stay under Vercel's 4.5 MB request limit

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const ext = TYPES[body.type];
    if (!ext) return send(res, 415, { error: 'Only JPG, PNG, WebP or GIF images' });
    const buf = Buffer.from(String(body.data || ''), 'base64');
    if (!buf.length || buf.length > MAX) return send(res, 413, { error: 'Image must be under 3 MB' });
    if (!MAGIC[ext].every((b, i) => buf[i] === b)) return send(res, 415, { error: 'The file is not a valid image' });

    const base = String(body.name || 'image').toLowerCase().replace(/\.[a-z0-9]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image';
    const d = new Date();
    const rel = `assets/uploads/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${base}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    const out = await writeFile(rel, buf, null, `Admin: upload ${rel.split('/').pop()}`);
    return send(res, 200, { ok: true, path: '/' + rel, commit: out.commit });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: e.message || 'Upload failed' });
  }
};
