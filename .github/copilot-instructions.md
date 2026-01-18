# Stock Manager - Copilot Instructions

## Project Overview

**Stock Manager** is a React-based inventory management application built with Vite, Tailwind CSS, and Recharts. The app tracks product stock levels, records inventory movements (destocking), and provides detailed annual statistics with export functionality.

### Core Architecture

- **Single-file monolithic component**: All logic lives in `src/App.jsx` (690 lines). There is no component decomposition.
- **Dual persistence layer**: Data syncs to both localStorage (immediate UI updates) and CouchDB (remote backup).
- **Real-time auto-sync**: Every 30 seconds, app fetches fresh data from CouchDB to stay in sync across sessions.

## Data Model

### Products
```jsx
{ id: timestamp, name: 'Laize 80'|'Laize 120'|'Laize 160', currentStock: number, minStock: number }
```
- Only 3 predefined product types allowed (select dropdown, not free-text)
- `currentStock` decreases when destocking; never synced directly during movement creation

### Movements
```jsx
{ 
  id: timestamp, 
  productId: id, 
  productName: string, 
  quantity: number, 
  destockedBy: 'Hiane Benamar'|'Franck Vendeur'|'Fabien Richard'|'Frédéric Antoine', 
  intendedFor: string, 
  date: 'DD/MM/YYYY', 
  time: 'HH:MM:SS',
  theoreticalWithdrawalDate: 'YYYY-MM-DD' (optional),
  withdrawn: boolean,
  updated: boolean 
}
```
- **Key pattern**: If same `intendedFor` AND `productId` exist, quantities are summed and marked `updated: true`
- Dates stored in French locale format (`toLocaleDateString('fr-FR')`)
- **New fields** (v2.0):
  - `theoreticalWithdrawalDate`: Expected withdrawal date picker (format: YYYY-MM-DD)
  - `withdrawn`: Boolean flag indicating if recipient has confirmed withdrawal (default: false)

### Sync Pattern: localStorage → CouchDB

```jsx
// 1. Update local state
setProducts(updatedProducts);

// 2. Persist to localStorage (immediate)
saveToLocal(updatedProducts, movements);

// 3. Async sync to CouchDB (background, error-tolerant)
await saveToCouchDB(productToSave, 'product', productToSave.id);
```

- CouchDB document ID format: `type_timestamp` (e.g., `product_1705589400000`)
- Must handle existing `_rev` fields during updates to avoid version conflicts
- Sync failures don't block UI; errors silently logged to console

## Critical Workflows

### Adding/Editing Products
1. Form validation: name, currentStock, minStock must be truthy
2. On create: generate ID via `Date.now()`
3. On edit: toggle `editingId` state to switch form mode
4. Persist product; if editing, find by ID and update; if new, push to array
5. Don't forget: clear form after save

### Destocking (Movement Creation)
1. User clicks Minus icon on product → opens modal
2. Modal shows existing destinations for that product (to enable quantity aggregation)
3. Validate: quantity ≤ currentStock, all required fields filled
4. Check for existing movement: `movements.find(m => m.intendedFor === form.intendedFor && m.productId === product.id)`
   - If exists: add quantity, set `updated: true`, update timestamp, **update `theoreticalWithdrawalDate` and `withdrawn` status**
   - If new: create movement object with `updated: false`, **set `theoreticalWithdrawalDate` (optional) and `withdrawn: false`**
5. Update product stock: `currentStock -= quantity`
6. Sync both product and movement to CouchDB
7. Clear form and close modal

### Statistics & Export
- Filter movements by year: split `date` (DD/MM/YYYY) on `/[2]` for year
- Aggregate by destination, product, or destocker (destockedBy person)
- **NEW**: Withdrawal stats via `getWithdrawalStats(year)` - returns {total, withdrawn, pending}
- Export to CSV: aggregate movements by recipient+product+year, include move count, last update date, **theoretical withdrawal date, and withdrawal confirmation status**
- CSV includes BOM (`\uFEFF`) for proper UTF-8 encoding in Excel
- Use double-quote escaping for fields containing commas

## Common Patterns & Anti-Patterns

### ✅ Correct Patterns
- **Always sync after state changes**: Call `saveToLocal()` immediately, then `saveToCouchDB()` async
- **Use spread operator for immutability**: `[...array, newItem]` or `map()` for updates
- **French date formatting**: `new Date().toLocaleDateString('fr-FR')` returns "DD/MM/YYYY"
- **Disabled UI states**: Product destock button disabled when `currentStock === 0`

### ❌ Avoid
- Don't mutate state arrays directly; always create new arrays
- Don't store credentials in plain JS (hardcoded CouchDB URL is a security anti-pattern but project-specific)
- Don't create separate React components (monolithic by design; keep code in App.jsx)
- Don't filter/sort without spreading first: always create new arrays

## Environment & Scripts

```bash
npm run dev      # Start Vite dev server on http://localhost:5173
npm run build    # Build dist/ for production
npm run preview  # Preview production build locally
```

- Vite config includes React plugin (@vitejs/plugin-react)
- Tailwind CSS configured via `tailwind.config.js`
- PostCSS processes Tailwind directives

## Key Dependencies

- **React 18**: State management via `useState`, `useEffect`
- **Recharts**: Bar charts, pie charts (responsive containers required)
- **Lucide React**: Icons (Trash2, Plus, Package, etc.)
- **Tailwind CSS**: All styling via utility classes

## Sync & Error Handling

- **CouchDB URL** encoded with credentials (special chars escaped): `https://user:password@host/db`
- **Fetch errors**: Silently caught; `setSyncStatus('error')` shows offline badge
- **Destock validation**: Alert if quantity exceeds stock
- **Cascade delete**: Deleting a product removes all its associated movements

## UI Conventions

- **Color scheme**: Indigo primary (#4F46E5), alerts use red/orange
- **Modal pattern**: Fixed overlay with semi-transparent bg, centered max-width card
- **Responsive**: Grid layouts switch between 1 col (mobile) and 2 cols (lg breakpoint)
- **Sync badge**: Top-right shows "Synchronisé" (green + Wifi icon), "Synchronisation..." (blue + spinner), or "Hors ligne" (red + WifiOff)
