const { requireAuth } = require('./_auth');

exports.handler = async (event) => {
  const auth = requireAuth(event);
  if (!auth) return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: auth.sub }),
  };
};
