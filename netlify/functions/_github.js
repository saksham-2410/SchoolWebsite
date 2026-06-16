// Minimal GitHub Contents API client used to read/write JSON content and uploaded files.
const GITHUB_API = 'https://api.github.com';

async function ghRequest(path, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getFile(repo, branch, path) {
  const data = await ghRequest(`/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`);
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha };
}

async function putFile(repo, branch, path, { content, base64, sha, message }) {
  const body = {
    message,
    content: base64 || Buffer.from(content).toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  return ghRequest(`/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

module.exports = { getFile, putFile };
