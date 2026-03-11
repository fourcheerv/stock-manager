const API_BASE = '/api/couchdb';

export const fetchCouchDB = async (payload) => {
  try {
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
  return fetchCouchDB({ action: 'list' });
};

export const getDoc = async (docId) => {
  return fetchCouchDB({ action: 'get', docId });
};

export const saveDoc = async (doc) => {
  return fetchCouchDB({ action: 'save', docId: doc._id, body: doc });
};

export const deleteDoc = async (docId, rev) => {
  return fetchCouchDB({ action: 'delete', docId, body: { rev } });
};
