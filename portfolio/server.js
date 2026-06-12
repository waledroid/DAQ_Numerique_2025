#!/usr/bin/env node
/* ============================================================
   EDGE VISION — local server (server.js)
   Zero-dependency Node server: serves the static site AND the
   CV editor's persistence API (no database — one JSON file).

     node server.js            → http://localhost:8000
     PORT=9000 node server.js  → custom port

   API:
     GET /api/cv  → data/cv.json
     PUT /api/cv  → validate + atomically overwrite data/cv.json

   `python3 -m http.server 8000` still works for read-only
   previews; the CV editor then falls back to localStorage.
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'cv.json');
const PORT = Number(process.env.PORT) || 8000;
const MAX_BODY = 1024 * 1024; // 1 MB is plenty for a CV

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}
const sendJSON = (res, status, obj) => send(res, status, JSON.stringify(obj));

// ---- /api/cv --------------------------------------------------------------
function handleApi(req, res) {
  if (req.method === 'GET') {
    fs.readFile(DATA_FILE, (err, buf) => {
      if (err) return sendJSON(res, 500, { error: 'cv.json illisible' });
      send(res, 200, buf, MIME['.json']);
    });
    return;
  }
  if (req.method === 'PUT' || req.method === 'POST') {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        sendJSON(res, 413, { error: 'corps trop volumineux' });
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      let data;
      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch (err) {
        return sendJSON(res, 400, { error: 'JSON invalide' });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data) || !data.identity) {
        return sendJSON(res, 422, { error: 'structure de CV inattendue' });
      }
      // Atomic write: tmp file then rename, so a crash never corrupts the CV
      const tmp = DATA_FILE + '.tmp';
      fs.writeFile(tmp, JSON.stringify(data, null, 2) + '\n', (werr) => {
        if (werr) return sendJSON(res, 500, { error: 'écriture impossible' });
        fs.rename(tmp, DATA_FILE, (rerr) => {
          if (rerr) return sendJSON(res, 500, { error: 'écriture impossible' });
          sendJSON(res, 200, { ok: true });
        });
      });
    });
    return;
  }
  res.writeHead(405, { Allow: 'GET, PUT, POST' });
  res.end();
}

// ---- Static files -----------------------------------------------------------
function handleStatic(req, res, urlPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch (err) {
    return send(res, 400, 'Bad request', MIME['.txt']);
  }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
    return send(res, 403, 'Forbidden', MIME['.txt']);
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found', MIME['.txt']);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/api/cv') return handleApi(req, res);
  return handleStatic(req, res, urlPath);
});

server.listen(PORT, () => {
  console.log(`EDGE VISION → http://localhost:${PORT}  (CV éditable sur /cv.html)`);
});
