exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Set-Cookie': 'admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ok: true }),
});
