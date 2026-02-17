import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Package, Edit2, AlertTriangle, Minus, BarChart3, RefreshCw, FileDown, Wifi, WifiOff, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import { getAllDocs, getDoc, saveDoc, deleteDoc } from './couchdbProxy';

// Configuration CouchDB avec authentification Basic
const COUCHDB_USER = 'access';
const COUCHDB_PASSWORD = '4G9?r3oKH7tSbCB7rMM9PDpq7L5Yn&tCgE8?qEDD';
const COUCHDB_HOST = 'https://couchdb.monproprecloud.fr';
const COUCHDB_DB = 'bobinos';
const COUCHDB_URL = `${COUCHDB_HOST}/${COUCHDB_DB}`;

// Authentification Basic
const getAuthHeaders = () => {
  const credentials = btoa(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${credentials}`
  };
};

// Initialisation IndexedDB
const DB_NAME = 'StockManager';
const DB_VERSION = 1;
const PRODUCTS_STORE = 'products';
const MOVEMENTS_STORE = 'movements';

const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MOVEMENTS_STORE)) {
        db.createObjectStore(MOVEMENTS_STORE, { keyPath: 'id' });
      }
    };
  });
};

const saveToIndexedDB = async (data, storeName) => {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    if (Array.isArray(data)) {
      store.clear();
      data.forEach(item => store.add(item));
    } else {
      store.put(data);
    }
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error(`Erreur sauvegarde IndexedDB (${storeName}):`, error);
  }
};

const loadFromIndexedDB = async (storeName) => {
  try {
    const db = await initIndexedDB();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Erreur chargement IndexedDB (${storeName}):`, error);
    return [];
  }
};

