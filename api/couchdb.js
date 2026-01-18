// Proxy API pour CouchDB
const COUCHDB_USER = 'access';
const COUCHDB_PASSWORD = '4G9?r3oKH7tSbCB7rMM9PDpq7L5Yn&tCgE8?qEDD';
const COUCHDB_URL = 'https://couchdb.monproprecloud.fr/bobinos';

const getAuthHeaders = () => {
  const credentials = btoa(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${credentials}`
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  // Gestion des requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  // Ajout des headers CORS
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  try {
    const { method = 'GET', path = '', body } = req.body || {};
    const url = `${COUCHDB_URL}${path}`;

    const fetchOptions = {
      method: method,
      headers: getAuthHeaders(),
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const errorData = await response.text();
      res.status(response.status).json({ 
        error: `CouchDB error: ${response.statusText}`,
        details: errorData 
      });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Erreur proxy CouchDB:', error);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message 
    });
  }
}
