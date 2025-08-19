# IT Impact Navigator

Moderní aplikace pro správu IT infrastruktury s analýzou dopadů výpadků na obchodní procesy. Aplikace poskytuje komplexní přehled o IT komponentách, jejich závislostech a potenciálních rizicích.

## Technický stack

- **Frontend**: Vite + React 18 + TypeScript
- **UI Framework**: shadcn/ui + Tailwind CSS (světlý motiv s béžovými akcenty)
- **State Management**: Zustand s localStorage persistencí
- **Backend**: Node.js/Express API pro JSON persistenci
- **Vizualizace**: React Flow pro síťové diagramy
- **Export**: jsPDF pro PDF reporty, CSV export

## Klíčové funkce

### 📊 Dashboard
- Přehledné KPI karty (celkový počet IT assetů, aktivní závislosti, kritické cesty)
- System Health Overview s kruhovými metrikami
- Quick Actions panel pro rychlé operace
- Historie incidentů ze systémových audit logů
- Moderní světlý design s béžovými akcenty

### 🖥️ Správa IT Assetů
- Kompletní CRUD operace pro IT komponenty
- Pokročilé filtrování (typ, status, kritičnost)
- Sortování podle všech sloupců
- Rychlé přepínání Online/Offline přímo v tabulce
- Podpora pro vendor, lokaci, vlastníka a metadata
- Barevné rozlišení kritičnosti (Low/Medium/High/Critical)

### 🔗 Síť závislostí
- Interaktivní vizualizace závislostí mezi komponenty
- Automatické rozvržení pomocí Dagre algoritmu
- Zoom a pan pro velké sítě
- Barevné rozlišení typů komponent a stavů

### 📋 Business procesy (Workflows)
- Definice obchodních procesů s kroky
- Podpora pro primární a alternativní komponenty v každém kroku
- Editace kroků s předvyplněnými daty
- Mapování procesů na IT infrastrukturu

### ⚡ Engine pro analýzu dopadů
- Analýza kaskádových dopadů (přímé + nepřímé)
- Business Impact Score s váženými faktory
- Identifikace zasažených procesů a konkrétních kroků
- Risk Level badges konzistentní s barvami kritičnosti
- Automatické přepočítávání při změnách
- Export do CSV a PDF reportů

## Struktura projektu

```
src/
├── components/
│   ├── analysis/           # Impact Analysis Engine
│   ├── components/         # IT Assets Management
│   ├── dashboard/          # Dashboard komponenty
│   ├── dependencies/       # Síť závislostí
│   ├── forms/             # Formuláře (Component, Workflow)
│   ├── layout/            # Layout komponenty
│   └── ui/                # shadcn/ui komponenty
├── services/              # API služby a business logika
├── store/                 # Zustand store s audit logging
├── types/                 # TypeScript definice
└── hooks/                 # React hooks

server/
├── index.js              # Express API server
└── data/data.json        # JSON databáze
```

## Instalace a spuštění

**Požadavky**: Node.js 18+ a npm

### 1. Instalace závislostí
```bash
npm install
```

### 2. Spuštění backend serveru
```bash
npm run server
# Server běží na http://localhost:4000
```

### 3. Spuštění frontend aplikace
```bash
npm run dev
# Aplikace běží na http://localhost:5173
```

### 4. Spuštění obou současně
```bash
npm run dev:full
# Spustí backend i frontend současně
```

### Poznámky k persistenci dat
- **Frontend**: UI stav se ukládá do localStorage přes Zustand
- **Backend**: Kompletní datový model v `server/data/data.json`
- **Audit logy**: Historie změn v localStorage (pro Dashboard)

## Datový model

### IT Komponenty (ITComponent)
```typescript
{
  id: string
  name: string
  type: 'server' | 'database' | 'api' | 'application' | ...
  status: 'online' | 'offline' | 'warning' | 'maintenance'
  criticality: 'low' | 'medium' | 'high' | 'critical'
  vendor?: string
  location?: string
  owner?: string
  description?: string
  metadata: Record<string, any>
  lastUpdated: string
}
```

### Závislosti (ComponentDependency)
```typescript
{
  id: string
  sourceId: string      // komponenta která závisí
  targetId: string      // komponenta na které závisí
  type: 'depends_on' | 'uses' | 'connects_to'
  criticality: 'low' | 'medium' | 'high' | 'critical'
}
```

### Business procesy (BusinessWorkflow)
```typescript
{
  id: string
  name: string
  description?: string
  steps: WorkflowStep[]
}

// WorkflowStep
{
  id: string
  name: string
  primaryComponentId?: string
  primaryComponentIds?: string[]
  alternativeComponentIds?: string[]
}
```

## Export a zálohy

- **Kompletní záloha**: JSON export všech dat (komponenty + závislosti + procesy)
- **Impact Analysis**: CSV export a PDF reporty s výsledky analýzy
- **Audit logy**: Historie změn pro sledování incidentů

## Deployment

### Production build
```bash
npm run build
# Vytvoří optimalizovanou verzi v dist/
```

### Backend deployment
```bash
node server/index.js
# Zajistěte write oprávnění do server/data/
```

## Aktuální stav a vylepšení

### ✅ Dokončeno
- Světlý motiv s béžovými akcenty
- Konzistentní barevné schéma pro kritičnost
- Optimalizované Risk Level badges v Impact Analysis
- Vylepšené UI komponenty s shadows a hover efekty
- Automatické přepočítávání analýz

### 🔄 Plánované vylepšení
- Rozšířené tooltips pro lepší UX
- Detailnější zobrazení síťových map
- Server-side audit log storage
- Pokročilé filtry a vyhledávání
- Notifikace a alerting systém

## Technické detaily

### Barevné schéma
- **Kritičnost**: Low (zelená), Medium (žlutá), High (oranžová), Critical (červená)
- **Status**: Online (zelená), Offline (červená), Warning (žlutá), Maintenance (šedá)
- **Motiv**: Světlý s béžovými akcenty a subtilními stíny

### Performance optimalizace
- Lazy loading komponent
- Memoizace výpočtů v Impact Analysis
- Optimalizované re-rendery pomocí Zustand
- Efektivní síťové dotazy s error handling

### Bezpečnost
- Input validace pomocí Zod
- XSS ochrana
- CORS konfigurace
- Sanitizace exportovaných dat
