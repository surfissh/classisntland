import type { ShapeElement, ShapeType, Camera, ShapeSettings } from '@/types';
import { useStore } from '@/store/useStore';
import { nanoid } from 'nanoid';
import type { ToolHandler, ToolPreview } from './types';

interface ShapeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  drawing: boolean;
}

const state: ShapeState = {
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  drawing: false,
};

function getShapeType(): ShapeType {
  return useStore.getState().shapeType;
}

function getSettings(): ShapeSettings {
  return useStore.getState().shapeSettings;
}

export const ShapeTool: ToolHandler = {
  onPointerDown(_e, worldX, worldY, _camera) {
    state.startX = worldX;
    state.startY = worldY;
    state.currentX = worldX;
    state.currentY = worldY;
    state.drawing = true;
  },

  onPointerMove(_e, worldX, worldY, _camera) {
    if (!state.drawing) return;
    state.currentX = worldX;
    state.currentY = worldY;
  },

  onPointerUp(_e, _worldX, _worldY, _camera) {
    if (!state.drawing) return;
    state.drawing = false;

    const dx = state.currentX - state.startX;
    const dy = state.currentY - state.startY;

    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return;

    const shapeType = getShapeType();
    const settings = getSettings();
    const store = useStore.getState();

    let x: number;
    let y: number;
    let width: number;
    let height: number;

    if (shapeType === 'circle') {
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      width = size;
      height = size;
      x = dx >= 0 ? state.startX : state.startX - size;
      y = dy >= 0 ? state.startY : state.startY - size;
    } else {
      x = Math.min(state.startX, state.currentX);
      y = Math.min(state.startY, state.currentY);
      width = Math.abs(dx);
      height = Math.abs(dy);
    }

    const baseElement = {
      id: nanoid(),
      type: shapeType as ShapeElement['type'],
      shapeType,
      x,
      y,
      width,
      height,
      strokeWidth: settings.strokeWidth,
      fillColor: settings.fillColor,
      style: {
        color: settings.color,
        opacity: 1,
      },
      pageId: store.currentPageId,
      createdAt: Date.now(),
      userId: '',
    };

    let element: ShapeElement;

    switch (shapeType) {
      case 'rectangle':
        element = { ...baseElement, type: 'rectangle' };
        break;
      case 'circle':
        element = { ...baseElement, type: 'circle' };
        break;
      case 'arc':
        element = {
          ...baseElement,
          type: 'arc',
          startAngle: Math.atan2(dy, dx),
          endAngle: 0,
        };
        break;
      case 'line':
        element = { ...baseElement, type: 'line' };
        break;
      case 'arrow':
        element = { ...baseElement, type: 'arrow', showArrow: true };
        break;
      default:
        element = { ...baseElement, type: 'rectangle' };
    }

    store.addElement(element);
  },

  getPreview(): ToolPreview | null {
    if (!state.drawing) return null;

    const shapeType = getShapeType();
    const settings = getSettings();

    const dx = state.currentX - state.startX;
    const dy = state.currentY - state.startY;

    let x: number;
    let y: number;
    let width: number;
    let height: number;

    if (shapeType === 'circle') {
      const size = Math.max(Math.abs(dx), Math.abs(dy));
      width = size;
      height = size;
      x = dx >= 0 ? state.startX : state.startX - size;
      y = dy >= 0 ? state.startY : state.startY - size;
    } else {
      x = Math.min(state.startX, state.currentX);
      y = Math.min(state.startY, state.currentY);
      width = Math.abs(dx);
      height = Math.abs(dy);
    }

    return {
      type: shapeType as ToolPreview['type'],
      x, y, width, height,
      color: settings.color,
      strokeWidth: settings.strokeWidth,
      fillColor: settings.fillColor,
      startAngle: shapeType === 'arc' ? Math.atan2(dy, dx) : undefined,
      endAngle: shapeType === 'arc' ? 0 : undefined,
      showArrow: shapeType === 'arrow',
      opacity: 0.5,
    };
  },
};