export default function StockManager() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
  const [useCustomProductName, setUseCustomProductName] = useState(false);
  
  const [productForm, setProductForm] = useState({
    name: '',
    currentStock: '',
    minStock: ''
  });

  const [movementForm, setMovementForm] = useState({
    quantity: '',
    destockedBy: 'Hiane Benamar',
    intendedFor: '',
    theoreticalWithdrawalDate: '',
    withdrawn: false,
    email: ''
  });

  const [editingMovementId, setEditingMovementId] = useState(null);
  const [editingMovement, setEditingMovement] = useState(null);

  const destockers = ['Hiane Benamar', 'Franck Vendeur', 'Fabien Richard', 'Frédéric Antoine'];
  const productTypes = ['Bobino Laize 80', 'Bobino Laize 120', 'Bobino Laize 160'];
  const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  // Charger les données depuis IndexedDB au démarrage
  useEffect(() => {
    const initializeApp = async () => {
      await loadDataFromIndexedDB();
      await syncWithCouchDB();
    };
    
    initializeApp();
    const interval = setInterval(() => syncWithCouchDB(), 30000); // Sync toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  const loadDataFromIndexedDB = async () => {
    try {
      const productsData = await loadFromIndexedDB(PRODUCTS_STORE);
      const movementsData = await loadFromIndexedDB(MOVEMENTS_STORE);
      setProducts(productsData || []);
      setMovements(movementsData || []);
    } catch (error) {
      console.error('Erreur chargement IndexedDB:', error);
    }
  };

  const saveToIndexedDBLocal = async (productsData, movementsData) => {
    try {
      await saveToIndexedDB(productsData || products, PRODUCTS_STORE);
      await saveToIndexedDB(movementsData || movements, MOVEMENTS_STORE);
    } catch (error) {
      console.error('Erreur sauvegarde IndexedDB:', error);
    }
  };

  const syncWithCouchDB = async () => {
    try {
      setSyncStatus('syncing');
      
      // Récupérer toutes les données de CouchDB via le proxy
      const data = await getAllDocs();
      const productsData = [];
      const movementsData = [];

      data.rows.forEach(row => {
        if (row.doc && !row.id.startsWith('_')) {
          if (row.doc.type === 'product') {
            productsData.push(row.doc);
          } else if (row.doc.type === 'movement') {
            movementsData.push(row.doc);
          }
        }
      });

      if (productsData.length > 0 || movementsData.length > 0) {
        setProducts(productsData);
        setMovements(movementsData);
        await saveToIndexedDBLocal(productsData, movementsData);
      }
      
      setSyncStatus('synced');
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      setSyncStatus('error');
    }
  };

  const saveToCouchDB = async (doc, docType, docId) => {
    try {
      setSyncStatus('syncing');
      const _id = `${docType}_${docId}`;
      
      // Vérifier si le document existe
      let existingDoc;
      try {
        existingDoc = await getDoc(_id);
      } catch (e) {
        // Document n'existe pas
      }

      const docToSave = {
        ...doc,
        _id,
        type: docType,
        ...(existingDoc && { _rev: existingDoc._rev })
      };

      await saveDoc(docToSave);
      setTimeout(() => setSyncStatus('synced'), 1000);
    } catch (error) {
      console.error('Erreur sauvegarde CouchDB:', error);
      setSyncStatus('error');
    }
  };

  const deleteFromCouchDB = async (docType, docId) => {
    try {
      const _id = `${docType}_${docId}`;
      const doc = await getDoc(_id);
      if (!doc) return;
      
      await deleteDoc(_id, doc._rev);
    } catch (error) {
      console.error('Erreur suppression CouchDB:', error);
    }
  };

  const getAvailableYears = () => {
    if (movements.length === 0) return [new Date().getFullYear()];
    const years = movements.map(m => {
      const parts = m.date.split('/');
      return parseInt(parts[2]);
    });
    return [...new Set(years)].sort((a, b) => b - a);
  };

  const getMovementsByYear = (year) => {
    return movements.filter(m => {
      const parts = m.date.split('/');
      const movementYear = parseInt(parts[2]);
      return movementYear === year;
    });
  };

  const getStatsByDestination = (year) => {
    const yearMovements = getMovementsByYear(year);
    const stats = {};
    yearMovements.forEach(m => {
      if (!stats[m.intendedFor]) stats[m.intendedFor] = 0;
      stats[m.intendedFor] += m.quantity;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const getStatsByProduct = (year) => {
    const yearMovements = getMovementsByYear(year);
    const stats = {};
    yearMovements.forEach(m => {
      if (!stats[m.productName]) stats[m.productName] = 0;
      stats[m.productName] += m.quantity;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const getStatsByDestocker = (year) => {
    const yearMovements = getMovementsByYear(year);
    const stats = {};
    yearMovements.forEach(m => {
      if (!stats[m.destockedBy]) stats[m.destockedBy] = 0;
      stats[m.destockedBy] += m.quantity;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const getWithdrawalStats = (year) => {
    const yearMovements = getMovementsByYear(year);
    const total = yearMovements.length;
    const withdrawn = yearMovements.filter(m => m.withdrawn).length;
    const pending = total - withdrawn;
    return { total, withdrawn, pending };
  };

  const exportToExcel = () => {
    if (movements.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const exportData = [];
    const allYears = getAvailableYears();
    
    allYears.forEach(year => {
      const yearMovements = getMovementsByYear(year);
      const aggregatedData = {};
      
      yearMovements.forEach(m => {
        const key = `${m.intendedFor}|${m.productName}`;
        if (!aggregatedData[key]) {
          aggregatedData[key] = {
            year: year,
            recipient: m.intendedFor,
            product: m.productName,
            totalQty: 0,
            moveCount: 0,
            lastDate: m.date,
            destocker: m.destockedBy,
            withdrawn: m.withdrawn ? 'Oui' : 'Non',
            theoreticalDate: m.theoreticalWithdrawalDate || 'N/A'
          };
        }
        aggregatedData[key].totalQty += m.quantity;
        aggregatedData[key].moveCount += 1;
        const parts1 = m.date.split('/');
        const currentDate = new Date(parts1[2], parts1[1] - 1, parts1[0]);
        const parts2 = aggregatedData[key].lastDate.split('/');
        const savedDate = new Date(parts2[2], parts2[1] - 1, parts2[0]);
        if (currentDate > savedDate) {
          aggregatedData[key].lastDate = m.date;
          aggregatedData[key].destocker = m.destockedBy;
          aggregatedData[key].withdrawn = m.withdrawn ? 'Oui' : 'Non';
          aggregatedData[key].theoreticalDate = m.theoreticalWithdrawalDate || 'N/A';
        }
      });
      Object.values(aggregatedData).forEach(data => exportData.push(data));
    });
    
    exportData.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return a.recipient.localeCompare(b.recipient);
    });
    
    const headers = ['Annee', 'Destinataire', 'Produit', 'Quantite_Totale', 'Nombre_Mouvements', 'Derniere_Date', 'Date_Theorique_Retrait', 'Retrait_Confirme', 'Destocke_Par'];
    const csvRows = [headers.join(',')];
    
    exportData.forEach(row => {
      const csvRow = [
        row.year,
        `"${row.recipient.replace(/"/g, '""')}"`,
        `"${row.product.replace(/"/g, '""')}"`,
        row.totalQty,
        row.moveCount,
        row.lastDate,
        row.theoreticalDate,
        row.withdrawn,
        `"${row.destocker.replace(/"/g, '""')}"`
      ].join(',');
      csvRows.push(csvRow);
    });
    
    const csvContent = csvRows.join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.href = url;
    link.download = `statistiques_stock_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  };
  const generateBonDeSortie = (movement) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;

      doc.setFontSize(16);
      doc.text('BON DE SORTIE', margin, margin + 10);

      doc.setFontSize(10);
      doc.text(`N° ${movement.id}`, pageWidth - margin - 30, margin + 10);

      doc.setFontSize(11);
      doc.text('DESTINATAIRE', margin, margin + 30);
      doc.setFont(undefined, 'bold');
      doc.text(movement.intendedFor, margin, margin + 40);
      doc.setFont(undefined, 'normal');

      doc.setFontSize(11);
      doc.text('PRODUIT', margin, margin + 55);
      doc.text(movement.productName, margin + 40, margin + 55);

      doc.setFontSize(11);
      doc.text('QUANTITE', margin, margin + 70);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.text(`${movement.quantity}`, margin + 40, margin + 70);
      doc.setFont(undefined, 'normal');

      doc.setFontSize(9);
      doc.text(`Destocker par: ${movement.destockedBy}`, margin, margin + 90);
      doc.text(`Date: ${movement.date}`, margin, margin + 100);

      if (movement.theoreticalWithdrawalDate) {
        doc.text(`Date theorique retrait: ${movement.theoreticalWithdrawalDate}`, margin, margin + 110);
      }

      doc.text(`Statut retrait: ${movement.withdrawn ? 'Confirme' : 'En attente'}`, margin, margin + 120);

      const timestamp = new Date().toISOString().split('T')[0];
      doc.save(`bon_de_sortie_${movement.intendedFor}_${timestamp}.pdf`);
    } catch (error) {
      console.error('Erreur PDF:', error);
      alert('Erreur generation PDF');
    }
  };

  const handleSendBonDeSortieEmail = async (movement) => {
    if (!movement.email) {
      alert('Aucun email configuré pour cette sortie');
      return;
    }

    try {
      const subject = encodeURIComponent(`Bon de Sortie - ${movement.productName} pour ${movement.intendedFor}`);
      const body = encodeURIComponent(
        `Bonjour,\n\nVoici les détails du bon de sortie :\n\n` +
        `Produit: ${movement.productName}\n` +
        `Quantité: ${movement.quantity}\n` +
        `Destinataire: ${movement.intendedFor}\n` +
        `Date: ${movement.date}\n` +
        `Heure: ${movement.time}\n` +
        `Déstocké par: ${movement.destockedBy}\n` +
        `Statut retrait: ${movement.withdrawn ? 'Confirmé' : 'En attente'}\n` +
        `${movement.theoreticalWithdrawalDate ? `Date théorique de retrait: ${movement.theoreticalWithdrawalDate}\n` : ''}\n` +
        `Cordialement,\nSystème de Gestion de Stock`
      );

      const mailtoLink = `mailto:${movement.email}?subject=${subject}&body=${body}`;
      const a = document.createElement('a');
      a.href = mailtoLink;
      a.click();
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      alert('Erreur lors de l\'envoi de l\'email');
    }
  };

  const handleAddProduct = async () => {
    if (productForm.name && productForm.currentStock && productForm.minStock) {
      let updatedProducts;
      let productToSave;
      
      if (editingId) {
        updatedProducts = products.map(p => p.id === editingId ? { ...p, name: productForm.name, currentStock: Number(productForm.currentStock), minStock: Number(productForm.minStock) } : p);
        productToSave = updatedProducts.find(p => p.id === editingId);
        setEditingId(null);
      } else {
        productToSave = { id: Date.now(), name: productForm.name, currentStock: Number(productForm.currentStock), minStock: Number(productForm.minStock) };
        updatedProducts = [...products, productToSave];
      }
      
      setProducts(updatedProducts);
      await saveToIndexedDBLocal(updatedProducts, movements);
      await saveToCouchDB(productToSave, 'product', productToSave.id);
      setProductForm({ name: '', currentStock: '', minStock: '' });
      setUseCustomProductName(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingId(product.id);
    setUseCustomProductName(false);
    setProductForm({ name: product.name, currentStock: product.currentStock, minStock: product.minStock });
  };

  const handleDeleteProduct = async (id) => {
    const updatedProducts = products.filter(p => p.id !== id);
    const updatedMovements = movements.filter(m => m.productId !== id);
    
    setProducts(updatedProducts);
    setMovements(updatedMovements);
    await saveToIndexedDBLocal(updatedProducts, updatedMovements);
    
    await deleteFromCouchDB('product', id);
    const movementsToDelete = movements.filter(m => m.productId === id);
    for (const movement of movementsToDelete) {
      await deleteFromCouchDB('movement', movement.id);
    }
  };

  const handleClearMovements = async () => {
    if (movements.length === 0) {
      alert('Aucun mouvement à supprimer');
      return;
    }
    
    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer les ${movements.length} mouvements ? Cette action est irréversible.`);
    
    if (!confirmed) {
      return;
    }
    
    setMovements([]);
    await saveToIndexedDBLocal(products, []);
    
    // Supprimer tous les mouvements de CouchDB
    for (const movement of movements) {
      await deleteFromCouchDB('movement', movement.id);
    }
  };

  const handleDestock = async () => {
    if (selectedProduct && movementForm.quantity && movementForm.destockedBy && movementForm.intendedFor) {
      const qty = Number(movementForm.quantity);
      if (qty > selectedProduct.currentStock) {
        alert('Quantité insuffisante en stock !');
        return;
      }

      const newStock = selectedProduct.currentStock - qty;
      const updatedProducts = products.map(p => p.id === selectedProduct.id ? { ...p, currentStock: newStock } : p);
      setProducts(updatedProducts);

      const productToSave = updatedProducts.find(p => p.id === selectedProduct.id);
      await saveToCouchDB(productToSave, 'product', productToSave.id);

      const existingMovementIndex = movements.findIndex(m => m.intendedFor === movementForm.intendedFor && m.productId === selectedProduct.id);
      let updatedMovements;
      let movementToSave;

      if (existingMovementIndex !== -1) {
        updatedMovements = [...movements];
        updatedMovements[existingMovementIndex] = {
          ...updatedMovements[existingMovementIndex],
          quantity: updatedMovements[existingMovementIndex].quantity + qty,
          date: new Date().toLocaleDateString('fr-FR'),
          time: new Date().toLocaleTimeString('fr-FR'),
          destockedBy: movementForm.destockedBy,
          theoreticalWithdrawalDate: movementForm.theoreticalWithdrawalDate,
          withdrawn: movementForm.withdrawn,
          email: movementForm.email,
          updated: true
        };
        movementToSave = updatedMovements[existingMovementIndex];
      } else {
        movementToSave = {
          id: Date.now(),
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: qty,
          destockedBy: movementForm.destockedBy,
          intendedFor: movementForm.intendedFor,
          date: new Date().toLocaleDateString('fr-FR'),
          time: new Date().toLocaleTimeString('fr-FR'),
          theoreticalWithdrawalDate: movementForm.theoreticalWithdrawalDate,
          withdrawn: movementForm.withdrawn,
          email: movementForm.email,
          updated: false
        };
        updatedMovements = [...movements, movementToSave];
      }

      setMovements(updatedMovements);
      await saveToIndexedDBLocal(updatedProducts, updatedMovements);
      await saveToCouchDB(movementToSave, 'movement', movementToSave.id);

      setMovementForm({ quantity: '', destockedBy: 'Hiane Benamar', intendedFor: '', theoreticalWithdrawalDate: '', withdrawn: false, email: '' });
      setShowMovementForm(false);
      setSelectedProduct(null);
    }
  };

  const handleSendBonDeSortieEmail = async (movement) => {
    if (!movement.email) {
      alert('Aucun email configuré pour cette sortie');
      return;
    }

    try {
      const subject = encodeURIComponent(`Bon de Sortie - ${movement.productName} pour ${movement.intendedFor}`);
      const body = encodeURIComponent(
        `Bonjour,\n\nVoici les détails du bon de sortie :\n\n` +
        `Produit: ${movement.productName}\n` +
        `Quantité: ${movement.quantity}\n` +
        `Destinataire: ${movement.intendedFor}\n` +
        `Date: ${movement.date}\n` +
        `Heure: ${movement.time}\n` +
        `Déstocké par: ${movement.destockedBy}\n` +
        `Statut retrait: ${movement.withdrawn ? 'Confirmé' : 'En attente'}\n` +
        `${movement.theoreticalWithdrawalDate ? `Date théorique de retrait: ${movement.theoreticalWithdrawalDate}\n` : ''}\n` +
        `Cordialement,\nSystème de Gestion de Stock`
      );

      const mailtoLink = `mailto:${movement.email}?subject=${subject}&body=${body}`;
      const a = document.createElement('a');
      a.href = mailtoLink;
      a.click();
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      alert('Erreur lors de l\'envoi de l\'email');
    }
  };

  const openDestockForm = (product) => {
    setSelectedProduct(product);
    setShowMovementForm(true);
    setMovementForm({ quantity: '', destockedBy: 'Hiane Benamar', intendedFor: '', theoreticalWithdrawalDate: '', withdrawn: false, email: '' });
  };

  const getExistingDestinations = (productId) => {
    return movements.filter(m => m.productId === productId).map(m => m.intendedFor).filter((value, index, self) => self.indexOf(value) === index);
  };

  const cancelDestock = () => {
    setShowMovementForm(false);
    setSelectedProduct(null);
    setMovementForm({ quantity: '', destockedBy: 'Hiane Benamar', intendedFor: '', theoreticalWithdrawalDate: '', withdrawn: false, email: '' });
  };

  const handleEditMovement = (movement) => {
    setEditingMovement({ ...movement });
    setEditingMovementId(movement.id);
  };

  const handleSaveEditedMovement = async () => {
    if (!editingMovement) return;

    const updatedMovements = movements.map(m => m.id === editingMovement.id ? editingMovement : m);
    setMovements(updatedMovements);
    await saveToIndexedDBLocal(products, updatedMovements);
    await saveToCouchDB(editingMovement, 'movement', editingMovement.id);

    setEditingMovementId(null);
    setEditingMovement(null);
  };

  const handleDeleteMovement = async (movementId) => {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer ce mouvement ? Cette action est irréversible.');
    if (!confirmed) return;

    const movementToDelete = movements.find(m => m.id === movementId);
    const updatedMovements = movements.filter(m => m.id !== movementId);
    setMovements(updatedMovements);
    await saveToIndexedDBLocal(products, updatedMovements);
    await deleteFromCouchDB('movement', movementId);
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-800">Gestion de Stock</h1>
            <div className="hidden sm:flex ml-4 items-center gap-2">
              {syncStatus === 'synced' && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Wifi className="w-4 h-4" />
                  <span>Synchronisé</span>
                </div>
              )}
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-1 text-blue-600 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synchronisation...</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <WifiOff className="w-4 h-4" />
                  <span>Hors ligne</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex sm:hidden items-center gap-2">
              {syncStatus === 'synced' && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Wifi className="w-4 h-4" />
                  <span>Synchronisé</span>
                </div>
              )}
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-1 text-blue-600 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synchronisation...</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <WifiOff className="w-4 h-4" />
                  <span>Hors ligne</span>
                </div>
              )}
            </div>
            <button onClick={() => setShowStats(!showStats)} className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium whitespace-nowrap w-full sm:w-auto">
              <BarChart3 className="w-5 h-5" />
              <span className="sm:hidden">{showStats ? 'Masquer' : 'Voir'}</span>
              <span className="hidden sm:inline">{showStats ? 'Masquer' : 'Voir'} Statistiques</span>
            </button>
          </div>
        </div>

        {showStats && movements.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Statistiques Annuelles</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <button onClick={exportToExcel} className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium whitespace-nowrap">
                  <FileDown className="w-5 h-5" />
                  Exporter Excel
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Année:</label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {getAvailableYears().map(year => (<option key={year} value={year}>{year}</option>))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quantités par Destinataire</h3>
                {getStatsByDestination(selectedYear).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getStatsByDestination(selectedYear)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#4F46E5" name="Quantité" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (<p className="text-gray-500 text-center py-8">Aucune donnée pour {selectedYear}</p>)}
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quantités par Produit</h3>
                {getStatsByProduct(selectedYear).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={getStatsByProduct(selectedYear)} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                        {getStatsByProduct(selectedYear).map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (<p className="text-gray-500 text-center py-8">Aucune donnée pour {selectedYear}</p>)}
              </div>

              <div className="border border-gray-200 rounded-lg p-4 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quantités déstockées par Personne</h3>
                {getStatsByDestocker(selectedYear).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getStatsByDestocker(selectedYear)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10B981" name="Quantité déstockée" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (<p className="text-gray-500 text-center py-8">Aucune donnée pour {selectedYear}</p>)}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Top Destinataires</h3>
                <div className="space-y-2">
                  {getStatsByDestination(selectedYear).slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-700">{item.name}</span>
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Top Produits</h3>
                <div className="space-y-2">
                  {getStatsByProduct(selectedYear).slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-700">{item.name}</span>
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Statut des Retraits</h3>
                <div className="space-y-3">
                  {(() => {
                    const stats = getWithdrawalStats(selectedYear);
                    const percentageWithdrawn = stats.total > 0 ? Math.round((stats.withdrawn / stats.total) * 100) : 0;
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total:</span>
                          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">{stats.total}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-700">Confirmés:</span>
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">{stats.withdrawn}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-yellow-700">En attente:</span>
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">{stats.pending}</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentageWithdrawn}%` }}></div>
                          </div>
                          <p className="text-xs text-gray-600 mt-2 text-center">{percentageWithdrawn}% des retraits confirmés</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingId ? 'Modifier le produit' : 'Ajouter un produit'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du produit</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select 
                      value={useCustomProductName ? '' : productForm.name} 
                      onChange={(e) => {
                        if (e.target.value) {
                          setProductForm({ ...productForm, name: e.target.value });
                          setUseCustomProductName(false);
                        }
                      }} 
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner un produit</option>
                      {productTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => setUseCustomProductName(!useCustomProductName)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${useCustomProductName ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      {useCustomProductName ? '✓ Nouveau' : '+ Nouveau'}
                    </button>
                  </div>
                  {useCustomProductName && (
                    <input 
                      type="text" 
                      value={productForm.name} 
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} 
                      className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-indigo-50" 
                      placeholder="Nom du nouveau produit"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock actuel</label>
                <input type="number" value={productForm.currentStock} onChange={(e) => setProductForm({ ...productForm, currentStock: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Quantité en stock" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock minimum</label>
                <input type="number" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Seuil d'alerte" min="0" />
              </div>
              <button onClick={handleAddProduct} className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium">
                <Plus className="w-5 h-5" />
                {editingId ? 'Mettre à jour' : 'Ajouter le produit'}
              </button>
              {editingId && (
                <button onClick={() => { setEditingId(null); setProductForm({ name: '', currentStock: '', minStock: '' }); setUseCustomProductName(false); }} className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Annuler</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Produits en stock ({products.length})</h2>
            {products.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun produit enregistré</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {products.map((product) => (
                  <div key={product.id} className={`border rounded-lg p-4 ${product.currentStock === 0 ? 'border-gray-300 bg-gray-100' : product.currentStock <= product.minStock ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          {product.name}
                          {product.currentStock === 0 && (<span className="text-xs bg-gray-500 text-white px-2 py-1 rounded">ÉPUISÉ</span>)}
                          {product.currentStock > 0 && product.currentStock <= product.minStock && (<AlertTriangle className="w-5 h-5 text-red-500" />)}
                        </h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Stock actuel:</span> {product.currentStock} | <span className="font-medium ml-2">Min:</span> {product.minStock}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openDestockForm(product)} disabled={product.currentStock === 0} className={`p-2 rounded-lg transition-colors ${product.currentStock === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'}`} title={product.currentStock === 0 ? 'Stock épuisé' : 'Déstocker'}>
                          <Minus className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Modifier">
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showMovementForm && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Déstocker: {selectedProduct.name}</h2>
              <p className="text-sm text-gray-600 mb-4">Stock disponible: {selectedProduct.currentStock}</p>
              <div className="space-y-4">
                {getExistingDestinations(selectedProduct.id).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destinataires existants pour ce produit</label>
                    <div className="grid grid-cols-1 gap-2 mb-3">
                      {getExistingDestinations(selectedProduct.id).map((dest) => {
                        const movement = movements.find(m => m.productId === selectedProduct.id && m.intendedFor === dest);
                        return (
                          <button key={dest} onClick={() => setMovementForm({ ...movementForm, intendedFor: dest })} className={`text-left p-3 rounded-lg border-2 transition-all ${movementForm.intendedFor === dest ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800">{dest}</span>
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Total actuel: {movement?.quantity || 0}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="text-xs text-gray-500 font-medium">OU NOUVEAU</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{getExistingDestinations(selectedProduct.id).length > 0 ? 'Nouveau destinataire' : 'Destiné à'}</label>
                  <input type="text" value={movementForm.intendedFor} onChange={(e) => setMovementForm({ ...movementForm, intendedFor: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Nom du destinataire" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité à déstocker</label>
                  <input type="number" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Quantité" min="1" max={selectedProduct.currentStock} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Déstocké par</label>
                  <select value={movementForm.destockedBy} onChange={(e) => setMovementForm({ ...movementForm, destockedBy: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {destockers.map((name) => (<option key={name} value={name}>{name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email du destinataire</label>
                  <input type="email" value={movementForm.email} onChange={(e) => setMovementForm({ ...movementForm, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date théorique de retrait</label>
                  <input type="date" value={movementForm.theoreticalWithdrawalDate} onChange={(e) => setMovementForm({ ...movementForm, theoreticalWithdrawalDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-lg">
                  <input 
                    type="checkbox" 
                    id="withdrawn" 
                    checked={movementForm.withdrawn} 
                    onChange={(e) => setMovementForm({ ...movementForm, withdrawn: e.target.checked })} 
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="withdrawn" className="text-sm font-medium text-gray-700 cursor-pointer">Retrait confirmé par le destinataire</label>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleDestock} className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium">Valider</button>
                  <button onClick={cancelDestock} className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium">Annuler</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingMovementId && editingMovement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Éditer le mouvement</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
                  <input type="text" value={editingMovement.productName} disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                  <input type="number" value={editingMovement.quantity} onChange={(e) => setEditingMovement({ ...editingMovement, quantity: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Quantité" min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destinataire</label>
                  <input type="text" value={editingMovement.intendedFor} onChange={(e) => setEditingMovement({ ...editingMovement, intendedFor: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Destinataire" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Déstocké par</label>
                  <select value={editingMovement.destockedBy} onChange={(e) => setEditingMovement({ ...editingMovement, destockedBy: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                    {destockers.map((name) => (<option key={name} value={name}>{name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email du destinataire</label>
                  <input type="email" value={editingMovement.email || ''} onChange={(e) => setEditingMovement({ ...editingMovement, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date théorique de retrait</label>
                  <input type="date" value={editingMovement.theoreticalWithdrawalDate || ''} onChange={(e) => setEditingMovement({ ...editingMovement, theoreticalWithdrawalDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
                <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    id="withdrawn-edit"
                    checked={editingMovement.withdrawn}
                    onChange={(e) => setEditingMovement({ ...editingMovement, withdrawn: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="withdrawn-edit" className="text-sm font-medium text-gray-700 cursor-pointer">Retrait confirmé par le destinataire</label>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveEditedMovement} className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium">Enregistrer</button>
                  <button onClick={() => { setEditingMovementId(null); setEditingMovement(null); }} className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium">Annuler</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Historique des mouvements ({movements.length})</h2>
            {movements.length > 0 && (
              <button onClick={handleClearMovements} className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium whitespace-nowrap w-full sm:w-auto justify-center sm:justify-start">
                <Trash2 className="w-5 h-5" />
                <span>Vider l'historique</span>
              </button>
            )}
          </div>
          {movements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun mouvement de stock enregistré</p>
          ) : (
            <div className="space-y-3">
              {movements.slice().reverse().map((movement) => (
                <div key={movement.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{movement.productName}</h3>
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">-{movement.quantity}</span>
                        {movement.updated && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Mis à jour
                          </span>
                        )}
                      </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div><span className="font-medium">Déstocké par:</span> {movement.destockedBy}</div>
                        <div><span className="font-medium">Destiné à:</span> {movement.intendedFor}</div>
                        <div><span className="font-medium">Date:</span> {movement.date} {movement.time}</div>
                        {movement.theoreticalWithdrawalDate && (
                          <div><span className="font-medium">Date théorique de retrait:</span> {movement.theoreticalWithdrawalDate}</div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Retrait:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${movement.withdrawn ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {movement.withdrawn ? '✓ Confirmé' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => generateBonDeSortie(movement)} className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-lg transition-colors flex-shrink-0" title="Générer bon de sortie">
                        <Download className="w-5 h-5" />
                      </button>
                      {movement.email && (
                        <button onClick={() => handleSendBonDeSortieEmail(movement)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors flex-shrink-0" title="Envoyer par email">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
                        </button>
                      )}
                      <button onClick={() => handleEditMovement(movement)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors flex-shrink-0" title="Éditer">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteMovement(movement.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0" title="Supprimer">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}