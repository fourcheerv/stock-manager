# 📦 Stock Manager - Guide Utilisateur (Nouvelles fonctionnalités)

## 🎯 Quelles sont les nouvelles fonctionnalités?

Deux nouveaux champs vous permettent maintenant de mieux suivre les retraits des destinataires:

### 1️⃣ **Date théorique de retrait**
Un champ calendrier pour indiquer **quand** le destinataire doit venir chercher son stock.

### 2️⃣ **Retrait confirmé**
Une case à cocher pour marquer si le destinataire **a réellement** retiré son stock.

---

## 🔧 Comment utiliser ces fonctionnalités?

### Lors d'un destockage

1. **Cliquez sur le bouton moins** (🔴) pour un produit
2. **La modal de destockage s'ouvre**
3. **Remplissez les champs existants** (destinataire, quantité, personne qui déstocke)
4. **Spécifiez la date théorique** ✨
   - Cliquez sur le champ de date
   - Sélectionnez la date attendue du retrait
   - **Optionnel**: Vous pouvez laisser vide si vous ne savez pas
5. **Cochez "Retrait confirmé"** si applicable
   - Laissez décoché par défaut si le destinataire n'a pas encore retiré
   - Cochez si le retrait a déjà eu lieu
6. **Validez le formulaire**

---

## 📊 Consulter les statistiques

### Voir le statut des retraits

1. **Cliquez sur "Voir Statistiques"**
2. **Sélectionnez l'année** souhaitée
3. **Regardez le panneau "Statut des Retraits"** (en bas à droite)

Vous verrez:
- 📦 **Total**: nombre de mouvements créés
- ✅ **Confirmés**: nombre de retraits finalisés
- ⏳ **En attente**: nombre de retraits qui n'ont pas eu lieu
- 📈 **Barre de progression**: pourcentage de retraits confirmés

### Exemple
```
Total: 15
Confirmés: 10 (vert)
En attente: 5 (jaune)
Progression: 67% ✅
```

---

## 📋 L'historique des mouvements

Chaque mouvement affiche maintenant:
- ✅ Si le retrait est **confirmé** (badge vert) ou **en attente** (badge jaune)
- 📅 La **date théorique de retrait** (si renseignée)

```
Produit: Laize 80
Quantité: -50
Déstocké par: Hiane Benamar
Destiné à: Client ABC
Date: 15/01/2026 14:30:00
Date théorique: 20/01/2026           ← NOUVEAU
Retrait: ✓ Confirmé                  ← NOUVEAU
```

---

## 📊 Exporter les données

L'export CSV contient maintenant deux colonnes supplémentaires:

| Colonne | Valeur | Exemple |
|---------|--------|---------|
| Date_Theorique_Retrait | Date ou "N/A" | 2026-01-20 |
| Retrait_Confirme | Oui/Non | Oui |

**Pour exporter:**
1. Allez à "Voir Statistiques"
2. Cliquez sur "Exporter Excel"
3. Ouvrez le fichier CSV généré

---

## 📝 Notes utiles

### ✨ Points importants

✅ **Les nouveaux champs sont optionnels**
- Vous pouvez créer un mouvement sans date théorique
- Le retrait est défini à "Non" par défaut

✅ **Rétrocompatibilité**
- Vos anciens mouvements continuent de fonctionner normalement
- Les anciens mouvements sans date théorique affichent "N/A" à l'export

✅ **Synchronisation automatique**
- Les données sont synchronisées avec CouchDB
- Toutes les modifications sont sauvegardées automatiquement

✅ **Mise à jour des mouvements**
- Vous pouvez modifier la date théorique et le statut de retrait lors de l'agrégation de mouvements existants

---

## 🎓 Cas d'usage pratiques

### Cas 1: Suivi de livraison
```
1. Créez un mouvement avec date théorique = aujourd'hui + 3 jours
2. Cochez "Retrait confirmé" uniquement quand le client vient chercher
3. Consultez les stats pour voir combien de clients ont retiré à temps
```

### Cas 2: Gestion des impayés
```
1. Créez un mouvement avec date théorique
2. Ne cochez PAS "Retrait confirmé" tant que le client n'est pas venu
3. Les statistiques vous montrent les retraits "En attente"
4. Relancez les clients avec des retraits >30 jours en attente
```

### Cas 3: Audit
```
1. À la fin du mois, consultez les statistiques
2. Identifiez les mouvements non retirés ("En attente")
3. Exportez les données pour archivage/comptabilité
```

---

## ❓ FAQ

**Q: Je veux modifier la date théorique d'un mouvement existant?**
R: Créez un nouveau mouvement pour le même destinataire et produit. Les quantités et les champs seront mis à jour automatiquement.

**Q: Que se passe-t-il si je laisse la date théorique vide?**
R: Aucun problème! C'est optionnel. À l'export, elle affichera "N/A".

**Q: Can I change the "Retrait confirmé" status later?**
R: Oui, quand vous mettez à jour un mouvement (en ajoutant une quantité au même destinataire), vous pouvez modifier ce champ.

**Q: Comment supprimer un mouvement entier?**
R: Pour l'instant, les mouvements ne peuvent pas être supprimés individuellement (c'est volontaire pour l'audit). Contactez l'administrateur si nécessaire.

**Q: Mes anciennes données vont-elles disparaître?**
R: Non! Tous vos mouvements existants restent intacts. Les nouveaux champs sont simplement ajoutés.

---

## 🎯 Prochaines étapes

- Consultez régulièrement le "Statut des Retraits" pour identifier les retards
- Utilisez l'export CSV pour générer des rapports mensuels
- Maintenez à jour le statut "Retrait confirmé" pour avoir des statistiques précises

Bonne gestion ! 📦✨

