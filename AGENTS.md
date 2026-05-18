# AGENTS.md — Whiteboard App (classisntland4)

## Quickstart

```bash
npm run server   # Terminal 1: start YJS WebSocket sync server (ws://localhost:1234)
npm run dev      # Terminal 2: start Vite dev server (http://localhost:5173)
```

- `npx tsc --noEmit` — typecheck only (no emit)
- `npm run build` — `tsc -b && vite build`

## Architecture

### Two package.json files
- `/package.json` — React client (Vite + TS + Tailwind)
- `/server/package.json` — Node.js sync server (y-websocket). Install separately: `cd server && npm install`

### Path alias
`@/` → `src/` (configured in `vite.config.ts` and `tsconfig.json`)

### YJS data model (src/store/useStore.ts:23-31)
- **Single `doc.getArray('elements')`** stores ALL elements across all pages.
  Elements are filtered by `pageId` in the store. Do NOT create per-page arrays.
- **`doc.getMap('pages')`** stores page metadata (id → { name, camera }).
- **`Y.UndoManager`** tracks the single `elementsArray`. `undo()`/`redo()` work globally.
- The store observes `elementsArray` changes and syncs to Zustand's `elements: Record<pageId, Element[]>`.

### Tool system
- Tools are registered in `App.tsx` via `registerTool(type, handler)` from `src/canvas/Canvas.tsx:9`.
- The `Canvas` component converts screen → world coords, then dispatches via `toolRegistry`.
- Tool handler signature (`src/tools/types.ts`):
  ```ts
  onPointerDown?(e: PointerEvent, worldX: number, worldY: number, camera: Camera): void
  ```
- Tools operate entirely in **world space**. Each tool mutates the Zustand store, which propagates to YJS.

### Canvas rendering (`src/canvas/`)
- `renderer.ts` — `renderAll()` draws everything: background grid, elements, selection handles, tool preview
- `hitTest.ts` — point and rect hit testing for selection
- `spatialIndex.ts` — grid-based spatial index (used by eraser)
- Canvas handles: two-finger pinch/zoom, right-button drag pan, scroll-wheel zoom

### Eraser algorithm (`src/utils/eraserSplit.ts`)
- Takes a `StrokeElement` + array of `Circle` objects (eraser path)
- Computes segment-circle intersections, classifies segments as inside/outside eraser
- Returns array of surviving stroke fragments (geometric splitting, not whole-stroke deletion)

### UI components (`src/ui/`)
- `Toolbar.tsx` — supports 5 positions: top/bottom/left/right/floating, fill/compact modes
- `SecondaryMenu.tsx` — per-tool contextual menu (second click on active tool)
- `PagePreview.tsx` — SVG-based page thumbnail rendering
- All UI uses Tailwind utility classes only; dark theme (neutral-800/900)

### Server (`server/index.js`)
- Uses `y-websocket/bin/utils.js` `setupWSConnection`
- HTTP + WebSocket on port 1234
- Room name: `whiteboard`

## Key conventions
- Element IDs generated with `nanoid`
- Coordinates: world coordinates stored in elements; screen coords only in Canvas event handling
- Shapes use `x, y, width, height` (top-left origin, not center)
- No test framework, no linter configured yet
