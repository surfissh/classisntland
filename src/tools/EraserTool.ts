import type { WhiteboardElement, StrokeElement, Point, Camera } from '@/types';
import { useStore, doc } from '@/store/useStore';
import { eraserSplit } from '@/utils/eraserSplit';
import type { ToolHandler } from './types';

function getEraserSettings() {
  return useStore.getState().eraserSettings;
}

function getPageElements(): WhiteboardElement[] {
  const { elements, currentPageId } = useStore.getState();
  return elements[currentPageId] ?? [];
}

function strokeBounds(stroke: StrokeElement) {
  const pts = stroke.points;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = stroke.baseWidth * 1.5;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

function rectOverlapsCircle(
  rx: number, ry: number, rw: number, rh: number,
  cx: number, cy: number, cr: number,
): boolean {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy <= cr * cr;
}

interface Circle {
  x: number;
  y: number;
  radius: number;
}

let pendingCircles: Circle[] = [];
let rafId: number | null = null;

function flushPending() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (pendingCircles.length === 0) return;
  const circles = pendingCircles;
  pendingCircles = [];
  eraseAtBatch(circles);
}

function scheduleFlush() {
  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (pendingCircles.length === 0) return;
    const circles = pendingCircles;
    pendingCircles = [];
    eraseAtBatch(circles);
  });
}

export const EraserTool: ToolHandler = {
  onPointerDown(_e, worldX, worldY, _camera) {
    flushPending();
    const size = getEraserSettings().size;
    pendingCircles.push({ x: worldX, y: worldY, radius: size / 2 });
    scheduleFlush();
  },

  onPointerMove(_e, worldX, worldY, _camera) {
    const size = getEraserSettings().size;
    pendingCircles.push({ x: worldX, y: worldY, radius: size / 2 });
    scheduleFlush();
  },

  onPointerUp(_e, worldX, worldY, _camera) {
    const size = getEraserSettings().size;
    pendingCircles.push({ x: worldX, y: worldY, radius: size / 2 });
    flushPending();
  },
};

function eraseAtBatch(circles: Circle[]) {
  const elements = getPageElements();
  const store = useStore.getState();

  const toDelete: string[] = [];
  const toAdd: WhiteboardElement[] = [];

  for (const element of elements) {
    if (element.type !== 'pen') continue;

    const stroke = element as StrokeElement;
    if (stroke.points.length < 1) continue;

    const b = strokeBounds(stroke);
    let anyCircleOverlaps = false;
    for (const c of circles) {
      if (rectOverlapsCircle(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY, c.x, c.y, c.radius)) {
        anyCircleOverlaps = true;
        break;
      }
    }
    if (!anyCircleOverlaps) continue;

    const result = eraserSplit(stroke, circles);

    if (result === null) continue;

    if (result.length === 0) {
      toDelete.push(stroke.id);
      continue;
    }

    if (result.length === 1 && result[0].id === stroke.id) {
      continue;
    }

    toDelete.push(stroke.id);
    for (const frag of result) {
      toAdd.push(frag);
    }
  }

  if (toDelete.length === 0 && toAdd.length === 0) return;

  doc.transact(() => {
    for (const id of toDelete) {
      store.deleteElement(id);
    }
    for (const el of toAdd) {
      store.addElement(el);
    }
  });
}
