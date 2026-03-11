# 📦 Application de Gestion de Stock

Application web moderne de gestion de stock avec suivi des mouvements, alertes de stock minimum et statistiques annuelles.

## ✨ Fonctionnalités

### Gestion des Produits
- ➕ Ajout de produits avec stock actuel et stock minimum
- ✏️ Modification des informations produit
- 🗑️ Suppression de produits
- ⚠️ Alertes visuelles pour stock bas ou épuisé
- 🔴 Badge "ÉPUISÉ" pour les produits sans stock

### Déstockage Intelligent
- 📉 Déstockage avec sélection de la personne responsable
- 👥 Liste prédéfinie des personnes autorisées :
  - User1
  - User2
  - User3
  - User4
- 🎯 Suivi du destinataire pour chaque mouvement
- 🔄 **Mise à jour automatique** : Si un même destinataire reprend le même produit, la quantité s'additionne automatiquement
- 🚫 Contrôle des quantités disponibles

### Historique et Traçabilité
- 📋 Historique complet de tous les mouvements
- 📅 Date et heure de chaque opération
- 🔄 Badge "Mis à jour" pour les mouvements cumulés
- 👤 Identification de la personne ayant effectué le déstockage

### Statistiques Annuelles
- 📊 Graphiques interactifs (Recharts)
- 📈 **Graphique en barres** : Quantités par destinataire
- 🥧 **Graphique en camembert** : Répartition par produit
- 🏆 Top 5 des destinataires
- 🏆 Top 5 des produits les plus déstockés
- 📆 Sélection d'année pour analyse temporelle

## 🚀 Installation

### Prérequis
- Node.js 16+ 
- npm ou yarn

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/stock-manager.git
cd stock-manager
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Lancer l'application en mode développement**
```bash
npm run dev
```

4. **Accéder à l'application**
Ouvrez votre navigateur à l'adresse : `http://localhost:5173`

## 🏗️ Build pour Production

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`.

## 🛠️ Technologies Utilisées

- **React 18** - Framework JavaScript
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS** - Framework CSS utility-first
- **Recharts** - Bibliothèque de graphiques React
- **Lucide React** - Icônes modernes
- **JavaScript ES6+** - Langage de programmation

## 📁 Structure du Projet

```
stock-manager/
├── public/              # Fichiers statiques
├── src/
│   ├── App.jsx         # Composant principal
│   ├── main.jsx        # Point d'entrée React
│   └── index.css       # Styles Tailwind
├── index.html          # Template HTML
├── package.json        # Dépendances
├── vite.config.js      # Configuration Vite
├── tailwind.config.js  # Configuration Tailwind
└── README.md           # Documentation
```

## 💡 Utilisation

### Ajouter un Produit
1. Remplir le formulaire "Ajouter un produit"
2. Indiquer le nom, stock actuel et stock minimum
3. Cliquer sur "Ajouter le produit"

### Déstocker un Produit
1. Cliquer sur l'icône "moins" (−) du produit
2. Saisir la quantité à déstocker
3. Sélectionner la personne qui effectue le déstockage
4. Indiquer le destinataire
5. Valider l'opération

### Consulter les Statistiques
1. Cliquer sur "Voir Statistiques"
2. Sélectionner l'année souhaitée
3. Analyser les graphiques et tableaux récapitulatifs

## 🎨 Personnalisation

### Modifier la liste des personnes autorisées
Dans `src/App.jsx`, ligne ~17 :
```javascript
const destockers = ['Nom1', 'Nom2', 'Nom3', 'Nom4'];
```

### Modifier les couleurs des graphiques
Dans `src/App.jsx`, ligne ~15 :
```javascript
const COLORS = ['#4F46E5', '#06B6D4', '#10B981', ...];
```

## 🔐 Sécurité

Les accès CouchDB ne doivent jamais être embarqués dans le frontend. La configuration sensible passe désormais par des variables d'environnement côté serveur :

```bash
COUCHDB_URL=https://couchdb.monproprecloud.fr/bobinos
COUCHDB_USER=access
COUCHDB_PASSWORD=mot-de-passe-roté
ALLOWED_ORIGINS=https://votre-app.example.com,http://localhost:5173
```

Le proxy `/api/couchdb` n'expose plus un passthrough générique vers CouchDB. Il n'autorise que :
- la lecture de `/_all_docs?include_docs=true`
- la lecture d'un document `product_*` ou `movement_*`
- l'écriture et la suppression de ces mêmes documents

Après ce changement, il faut impérativement :
- faire tourner le mot de passe du compte CouchDB `access`
- supprimer tout secret déjà commité de l'historique Git si le dépôt a été partagé
- limiter côté CouchDB les droits du compte `access` à la seule base `bobinos`

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/amelioration`)
3. Commit vos changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/amelioration`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.


## 📞 Support

Pour toute question ou problème :
- Ouvrir une [issue](https://github.com/fourcheerv/stock-manager/issues)

---

⭐ Si ce projet vous a été utile, n'hésitez pas à lui donner une étoile sur GitHub !
