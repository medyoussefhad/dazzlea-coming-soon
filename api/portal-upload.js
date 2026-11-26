// Admin-only: hands the browser a short-lived presigned URL so large brochures go straight into the private Blob store
// (bypasses the 4.5 MB function body limit). The document record is created afterwards via /api/portal-admin.
const { handleUploadPresigned } = require('@vercel/blob/client');
const { issueSignedToken } = require('@vercel/blob');
const { send, verifyToken, cookies, COOKIE } = require('./_lib');

const TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed',
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4',
];
const MAX = 500 * 1024 * 1024; // 500 MB

module.exports = async (req, res) => {
  // SameSite=Strict session cookie: only the signed-in admin, from this site, can get an upload URL
  if (!verifyToken(cookies(req)[COOKIE])) return send(res, 401, { error: 'Not signed in' });
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    const result = await handleUploadPresigned({
      body,
      request: req,
      getSignedToken: async (pathname) => {
        if (!/^portal\/[A-Za-z0-9._ -]{1,200}$/.test(pathname)) throw new Error('Invalid file name');
        const validUntil = Date.now() + 60 * 60e3;
        const token = await issueSignedToken({ pathname, operations: ['put'], validUntil, allowedContentTypes: TYPES, maximumSizeInBytes: MAX });
        return { token, urlOptions: { validUntil, allowedContentTypes: TYPES, maximumSizeInBytes: MAX, addRandomSuffix: true } };
      },
    });
    return send(res, 200, result);
  } catch (e) {
    console.error('portal upload', e && e.message);
    return send(res, 400, { error: (e && e.message) || 'Upload refused' });
  }
};
