# IT Impact Navigator

Interactive dashboard to manage IT components, visualize dependencies, and analyze business impact of outages.

## Tech Stack

- Vite + React + TypeScript
- shadcn-ui + Tailwind CSS
- Zustand (state, localStorage persistence)
- Node/Express backend for JSON persistence (`server/index.js`)

## Key Features

- Components Management
  - CRUD, vendor field, search and filters (type, status)
  - Quick action: Mark as Down/Online directly in the table (button left of name)
  - Sortable columns (default sort by name)
  - Export full JSON backup (components, dependencies, workflows)

- Dependency Network Map
  - Visualizes component dependencies, supports larger view for readability

- Workflows
  - Workflow steps support multiple primary components and alternatives
  - Edit step dialog with prefilled data

- Impact Analysis Engine
  - Considers cascading/transitive impacts (direct + indirect)
  - Shows affected workflows and specific steps with reason components
  - Business Impact Score weighted by number of dependents, workflows, and chain depth
  - CSV/PDF export of analysis results

- Dashboard
  - Live status header (components count, issues)
  - System Health Overview and Quick Actions
  - Incident History sourced from audit logs (status changes with timestamps)

## Project Structure

- `src/components/` – UI (dashboard, components management, dependencies, workflows, analysis)
- `src/store/useItiacStore.ts` – Zustand store + audit logging hooks
- `src/services/auditService.ts` – audit logs in localStorage (used for Incident History)
- `server/index.js` – Node/Express JSON backend (reads/writes `server/data/data.json`)

## Getting Started (Local Development)

Prereqs: Node.js and npm.

1) Install deps
```sh
npm install
```

2) Run backend (JSON persistence)
```sh
node server/index.js
# Server runs on http://localhost:4000
```

3) Run frontend
```sh
npm run dev
# App runs on http://localhost:5173 (by default)
```

Notes:
- Frontend persists UI state to localStorage via Zustand.
- Backend persists full data model to `server/data/data.json` (used for import/export or central storage).
- Audit logs (for Incident History) are currently kept in browser localStorage.

## Data Model

- Components include: `vendor`, `criticality`, `status` (online/offline/warning/maintenance), `location`, `owner`, `metadata`.
- Dependencies include type and criticality.
- Workflows include steps, each with multiple primary components and alternatives.

## Exports & Backups

- Components Management: Export full JSON backup (components + dependencies + workflows).
- Impact Analysis: Export CSV and generate PDF report of current results.

## Deployment

- Frontend: build with `npm run build` and serve `dist/`.
- Backend: run `node server/index.js` on your server (ensure write permissions to `server/data/`).

## Roadmap / Pending

- Additional explanatory tooltips across dashboard and analysis.
- Enlarged/clearer dependency map details.
- Optional server-side audit log storage (instead of localStorage).
