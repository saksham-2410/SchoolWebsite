const { sign } = require('./_auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { email, password } = body;
  const ok = email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD;

  if (!ok) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect email or password' }) };
  }

  const token = sign({ sub: email, exp: Date.now() + 12 * 60 * 60 * 1000 }, process.env.AUTH_SECRET);
  const cookie = `admin_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${12 * 60 * 60}`;

  return {
    statusCode: 200,
    headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
