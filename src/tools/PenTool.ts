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
import type { ToolHandler } from './types';

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
  onPointerDown(_e, worldX, worldY, _camera) {
    const settings = getPenSettings();
    const now = performance.now();
    const id = nanoid();

    state.currentId = id;
    state.points = [{ x: worldX, y: worldY, pressure: 0.5 }];
    state.lastPoint = { x: worldX, y: worldY, time: now };
  },

  onPointerMove(_e, worldX, worldY, _camera) {
    if (state.currentId === null || state.lastPoint === null) return;

    const now = performance.now();
    const pressure = computePressure(state.lastPoint, { x: worldX, y: worldY, time: now });
    const clamped = Math.max(0, Math.min(1, pressure));

    state.points.push({ x: worldX, y: worldY, pressure: clamped });
    state.lastPoint = { x: worldX, y: worldY, time: now };
  },

  onPointerUp(_e, _worldX, _worldY, _camera) {
    if (state.currentId === null || state.points.length === 0) {
      state.currentId = null;
      state.points = [];
      state.lastPoint = null;
      return;
    }

    const store = useStore.getState();
    const settings = getPenSettings();
    const element = createStrokeElement(
      state.currentId,
      [...state.points],
      settings,
      store.currentPageId,
      '', // userId — populated by awareness or left empty
    );

    store.addElement(element);

    state.currentId = null;
    state.points = [];
    state.lastPoint = null;
  },
};
