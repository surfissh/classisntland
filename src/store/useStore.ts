import { create } from 'zustand';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { nanoid } from 'nanoid';
import type {
  AppState,
  WhiteboardElement,
  StrokeElement,
  ShapeElement,
  Page,
  Camera,
  ToolType,
  ShapeType,
  ToolbarPosition,
  ToolbarMode,
  Theme,
  RemoteUser,
  PenSettings,
  EraserSettings,
  ShapeSettings,
  Settings,
  Point,
} from '@/types';

function parseServerUrl(url: string): { serverUrl: string; room: string } {
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split('/').filter(Boolean);
    const room = pathParts.pop() || 'whiteboard';
    return { serverUrl: `${u.protocol}//${u.host}`, room };
  } catch {
    return { serverUrl: 'ws://localhost:1234', room: 'whiteboard' };
  }
}

const DEFAULT_SERVER_URL = 'ws://localhost:1234/whiteboard';

function getSavedServerUrl(): string {
  try {
    const saved = localStorage.getItem('whiteboard-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.serverUrl && typeof parsed.serverUrl === 'string') {
        return parsed.serverUrl;
      }
    }
  } catch {}
  return DEFAULT_SERVER_URL;
}

const { serverUrl: initialServerUrl, room: initialRoom } = parseServerUrl(getSavedServerUrl());

const doc = new Y.Doc();
let wsProvider = new WebsocketProvider(initialServerUrl, initialRoom, doc, {
  connect: true,
  maxBackoffTime: 10000,
});

const elementsArray = doc.getArray('elements');
const undoManager = new Y.UndoManager(elementsArray, {
  trackedOrigins: new Set([null]),
});

export { doc, wsProvider, undoManager };

export function updateAwareness(camera: Camera, cssW: number, cssH: number, pageId: string) {
  wsProvider.awareness.setLocalStateField('whiteboard', {
    camera,
    cssW,
    cssH,
    pageId,
  });
}

// ── Y.Map ↔ plain object conversion ─────────────────────────────────────────

function yMapToPoint(pm: Y.Map<any>): Point {
  return {
    x: pm.get('x') as number,
    y: pm.get('y') as number,
    pressure: pm.get('pressure') as number,
  };
}

function pointToYMap(p: Point): Y.Map<any> {
  const m = new Y.Map();
  m.set('x', p.x);
  m.set('y', p.y);
  m.set('pressure', p.pressure);
  return m;
}

function yMapToElement(em: Y.Map<any>): WhiteboardElement {
  const type = em.get('type') as string;
  const style = em.get('style') as Y.Map<any>;
  const base: any = {
    id: em.get('id') as string,
    type,
    style: {
      color: style.get('color') as string,
      opacity: style.get('opacity') as number,
    },
    pageId: em.get('pageId') as string,
    createdAt: em.get('createdAt') as number,
    userId: em.get('userId') as string,
  };

  if (type === 'pen') {
    const pointsArr = em.get('points') as Y.Array<Y.Map<any>>;
    return {
      ...base,
      type: 'pen',
      points: pointsArr.toArray().map(yMapToPoint),
      baseWidth: em.get('baseWidth') as number,
    } as StrokeElement;
  }

  return {
    ...base,
    type: type as ToolType,
    shapeType: em.get('shapeType') as ShapeType,
    x: em.get('x') as number,
    y: em.get('y') as number,
    width: em.get('width') as number,
    height: em.get('height') as number,
    startAngle: em.get('startAngle') as number | undefined,
    endAngle: em.get('endAngle') as number | undefined,
    strokeWidth: em.get('strokeWidth') as number,
    fillColor: em.get('fillColor') as string | null,
    showArrow: em.get('showArrow') as boolean | undefined,
  } as ShapeElement;
}

