# IT Impact Navigator

Moderní aplikace pro správu IT infrastruktury a analýzu dopadů výpadků na obchodní procesy. Poskytuje přehled o IT komponentech, jejich závislostech, incidentech a rizicích.

## Tech stack

- Frontend: Vite + React 18 + TypeScript
- UI: shadcn/ui + Tailwind CSS, tmavý motiv (navy/teal/gold akcenty)
- Stav: Zustand (centrální store, audit logování), vlastní hooky (`src/hooks/`)
- Vizualizace: Vlastní SVG topologie (`src/components/ui/network-topology.tsx`) se zoom/pan, zvýrazněním dopadů a detaily uzlů
- Analýza: `src/lib/analysis.ts`, `src/lib/utils.ts`
- Backend: Node.js/Express (`server/index.js`) s JSON persistencí (`server/data/data.json`)
- Export: jsPDF (PDF) + CSV (`src/services/exportService.ts`)
- Služby: `src/services/*` (components, dependencies, workflows, audit, validation, export)

## Scripts (package.json)

- dev: `vite`
- server: `node server/index.js`
- dev:full: `concurrently "npm:server" "npm:dev"`
- build: `vite build`
- build:dev: `vite build --mode development`
- preview: `vite preview`
- lint: `eslint .`

## Prostředí (.env)

Klient (Vite):
- `VITE_API_URL` – URL backendu (např. `http://localhost:4000`)
- `VITE_SUPABASE_URL` – volitelně, URL Supabase projektu
- `VITE_SUPABASE_ANON_KEY` – volitelně, public key pro Supabase

Server (pokud používáte DB):
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`
- `DATABASE_URL`

Pozn.: Necommittujte citlivé klíče. Pro produkci použijte secure secrets storage.

## Hlavní funkcionalita

- Dashboard (`src/components/dashboard/`)
  - 4 KPI karty: Total IT Assets, Active Dependencies, Critical Paths, Business Processes
  - System Health Overview (Network Health %, IT Asset Status, Risk Assessment)
  - Quick Actions: Run Impact Analysis, Add IT Asset, View Network Map, Generate Report
  - Incident History z audit logů

- IT Assety (`src/components/components/`)
  - CRUD pro `ITComponent` (název, typ, status, kritičnost, vendor, owner, popis, `helpdeskEmail`, metadata)
  - Filtrování dle statusu/typu/kritičnosti, barevné odznaky

- Síť závislostí (`src/components/ui/network-topology.tsx`)
  - SVG graf s zoom/pan, výběrem uzlu, hover kartou a panelem detailu
  - Zobrazení „impacted path“ (červená přerušovaná) pro propagovaný dopad
  - Výpočet zasažených uzlů přes `computeImpactedFromOfflines()` a adjacency mapy z `src/lib/utils.ts`

- Workflows (`src/components/workflows/`, `src/services/workflowService.ts`)
  - CRUD procesů a mapování kroků na IT komponenty

- Audit/Incidenty (`src/services/auditService.ts`, `src/components/incidents/`)
  - Logování akcí nad komponentami a závislostmi, historie pro dashboard

- Export (`src/services/exportService.ts`)
  - PDF reporty (jsPDF) a CSV export dat/analýz

## Architektura a adresářová struktura

```
src/
├─ components/
│  ├─ analysis/             # vizualizace a analýzy
│  ├─ components/           # správa IT assetů (UI)
│  ├─ dashboard/            # dashboard widgety
│  ├─ dependencies/         # UI pro závislosti
│  ├─ forms/                # formuláře (component, workflow)
│  ├─ incidents/            # incidentní přehledy
│  ├─ layout/               # layout, sidebar, hlavičky
│  └─ ui/                   # shadcn/ui + vlastní UI (network-topology)
├─ hooks/                   # use-toast, use-mobile, ...
├─ lib/                     # analýza, supabase init, utils
├─ pages/                   # routy
├─ services/                # API a business logika
├─ store/                   # Zustand store (stav, mutace, selektory)
├─ types/                   # doménové typy
└─ App.tsx, main.tsx        # bootstrap aplikace

server/
├─ index.js                 # Express API
└─ data/data.json           # demo JSON data
```

## Datový model (zkráceně)

- ITComponent (`src/types/itiac.ts`)
```ts
{
  id: string;
  name: string;
  type: 'server' | 'database' | 'api' | 'application' | 'service' | 'network' | ...;
  status: 'online' | 'offline' | 'warning' | 'maintenance';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  vendor?: string;
  owner?: string;
  description?: string;
  helpdeskEmail?: string;
  metadata?: Record<string, any>;
  lastUpdated: string | Date;
}
```

- ComponentDependency (`src/types/itiac.ts`)
```ts
{
  id: string;
  sourceId: string;
  targetId: string;
  type: 'depends_on' | 'uses' | 'connects_to';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated?: string | Date;
}
```

- BusinessWorkflow a WorkflowStep
```ts
{
  id: string;
  name: string;
  description?: string;
  steps: Array<{
    id: string;
    name: string;
    primaryComponentId?: string;
    primaryComponentIds?: string[];
    alternativeComponentIds?: string[];
  }>;
}
```

## Běh aplikace

1) Instalace závislostí
```bash
npm install
```

2) Spuštění backend serveru
```bash
npm run server
# http://localhost:4000
```

3) Spuštění frontend aplikace
```bash
npm run dev
# http://localhost:5173
```

4) Spuštění obou současně
```bash
npm run dev:full
```

5) Lint
```bash
npm run lint
```

## Poznámky k datům

- Frontend: část UI stavu může být perzistována (Zustand persist)
- Backend: demo JSON data v `server/data/data.json`
- Audit: dostupné události pro incidentní přehledy

## Export a reporty

- CSV export vybraných entit a analýz
- PDF report s přehledy; lze rozšířit o snapshot topologie

## Náměty k rozšíření

- Paginace a full‑text na serveru pro velká data
- Realtime aktualizace (WebSocket) pro statusy/incidenty
- What‑If simulace a kritické cesty v `analysis.ts`
- Drag‑to‑connect a dávkové vytváření závislostí v topologii
- Integrace: Slack/PagerDuty/Statuspage, Supabase pro audit a realtime
