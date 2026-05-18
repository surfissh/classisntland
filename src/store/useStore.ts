import { create } from 'zustand';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { nanoid } from 'nanoid';
import type {
  AppState,
  WhiteboardElement,
  Page,
  Camera,
  ToolType,
  ShapeType,
  ToolbarPosition,
  ToolbarMode,
  PenSettings,
  EraserSettings,
  ShapeSettings,
  Settings,
} from '@/types';

const WS_URL = 'ws://localhost:1234';
const ROOM = 'whiteboard';

const doc = new Y.Doc();
const wsProvider = new WebsocketProvider(WS_URL, ROOM, doc, {
  connect: true,
  maxBackoffTime: 10000,
});

const elementsArray = doc.getArray('elements');
const undoManager = new Y.UndoManager(elementsArray, {
  trackedOrigins: new Set([null]),
  captureTimeout: 500,
});

export { doc, wsProvider, undoManager };

function getAllElements(): WhiteboardElement[] {
  return elementsArray.toArray() as unknown as WhiteboardElement[];
}

function getPageElements(pageId: string): WhiteboardElement[] {
  return getAllElements().filter((e: any) => e && e.pageId === pageId);
}

function getElementIndex(id: string): number {
  for (let i = 0; i < elementsArray.length; i++) {
    if ((elementsArray.get(i) as any)?.id === id) return i;
  }
  return -1;
}

interface StoreState extends AppState {
  init: () => void;

  setActiveTool: (tool: ToolType) => void;
  setShapeType: (type: ShapeType) => void;
  setCurrentPage: (pageId: string) => void;
  setCamera: (camera: Partial<Camera>) => void;

  addElement: (element: WhiteboardElement) => void;
  updateElement: (id: string, changes: Partial<WhiteboardElement>) => void;
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
}

export const useStore = create<StoreState>((set, get) => ({
  pages: [],
  currentPageId: 'page-1',
  elements: {},
  camera: { x: 0, y: 0, zoom: 1 },
  activeTool: 'select' as ToolType,
  selectedElementIds: [],
  penSettings: {
    color: '#ffffff',
    baseWidth: 4,
    minWidth: 2,
    maxWidth: 12,
  },
  eraserSettings: {
    size: 20,
  },
  shapeSettings: {
    color: '#ffffff',
    strokeWidth: 3,
    fillColor: null,
  },
  shapeType: 'rectangle' as ShapeType,
  settings: {
    toolbarPosition: 'bottom' as ToolbarPosition,
    toolbarMode: 'fill' as ToolbarMode,
    showToolbar: true,
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

    elementsArray.observe(() => {
      get().syncElementsForPage(get().currentPageId);
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
    elementsArray.push([element as unknown as any]);
  },

  updateElement: (id, changes) => {
    const idx = getElementIndex(id);
    if (idx === -1) return;
    const current = elementsArray.get(idx) as unknown as Record<string, any>;
    const merged = { ...current, ...changes };
    elementsArray.delete(idx, 1);
    elementsArray.insert(idx, [merged as any]);
  },

  deleteElement: (id) => {
    const idx = getElementIndex(id);
    if (idx === -1) return;
    elementsArray.delete(idx, 1);
  },

  deleteElements: (ids) => {
    ids.forEach((id) => {
      const idx = getElementIndex(id);
      if (idx !== -1) elementsArray.delete(idx, 1);
    });
  },

  clearPage: () => {
    const pageId = get().currentPageId;
    const indicesToDelete: number[] = [];
    for (let i = elementsArray.length - 1; i >= 0; i--) {
      if ((elementsArray.get(i) as any)?.pageId === pageId) {
        indicesToDelete.push(i);
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
      if ((elementsArray.get(i) as any)?.pageId === pageId) {
        toDelete.push(i);
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

  getSelectedElements: () => {
    const { elements, currentPageId, selectedElementIds } = get();
    const pageElements = elements[currentPageId] || [];
    return pageElements.filter((e) => selectedElementIds.includes(e.id));
  },
}));

// load saved settings from localStorage
try {
  const saved = localStorage.getItem('whiteboard-settings');
  if (saved) {
    const parsed = JSON.parse(saved);
    useStore.getState().setSettings(parsed);
  }
} catch {}

export default useStore;
