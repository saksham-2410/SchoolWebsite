const { requireAuth } = require('./_auth');
const { getFile, putFile } = require('./_github');

const ALLOWED_TYPES = ['notices', 'gallery', 'downloads'];

exports.handler = async (event) => {
  const auth = requireAuth(event);
  if (!auth) return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };

  const repo = process.env.GH_REPO;
  const branch = process.env.GH_BRANCH || 'main';

  if (event.httpMethod === 'GET') {
    const type = event.queryStringParameters && event.queryStringParameters.type;
    if (!ALLOWED_TYPES.includes(type)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid content type' }) };
    }
    try {
      const { content } = await getFile(repo, branch, `data/${type}.json`);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: content };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
    }
    const { type, data } = body;
    if (!ALLOWED_TYPES.includes(type) || !Array.isArray(data)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid content type or data' }) };
    }
    try {
      const path = `data/${type}.json`;
      const { sha } = await getFile(repo, branch, path);
      const newContent = JSON.stringify({ [type]: data }, null, 2) + '\n';
      await putFile(repo, branch, path, { content: newContent, sha, message: `Update ${type} via admin panel` });
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method not allowed' };
};
