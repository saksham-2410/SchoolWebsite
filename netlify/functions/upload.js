const { requireAuth } = require('./_auth');
const { getFile, putFile } = require('./_github');

exports.handler = async (event) => {
  const auth = requireAuth(event);
  if (!auth) return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { filename, base64 } = body;
  if (!filename || !base64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing filename or file data' }) };
  }

  const repo = process.env.GH_REPO;
  const branch = process.env.GH_BRANCH || 'main';
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `assets/uploads/${Date.now()}-${safeName}`;

  try {
    await putFile(repo, branch, path, { base64, message: `Upload ${safeName} via admin panel` });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
