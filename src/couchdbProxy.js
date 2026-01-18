// Module utilitaire pour communiquer avec CouchDB via le proxy Vercel
const API_BASE = '/api/couchdb';

export const fetchCouchDB = async (method = 'GET', path = '', body = null) => {
  try {
    const payload = {
      method,
      path,
      ...(body && { body })
    };

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur communication CouchDB:', error);
    throw error;
  }
};

export const getAllDocs = async () => {
  return fetchCouchDB('GET', '/_all_docs?include_docs=true');
};

export const getDoc = async (docId) => {
  return fetchCouchDB('GET', `/${docId}`);
};

export const saveDoc = async (doc) => {
  return fetchCouchDB('PUT', `/${doc._id}`, doc);
};

export const deleteDoc = async (docId, rev) => {
  return fetchCouchDB('DELETE', `/${docId}?rev=${rev}`);
};
