import type {
  WhiteboardElement,
  StrokeElement,
  ShapeElement,
  Point,
  Camera,
  PenSettings,
} from '@/types';
import { useStore } from '@/store/useStore';
import { nanoid } from 'nanoid';
import { computePressure } from '@/utils/pressure';
import type { ToolHandler, ToolPreview } from './types';

interface PenState {
  currentId: string | null;
  points: Point[];
  lastPoint: { x: number; y: number; time: number } | null;
}

const state: PenState = {
  currentId: null,
  points: [],
  lastPoint: null,
};

let pendingPoints: Point[] = [];
let penRafId: number | null = null;

function flushPoints() {
  if (penRafId !== null) {
    cancelAnimationFrame(penRafId);
    penRafId = null;
  }
  if (pendingPoints.length === 0 || state.currentId === null) return;
  useStore.getState().appendPointsToStroke(state.currentId, pendingPoints);
  pendingPoints = [];
}

function scheduleFlush() {
  if (penRafId !== null) return;
  penRafId = requestAnimationFrame(() => {
    penRafId = null;
    flushPoints();
  });
}

function createStrokeElement(
  id: string,
  points: Point[],
  settings: PenSettings,
  pageId: string,
  userId: string,
): StrokeElement {
  return {
    id,
    type: 'pen',
    points,
    baseWidth: settings.baseWidth,
    style: {
      color: settings.color,
      opacity: 1,
    },
    pageId,
    createdAt: Date.now(),
    userId,
  };
}

function getPenSettings() {
  return useStore.getState().penSettings;
}

export const PenTool: ToolHandler = {
  abort() {
    flushPoints();
    if (state.currentId !== null) {
      useStore.getState().deleteElement(state.currentId);
    }
    state.currentId = null;
    state.points = [];
    state.lastPoint = null;
  },

  onPointerDown(_e, worldX, worldY, _camera) {
    flushPoints();
    const settings = getPenSettings();
    const now = performance.now();
    const id = nanoid();

    state.currentId = id;
    state.points = [{ x: worldX, y: worldY, pressure: 0.5 }];
    state.lastPoint = { x: worldX, y: worldY, time: now };

    const store = useStore.getState();
    const element = createStrokeElement(
      id,
      [{ x: worldX, y: worldY, pressure: 0.5 }],
      settings,
      store.currentPageId,
      '',
    );
    store.addElement(element);
  },

  onPointerMove(_e, worldX, worldY, _camera) {
    if (state.currentId === null || state.lastPoint === null) return;

    const now = performance.now();
    const pressure = computePressure(state.lastPoint, { x: worldX, y: worldY, time: now });
    const clamped = Math.max(0, Math.min(1, pressure));

    const point = { x: worldX, y: worldY, pressure: clamped };
    state.points.push(point);
    state.lastPoint = { x: worldX, y: worldY, time: now };

    pendingPoints.push(point);
    scheduleFlush();
  },

  getPreview(): ToolPreview | null {
    if (!state.currentId || state.points.length === 0) return null;
    const settings = getPenSettings();
    return {
      type: 'pen',
      points: [...state.points, ...pendingPoints],
      color: settings.color,
      baseWidth: settings.baseWidth,
      opacity: 0.8,
    };
  },

  onPointerUp(_e, _worldX, _worldY, _camera) {
    flushPoints();
    state.currentId = null;
    state.points = [];
    state.lastPoint = null;
  },
};
