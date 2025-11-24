## Personalised Dashboard

Offline-first workspace where users can mix todos, notes, and icon-only quick links, then resize/drag each widget without third-party grid libraries.

### Tech highlights

- **Next.js 16 + TypeScript** with App Router, SCSS modules, and shadcn/ui for primitives.
- **IndexedDB (via `idb`)** persists widgets, layout metadata, and per-widget data models (todos, notes, quick links).
- **Custom drag + resize engine** written in-house (no `react-grid-layout`), snapping to a 12-column grid with persistence.
- **Surface modes** (default, glassmorphism, neumorphism) + theme toggle (light/dark) with per-widget chrome.
- **PWA ready** using `@ducanh2912/next-pwa` plus `app/manifest.ts` for offline use/install prompts.
- **Icon search API proxy** (`/api/icons`) that streams Iconify results for the quick-links picker.

### Getting started

```bash
npm install
npm run dev
# app runs on http://localhost:3000
```

### Project structure

```
src/
  app/                # App Router routes, global styles, manifest
  components/         # Shared shadcn/ui wrappers + core icon button
  modules/
    dashboard/        # Shell, board, picker, store, surface toggles
    widgets/          # Todo, notes, quick-links feature modules
  lib/                # IndexedDB repositories + utilities
  styles/             # SCSS tokens for board + surfaces
```

### IndexedDB schema

- `widgets`: layout metadata (`position`, `size`, `surface`, timestamps)
- `todos`, `notes`, `quicklinks`: per-widget data tables with `widgetId` FK + indexes
- `settings`: lightweight key/value store (currently surface style)

### Available scripts

| Command        | Description                       |
| -------------- | --------------------------------- |
| `npm run dev`  | Start local dev server             |
| `npm run build`| Build production bundle            |
| `npm run start`| Serve production build             |
| `npm run lint` | Run ESLint (Next.js config)        |

### Future work

- Sync IndexedDB state with a remote data store.
- Add additional widgets (calendar, metrics, etc.).
- Hook up automated/visual regression tests once UI stabilises.
