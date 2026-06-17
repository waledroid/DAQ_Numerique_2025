// Netlify Function — read/write the CV JSON, committing writes to GitHub.
//
// The GitHub token lives ONLY in this function's server-side environment
// (Netlify env vars), never in the browser. Reads are public (the repo is
// public anyway); writes require the editor password.
//
// Required Netlify environment variables:
//   GITHUB_TOKEN     fine-grained PAT, repo DAQ_Numerique_2025, Contents: R/W
//   EDITOR_PASSWORD  the password you type in the editor to authorise a save
// Optional overrides (sensible defaults below):
//   GH_OWNER  GH_REPO  GH_BRANCH  GH_PATH

const OWNER  = process.env.GH_OWNER  || 'waledroid';
const REPO   = process.env.GH_REPO   || 'DAQ_Numerique_2025';
const BRANCH = process.env.GH_BRANCH || 'main';
const GPATH  = process.env.GH_PATH   || 'portfolio/data/cv.json';

const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${GPATH}`;

const ghHeaders = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'cv-editor',
});

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  // ---- Read: latest committed CV (public, no password) --------------------
  if (event.httpMethod === 'GET') {
    if (!process.env.GITHUB_TOKEN) return json(500, { error: 'GITHUB_TOKEN manquant' });
    try {
      const r = await fetch(`${API_URL}?ref=${BRANCH}`, {
        headers: { ...ghHeaders(), Accept: 'application/vnd.github.raw' },
      });
      if (!r.ok) return json(r.status, { error: `GitHub ${r.status}` });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: await r.text(),
      };
    } catch (err) {
      return json(502, { error: 'GitHub injoignable' });
    }
  }

  // ---- Write: password-gated commit ---------------------------------------
  if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
    const pw = event.headers['x-cv-password'] || '';
    if (!process.env.EDITOR_PASSWORD || pw !== process.env.EDITOR_PASSWORD) {
      return json(401, { error: 'Mot de passe incorrect' });
    }
    if (!process.env.GITHUB_TOKEN) return json(500, { error: 'GITHUB_TOKEN manquant' });

    let data;
    try { data = JSON.parse(event.body); }
    catch (err) { return json(400, { error: 'JSON invalide' }); }
    if (!data || typeof data !== 'object' || Array.isArray(data) || !data.identity) {
      return json(422, { error: 'structure de CV inattendue' });
    }

    // Current file sha (needed to update an existing file; 404 => create)
    let sha;
    try {
      const cur = await fetch(`${API_URL}?ref=${BRANCH}`, { headers: ghHeaders() });
      if (cur.ok) sha = (await cur.json()).sha;
      else if (cur.status !== 404) return json(cur.status, { error: `GitHub ${cur.status}` });
    } catch (err) {
      return json(502, { error: 'GitHub injoignable' });
    }

    // Byte-for-byte match server.js so git diffs stay clean
    const content = Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8').toString('base64');
    try {
      const put = await fetch(API_URL, {
        method: 'PUT',
        headers: ghHeaders(),
        body: JSON.stringify({
          message: 'CV: mise à jour via l’éditeur',
          content,
          sha,
          branch: BRANCH,
        }),
      });
      if (put.ok) return json(200, { ok: true });
      const e = await put.json().catch(() => ({}));
      return json(put.status, { error: e.message || `GitHub ${put.status}` });
    } catch (err) {
      return json(502, { error: 'GitHub injoignable' });
    }
  }

  return json(405, { error: 'Méthode non autorisée' });
};
