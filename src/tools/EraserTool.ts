import type { WhiteboardElement, StrokeElement, Point, Camera } from '@/types';
import { useStore } from '@/store/useStore';
import { eraserSplit } from '@/utils/eraserSplit';
import type { ToolHandler } from './types';

function getEraserSettings() {
  return useStore.getState().eraserSettings;
}

function getPageElements(): WhiteboardElement[] {
  const { elements, currentPageId } = useStore.getState();
  return elements[currentPageId] ?? [];
}

export const EraserTool: ToolHandler = {
  onPointerDown(_e, worldX, worldY, _camera) {
    const size = getEraserSettings().size;
    const circle = { x: worldX, y: worldY, radius: size / 2 };
    eraseAt(circle);
  },

  onPointerMove(_e, worldX, worldY, _camera) {
    const size = getEraserSettings().size;
    const circle = { x: worldX, y: worldY, radius: size / 2 };
    eraseAt(circle);
  },

  onPointerUp(_e, worldX, worldY, _camera) {
    const size = getEraserSettings().size;
    const circle = { x: worldX, y: worldY, radius: size / 2 };
    eraseAt(circle);
  },
};

function eraseAt(circle: { x: number; y: number; radius: number }) {
  const elements = getPageElements();
  const store = useStore.getState();

  for (const element of elements) {
    if (element.type !== 'pen') continue;

    const stroke = element as StrokeElement;
    if (stroke.points.length < 1) continue;

    const result = eraserSplit(stroke, [circle]);

    if (result === null) continue;

    if (result.length === 0) {
      store.deleteElement(stroke.id);
      continue;
    }

    if (result.length === 1 && result[0].id === stroke.id) {
      continue;
    }

    store.deleteElement(stroke.id);

    for (const frag of result) {
      store.addElement(frag);
    }
  }
}
