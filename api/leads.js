// Admin-only CRM endpoint: list / update / delete leads, CSV export.
const { send, requireAuth } = require('./_lib');
const { listLeads, updateLead, deleteLead } = require('./_store');

const STATUSES = new Set(['new', 'contacted', 'qualified', 'won', 'lost']);
const csvCell = (v) => {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // spreadsheet formula injection guard
  return '"' + s.replace(/"/g, '""') + '"';
};

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET') {
      const rows = await listLeads();
      if (url.searchParams.get('format') === 'csv') {
        const cols = ['createdAt', 'source', 'status', 'email', 'name', 'company', 'phone', 'profile', 'service', 'message', 'notes', 'language', 'page', 'hits'];
        const csv = '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="dazzlea-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.setHeader('Cache-Control', 'no-store');
        return res.end(csv);
      }
      return send(res, 200, { leads: rows });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (req.method === 'PATCH') {
      const patch = {};
      if (body.status !== undefined) { if (!STATUSES.has(body.status)) return send(res, 400, { error: 'Bad status' }); patch.status = body.status; }
      if (body.notes !== undefined) patch.notes = String(body.notes).slice(0, 4000);
      const r = await updateLead(String(body.id || ''), patch);
      return r ? send(res, 200, { ok: true, lead: r }) : send(res, 404, { error: 'Not found' });
    }
    if (req.method === 'DELETE') {
      const ok = await deleteLead(String(url.searchParams.get('id') || ''));
      return ok ? send(res, 200, { ok: true }) : send(res, 404, { error: 'Not found' });
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'The lead database is not reachable right now.' });
  }
};
