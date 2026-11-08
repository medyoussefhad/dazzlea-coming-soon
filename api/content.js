const { CONTENT_FILES, send, requireAuth, readFile, writeFile, deployStatus } = require('./_lib');

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validate(name, data) {
  if (name === 'site') {
    if (!data || typeof data !== 'object' || !data.contact || !Array.isArray(data.stats)) return 'Invalid site settings';
    return null;
  }
  if (!Array.isArray(data)) return 'Expected a list';
  const seen = new Set();
  for (const [i, it] of data.entries()) {
    const label = name === 'work' ? (it.name || `#${i + 1}`) : ((it.title && (it.title.en || it.title.fr)) || `#${i + 1}`);
    if (!it || typeof it !== 'object') return `Item ${i + 1} is invalid`;
    if (!SLUG.test(it.slug || '')) return `"${label}": the URL slug must use lowercase letters, numbers and dashes only`;
    if (seen.has(it.slug)) return `"${label}": the URL slug "${it.slug}" is used twice`;
    seen.add(it.slug);
    if (name === 'work' && !it.name) return `Case ${i + 1}: the project name is required`;
    if (name === 'insights' && !(it.title && (it.title.en || it.title.fr))) return `Article ${i + 1}: the title is required`;
    if (name === 'insights' && !/^\d{4}-\d{2}-\d{2}$/.test(it.date || '')) return `"${label}": the date is required`;
  }
  return null;
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.searchParams.get('status')) {
      return send(res, 200, await deployStatus(url.searchParams.get('status')));
    }
    const name = url.searchParams.get('name') || (req.body && req.body.name);
    const file = CONTENT_FILES[name];
    if (!file) return send(res, 400, { error: 'Unknown content type' });

    if (req.method === 'GET') {
      const { text, sha } = await readFile(file);
      return send(res, 200, { data: JSON.parse(text), sha });
    }
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const err = validate(name, body.data);
      if (err) return send(res, 422, { error: err });
      const json = JSON.stringify(body.data, null, 2) + '\n';
      if (json.length > 2_000_000) return send(res, 413, { error: 'Content too large' });
      const labels = { work: 'case studies', insights: 'insights', site: 'site settings' };
      const out = await writeFile(file, Buffer.from(json, 'utf8'), body.sha, `Admin: update ${labels[name]}`);
      return send(res, 200, { ok: true, sha: out.sha, commit: out.commit });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    if (e.status === 409 || e.status === 422 && /sha/i.test(e.message)) return send(res, 409, { error: 'Someone else saved changes in the meantime. Reload to get the latest version.' });
    console.error(e);
    return send(res, e.status && e.status < 500 ? e.status : 500, { error: e.message || 'Server error' });
  }
};
