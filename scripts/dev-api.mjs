import http from 'node:http';

const PORT = Number(process.env.DEV_API_PORT || 3001);
const COUCHDB_USER = process.env.COUCHDB_USER;
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;
const COUCHDB_URL = process.env.COUCHDB_URL;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const DOC_ID_PATTERN = /^(product|movement)_[A-Za-z0-9_-]+$/;
const DOC_TYPE_PATTERN = /^(product|movement)$/;

function setHeaders(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function getAuthHeaders() {
  const credentials = Buffer.from(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`).toString('base64');
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${credentials}`,
  };
}

function isValidDocId(docId) {
  return typeof docId === 'string' && DOC_ID_PATTERN.test(docId);
}

function buildRequest(payload) {
  const { action, docId, body } = payload || {};

  if (action === 'list') {
    return {
      url: `${COUCHDB_URL}/_all_docs?include_docs=true`,
      options: { method: 'GET', headers: getAuthHeaders() },
    };
  }

  if (!isValidDocId(docId)) {
    return null;
  }

  const encodedDocId = encodeURIComponent(docId);

  if (action === 'get') {
    return {
      url: `${COUCHDB_URL}/${encodedDocId}`,
      options: { method: 'GET', headers: getAuthHeaders() },
    };
  }

  if (action === 'save') {
    if (!body || body._id !== docId || !DOC_TYPE_PATTERN.test(body.type || '')) {
      return null;
    }

    return {
      url: `${COUCHDB_URL}/${encodedDocId}`,
      options: {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      },
    };
  }

  if (action === 'delete') {
    if (!body || typeof body.rev !== 'string' || body.rev.length === 0) {
      return null;
    }

    return {
      url: `${COUCHDB_URL}/${encodedDocId}?rev=${encodeURIComponent(body.rev)}`,
      options: { method: 'DELETE', headers: getAuthHeaders() },
    };
  }

  return null;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    req.on('data', chunk => {
      rawBody += chunk;
    });

    req.on('end', () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

if (!COUCHDB_USER || !COUCHDB_PASSWORD || !COUCHDB_URL) {
  console.error('Missing COUCHDB_USER, COUCHDB_PASSWORD or COUCHDB_URL');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  setHeaders(req, res);

  if (req.url !== '/api/couchdb') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const payload = await readJsonBody(req);
    const request = buildRequest(payload);

    if (!request) {
      sendJson(res, 400, { error: 'Invalid request payload' });
      return;
    }

    const response = await fetch(request.url, request.options);

    if (!response.ok) {
      const details = await response.text();
      console.error('Local API CouchDB error:', response.status, details);
      sendJson(res, response.status, { error: 'CouchDB request failed' });
      return;
    }

    const data = await response.json();
    sendJson(res, 200, data);
  } catch (error) {
    console.error('Local API error:', error);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local CouchDB API listening on http://127.0.0.1:${PORT}`);
});