function elementToYMap(el: WhiteboardElement): Y.Map<any> {
  const m = new Y.Map();
  m.set('id', el.id);
  m.set('type', el.type);
  m.set('pageId', el.pageId);
  m.set('createdAt', el.createdAt);
  m.set('userId', el.userId);

  const style = new Y.Map();
  style.set('color', el.style.color);
  style.set('opacity', el.style.opacity);
  m.set('style', style);

  if (el.type === 'pen') {
    const stroke = el as StrokeElement;
    m.set('baseWidth', stroke.baseWidth);
    const pointsArr = new Y.Array();
    for (const p of stroke.points) {
      pointsArr.push([pointToYMap(p)]);
    }
    m.set('points', pointsArr);
  } else {
    const shape = el as ShapeElement;
    m.set('shapeType', shape.shapeType);
    m.set('x', shape.x);
    m.set('y', shape.y);
    m.set('width', shape.width);
    m.set('height', shape.height);
    m.set('strokeWidth', shape.strokeWidth);
    m.set('fillColor', shape.fillColor);
    if (shape.startAngle !== undefined) m.set('startAngle', shape.startAngle);
    if (shape.endAngle !== undefined) m.set('endAngle', shape.endAngle);
    if (shape.showArrow !== undefined) m.set('showArrow', shape.showArrow);
  }

  return m;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAllElements(): WhiteboardElement[] {
  const out: WhiteboardElement[] = [];
  for (let i = 0; i < elementsArray.length; i++) {
    const em = elementsArray.get(i);
    if (em && typeof em === 'object' && 'get' in em) {
      out.push(yMapToElement(em as Y.Map<any>));
    }
  }
  return out;
}

function getPageElements(pageId: string): WhiteboardElement[] {
  return getAllElements().filter((e) => e.pageId === pageId);
}

function getElementIndex(id: string): number {
  for (let i = 0; i < elementsArray.length; i++) {
    const em = elementsArray.get(i);
    if (em && typeof em === 'object' && 'get' in em) {
      if ((em as Y.Map<any>).get('id') === id) return i;
    }
  }
  return -1;
}

// ── Store interface ──────────────────────────────────────────────────────────

interface StoreState extends AppState {
  init: () => void;

  setActiveTool: (tool: ToolType) => void;
  setShapeType: (type: ShapeType) => void;
  setCurrentPage: (pageId: string) => void;
  setCamera: (camera: Partial<Camera>) => void;

  addElement: (element: WhiteboardElement) => void;
  addPointToStroke: (strokeId: string, point: Point) => void;
  appendPointsToStroke: (strokeId: string, points: Point[]) => void;
  deletePointRange: (strokeId: string, start: number, count: number) => void;
  replaceStrokePoints: (strokeId: string, points: Point[]) => void;
  updateElement: (id: string, changes: Partial<WhiteboardElement> & { points?: { x: number; y: number; pressure: number }[] }) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  clearPage: () => void;

  setSelectedElementIds: (ids: string[]) => void;

  setPenSettings: (s: Partial<PenSettings>) => void;
  setEraserSettings: (s: Partial<EraserSettings>) => void;
  setShapeSettings: (s: Partial<ShapeSettings>) => void;

  addPage: () => void;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;

  setSettings: (s: Partial<Settings>) => void;

  observePageElements: (pageId: string) => void;
  syncElementsForPage: (pageId: string) => void;

  undo: () => void;
  redo: () => void;
  getSelectedElements: () => WhiteboardElement[];
  reconnectToServer: (serverUrl: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  pages: [],
  currentPageId: 'page-1',
  elements: {},
  camera: { x: 0, y: 0, zoom: 1 },
  activeTool: 'select' as ToolType,
  selectedElementIds: [],
  remoteUsers: {},
  penSettings: {
    color: '#000000',
    baseWidth: 4,
  },
  eraserSettings: {
    size: 40,
  },
  shapeSettings: {
    color: '#000000',
    strokeWidth: 3,
    fillColor: null,
  },
  shapeType: 'rectangle' as ShapeType,
  settings: {
    toolbarPosition: 'bottom' as ToolbarPosition,
    toolbarMode: 'fill' as ToolbarMode,
    showToolbar: true,
    serverUrl: DEFAULT_SERVER_URL,
    theme: 'system' as Theme,
  },

  syncElementsForPage: (pageId: string) => {
    const pageElements = getPageElements(pageId);
    const { elements } = get();
    set({ elements: { ...elements, [pageId]: pageElements } });
  },

  init: () => {
    const pagesMap = doc.getMap<{ name: string; camera: { x: number; y: number; zoom: number } }>('pages');

    const syncPages = () => {
      const pages: Page[] = [];
      pagesMap.forEach((val, key) => {
        pages.push({
          id: key,
          name: val.name,
          camera: val.camera || { x: 0, y: 0, zoom: 1 },
        });
      });
      if (pages.length === 0) {
        const defaultId = 'page-1';
        pagesMap.set(defaultId, { name: 'Page 1', camera: { x: 0, y: 0, zoom: 1 } });
        pages.push({ id: defaultId, name: 'Page 1', camera: { x: 0, y: 0, zoom: 1 } });
      }
      set({ pages });
      const current = get().currentPageId;
      if (!pages.find(p => p.id === current)) {
        set({ currentPageId: pages[0].id });
      }
      get().syncElementsForPage(get().currentPageId);
    };

    pagesMap.observe(syncPages);
    syncPages();

    elementsArray.observeDeep(() => {
      get().syncElementsForPage(get().currentPageId);
    });

    wsProvider.awareness.on('change', () => {
      const states = wsProvider.awareness.getStates();
      const mine = wsProvider.awareness.clientID;
      const users: Record<number, RemoteUser> = {};
      states.forEach((state, clientId) => {
        if (clientId === mine) return;
        const wb = state.whiteboard as any;
        if (wb && wb.camera && wb.pageId) {
          users[clientId] = {
            clientId,
            camera: wb.camera,
            cssW: wb.cssW || window.innerWidth,
            cssH: wb.cssH || window.innerHeight,
            pageId: wb.pageId,
          };
        }
      });
      set({ remoteUsers: users });
    });

    get().syncElementsForPage(get().currentPageId);
  },

  observePageElements: (pageId: string) => {
    get().syncElementsForPage(pageId);
  },

  setActiveTool: (tool) => set({ activeTool: tool }),

  setShapeType: (type) => set({ shapeType: type }),

  setCurrentPage: (pageId) => {
    set({ currentPageId: pageId, selectedElementIds: [] });
    get().syncElementsForPage(pageId);
  },

  setCamera: (partial) =>
    set((s) => ({ camera: { ...s.camera, ...partial } })),

  addElement: (element) => {
    elementsArray.push([elementToYMap(element) as any]);
  },

  addPointToStroke: (strokeId, point) => {
    const idx = getElementIndex(strokeId);
    if (idx === -1) return;
    const em = elementsArray.get(idx);
    if (!em || typeof em !== 'object' || !('get' in em)) return;
    const pointsArr = (em as Y.Map<any>).get('points') as Y.Array<Y.Map<any>>;
    if (!pointsArr) return;
    pointsArr.push([pointToYMap(point)]);
  },

  appendPointsToStroke: (strokeId, points) => {
    const idx = getElementIndex(strokeId);
    if (idx === -1) return;
    const em = elementsArray.get(idx);
    if (!em || typeof em !== 'object' || !('get' in em)) return;
    const pointsArr = (em as Y.Map<any>).get('points') as Y.Array<Y.Map<any>>;
    if (!pointsArr) return;
    doc.transact(() => {
      for (const p of points) {
        pointsArr.push([pointToYMap(p)]);
      }
    });
  },

  deletePointRange: (strokeId, start, count) => {
    const idx = getElementIndex(strokeId);
    if (idx === -1) return;
    const em = elementsArray.get(idx);
    if (!em || typeof em !== 'object' || !('get' in em)) return;
    const pointsArr = (em as Y.Map<any>).get('points') as Y.Array<Y.Map<any>>;
    if (!pointsArr) return;
    pointsArr.delete(start, count);
  },

  replaceStrokePoints: (strokeId, points) => {
    const idx = getElementIndex(strokeId);
    if (idx === -1) return;
    const em = elementsArray.get(idx);
    if (!em || typeof em !== 'object' || !('get' in em)) return;
    const pointsArr = (em as Y.Map<any>).get('points') as Y.Array<Y.Map<any>>;
    if (!pointsArr) return;
    doc.transact(() => {
      pointsArr.delete(0, pointsArr.length);
      for (const p of points) {
        pointsArr.push([pointToYMap(p)]);
      }
    });
  },

  updateElement: (id, changes) => {
    const idx = getElementIndex(id);
    if (idx === -1) return;
    const em = elementsArray.get(idx);
    if (!em || typeof em !== 'object' || !('get' in em)) return;
    const m = em as Y.Map<any>;

    if ('style' in changes) {
      const newStyle = changes.style;
      if (newStyle) {
        const styleMap = m.get('style') as Y.Map<any>;
        if (styleMap) {
          if (newStyle.color !== undefined) styleMap.set('color', newStyle.color);
          if (newStyle.opacity !== undefined) styleMap.set('opacity', newStyle.opacity);
        }
      }
      delete changes.style;
    }

    const points = changes.points;
    if (points !== undefined) {
      const pointsArr = m.get('points') as Y.Array<Y.Map<any>>;
      if (pointsArr) {
        doc.transact(() => {
          pointsArr.delete(0, pointsArr.length);
          for (const p of points) {
            pointsArr.push([pointToYMap(p)]);
          }
        });
      }
      delete changes.points;
    }

    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined) {
        m.set(key, value);
      }
    }
  },

  deleteElement: (id) => {
    const idx = getElementIndex(id);
    if (idx === -1) return;
    elementsArray.delete(idx, 1);
  },

  deleteElements: (ids) => {
    const sorted: number[] = [];
    for (const id of ids) {
      const idx = getElementIndex(id);
      if (idx !== -1) sorted.push(idx);
    }
    sorted.sort((a, b) => b - a);
    for (const idx of sorted) {
      elementsArray.delete(idx, 1);
    }
  },

  clearPage: () => {
    const pageId = get().currentPageId;
    const indicesToDelete: number[] = [];
    for (let i = elementsArray.length - 1; i >= 0; i--) {
      const em = elementsArray.get(i);
      if (em && typeof em === 'object' && 'get' in em) {
        if ((em as Y.Map<any>).get('pageId') === pageId) {
          indicesToDelete.push(i);
        }
      }
    }
    for (const idx of indicesToDelete) {
      elementsArray.delete(idx, 1);
    }
    set({ selectedElementIds: [] });
  },

  setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),

  setPenSettings: (s) => set((state) => ({ penSettings: { ...state.penSettings, ...s } })),
  setEraserSettings: (s) => set((state) => ({ eraserSettings: { ...state.eraserSettings, ...s } })),
  setShapeSettings: (s) => set((state) => ({ shapeSettings: { ...state.shapeSettings, ...s } })),

  addPage: () => {
    const id = nanoid(8);
    const pagesMap = doc.getMap<{ name: string; camera: { x: number; y: number; zoom: number } }>('pages');
    const idx = pagesMap.size + 1;
    pagesMap.set(id, { name: `Page ${idx}`, camera: { x: 0, y: 0, zoom: 1 } });
    set({ currentPageId: id });
    get().syncElementsForPage(id);
  },

  deletePage: (pageId) => {
    const { pages } = get();
    if (pages.length <= 1) return;
    const pagesMap = doc.getMap<{ name: string; camera: { x: number; y: number; zoom: number } }>('pages');
    pagesMap.delete(pageId);
    const toDelete: number[] = [];
    for (let i = elementsArray.length - 1; i >= 0; i--) {
      const em = elementsArray.get(i);
      if (em && typeof em === 'object' && 'get' in em) {
        if ((em as Y.Map<any>).get('pageId') === pageId) {
          toDelete.push(i);
        }
      }
    }
    for (const idx of toDelete) {
      elementsArray.delete(idx, 1);
    }
    if (get().currentPageId === pageId) {
      const remaining = pages.filter((p) => p.id !== pageId);
      set({ currentPageId: remaining[0].id });
    }
  },

  renamePage: (pageId, name) => {
    const pagesMap = doc.getMap<{ name: string; camera: { x: number; y: number; zoom: number } }>('pages');
    const entry = pagesMap.get(pageId);
    if (entry) {
      pagesMap.set(pageId, { ...entry, name });
    }
  },

  setSettings: (s) => {
    const newSettings = { ...get().settings, ...s };
    set({ settings: newSettings });
    localStorage.setItem('whiteboard-settings', JSON.stringify(newSettings));
  },

  undo: () => undoManager.undo(),
  redo: () => undoManager.redo(),
  reconnectToServer: (serverUrl: string) => {
    const { serverUrl: url, room: newRoom } = parseServerUrl(serverUrl);
    wsProvider.destroy();
    wsProvider = new WebsocketProvider(url, newRoom, doc, {
      connect: true,
      maxBackoffTime: 10000,
    });
  },

  getSelectedElements: () => {
    const { elements, currentPageId, selectedElementIds } = get();
    const pageElements = elements[currentPageId] || [];
    return pageElements.filter((e) => selectedElementIds.includes(e.id));
  },
}));

try {
  const saved = localStorage.getItem('whiteboard-settings');
  if (saved) {
    const parsed = JSON.parse(saved);
    useStore.getState().setSettings(parsed);
  }
} catch {}

export default useStore;
