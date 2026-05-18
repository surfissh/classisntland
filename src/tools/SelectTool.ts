import type {
  WhiteboardElement,
  StrokeElement,
  ShapeElement,
  Camera,
} from '@/types';
import { useStore } from '@/store/useStore';
import type { ToolHandler, ToolPreview } from './types';

const HANDLE_SIZE = 8;
const HIT_THRESHOLD = 6;

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  type: 'none' | 'drag' | 'resize' | 'marquee';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  handlePos?: HandlePosition;
  elementOrigins: { id: string; x: number; y: number; width: number; height: number }[];
  selectionOrigins: { x: number; y: number; width: number; height: number };
}

const state: DragState = {
  type: 'none',
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  elementOrigins: [],
  selectionOrigins: { x: 0, y: 0, width: 0, height: 0 },
};

function getPageElements(): WhiteboardElement[] {
  const { elements, currentPageId } = useStore.getState();
  return elements[currentPageId] ?? [];
}

function distToSegment(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function hitTestStroke(px: number, py: number, stroke: StrokeElement): boolean {
  const pts = stroke.points;
  if (pts.length === 0) return false;
  if (pts.length === 1) {
    return Math.hypot(px - pts[0].x, py - pts[0].y) <= HIT_THRESHOLD;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment(px, py, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    if (d <= HIT_THRESHOLD) return true;
  }
  return false;
}

function hitTestShape(px: number, py: number, shape: ShapeElement): boolean {
  const { x, y, width, height, shapeType } = shape;

  if (shapeType === 'rectangle') {
    return px >= x && px <= x + width && py >= y && py <= y + height;
  }

  if (shapeType === 'circle') {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    if (rx < 0.001 || ry < 0.001) return false;
    const nx = (px - cx) / rx;
    const ny = (py - cy) / ry;
    return nx * nx + ny * ny <= 1;
  }

  if (shapeType === 'line' || shapeType === 'arrow') {
    return distToSegment(px, py, x, y, x + width, y + height) <= HIT_THRESHOLD;
  }

  if (shapeType === 'arc') {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    if (rx < 0.001 || ry < 0.001) return false;
    const nx = (px - cx) / rx;
    const ny = (py - cy) / ry;
    const dist = nx * nx + ny * ny;
    if (Math.abs(dist - 1) > 0.15) return false;

    const angle = Math.atan2(ny, nx);
    const startA = shape.startAngle ?? 0;
    const endA = shape.endAngle ?? Math.PI * 2;
    let sweep = endA - startA;
    while (sweep < 0) sweep += Math.PI * 2;
    let a = angle;
    while (a < startA) a += Math.PI * 2;
    return a <= startA + sweep;
  }

  return px >= x && px <= x + width && py >= y && py <= y + height;
}

function hitTestElement(worldX: number, worldY: number, element: WhiteboardElement): boolean {
  if (element.type === 'pen') {
    return hitTestStroke(worldX, worldY, element as StrokeElement);
  }
  return hitTestShape(worldX, worldY, element as ShapeElement);
}

function hitTest(worldX: number, worldY: number): WhiteboardElement | null {
  const elements = getPageElements();
  for (let i = elements.length - 1; i >= 0; i--) {
    if (hitTestElement(worldX, worldY, elements[i])) {
      return elements[i];
    }
  }
  return null;
}

function getSelectionBounds(
  elements: WhiteboardElement[]
): { x: number; y: number; width: number; height: number } | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    let elMinX: number;
    let elMinY: number;
    let elMaxX: number;
    let elMaxY: number;

    if (el.type === 'pen') {
      const stroke = el as StrokeElement;
      for (const pt of stroke.points) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
      continue;
    }

    const shape = el as ShapeElement;
    elMinX = shape.x;
    elMinY = shape.y;
    elMaxX = shape.x + shape.width;
    elMaxY = shape.y + shape.height;

    minX = Math.min(minX, elMinX);
    minY = Math.min(minY, elMinY);
    maxX = Math.max(maxX, elMaxX);
    maxY = Math.max(maxY, elMaxY);
  }

  if (!isFinite(minX)) return null;

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

interface Handle {
  x: number;
  y: number;
  pos: HandlePosition;
}

function getResizeHandles(bounds: { x: number; y: number; width: number; height: number }): Handle[] {
  const { x, y, width, height } = bounds;
  const mx = x + width / 2;
  const my = y + height / 2;
  const ex = x + width;
  const ey = y + height;

  return [
    { x, y, pos: 'nw' },
    { x: mx, y, pos: 'n' },
    { x: ex, y, pos: 'ne' },
    { x: ex, y: my, pos: 'e' },
    { x: ex, y: ey, pos: 'se' },
    { x: mx, y: ey, pos: 's' },
    { x, y: ey, pos: 'sw' },
    { x, y: my, pos: 'w' },
  ];
}

function hitTestHandle(
  worldX: number,
  worldY: number,
  bounds: { x: number; y: number; width: number; height: number },
  zoom: number
): HandlePosition | null {
  const handles = getResizeHandles(bounds);
  const size = HANDLE_SIZE / zoom;

  for (const h of handles) {
    if (
      worldX >= h.x - size / 2 &&
      worldX <= h.x + size / 2 &&
      worldY >= h.y - size / 2 &&
      worldY <= h.y + size / 2
    ) {
      return h.pos;
    }
  }
  return null;
}

function getElementBounds(el: WhiteboardElement): { x: number; y: number; width: number; height: number } {
  if (el.type === 'pen') {
    const stroke = el as StrokeElement;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of stroke.points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  const sh = el as ShapeElement;
  return { x: sh.x, y: sh.y, width: sh.width, height: sh.height };
}

function isInsideRect(
  px: number, py: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function elementsInRect(
  rx: number, ry: number, rw: number, rh: number
): WhiteboardElement[] {
  const elements = getPageElements();
  const result: WhiteboardElement[] = [];

  for (const el of elements) {
    const bounds = getElementBounds(el);
    if (
      bounds.x >= rx &&
      bounds.y >= ry &&
      bounds.x + bounds.width <= rx + rw &&
      bounds.y + bounds.height <= ry + rh
    ) {
      result.push(el);
    }
  }

  return result;
}

export const SelectTool: ToolHandler = {
  onPointerDown(_e, worldX, worldY, camera) {
    const store = useStore.getState();
    const hitElement = hitTest(worldX, worldY);

    if (hitElement) {
      const isAlreadySelected = store.selectedElementIds.includes(hitElement.id);

      if (isAlreadySelected) {
        const selectedElements = store.getSelectedElements();

        if (selectedElements.length > 0) {
          const bounds = getSelectionBounds(selectedElements);
          if (bounds) {
            const handleHit = hitTestHandle(worldX, worldY, bounds, camera.zoom);
            if (handleHit) {
              state.type = 'resize';
              state.startX = worldX;
              state.startY = worldY;
              state.lastX = worldX;
              state.lastY = worldY;
              state.handlePos = handleHit;
              state.selectionOrigins = { ...bounds };
              state.elementOrigins = selectedElements.map((el) => {
                const b = getElementBounds(el);
                return { id: el.id, x: b.x, y: b.y, width: b.width, height: b.height };
              });
              return;
            }
          }
        }

        state.type = 'drag';
        state.startX = worldX;
        state.startY = worldY;
        state.lastX = worldX;
        state.lastY = worldY;
        state.elementOrigins = store.getSelectedElements().map((el) => {
          const b = getElementBounds(el);
          return { id: el.id, x: b.x, y: b.y, width: b.width, height: b.height };
        });
        return;
      }

      store.setSelectedElementIds([hitElement.id]);

      state.type = 'drag';
      state.startX = worldX;
      state.startY = worldY;
      state.lastX = worldX;
      state.lastY = worldY;
      const b = getElementBounds(hitElement);
      state.elementOrigins = [{ id: hitElement.id, x: b.x, y: b.y, width: b.width, height: b.height }];
      return;
    }

    store.setSelectedElementIds([]);

    state.type = 'marquee';
    state.startX = worldX;
    state.startY = worldY;
    state.lastX = worldX;
    state.lastY = worldY;
  },

  onPointerMove(_e, worldX, worldY, _camera) {
    if (state.type === 'drag') {
      const dx = worldX - state.startX;
      const dy = worldY - state.startY;

      state.lastX = worldX;
      state.lastY = worldY;

      const store = useStore.getState();

      for (const origin of state.elementOrigins) {
        store.updateElement(origin.id, {
          x: origin.x + dx,
          y: origin.y + dy,
        } as Partial<WhiteboardElement>);
      }

      return;
    }

    if (state.type === 'resize') {
      const dx = worldX - state.startX;
      const dy = worldY - state.startY;
      state.lastX = worldX;
      state.lastY = worldY;

      const sel = state.selectionOrigins;
      const pos = state.handlePos!;

      let scaleX = 1;
      let scaleY = 1;
      let offsetX = 0;
      let offsetY = 0;

      if (sel.width > 0.001) scaleX = (sel.width + (pos.includes('e') ? dx : pos.includes('w') ? -dx : 0)) / sel.width;
      if (sel.height > 0.001) scaleY = (sel.height + (pos.includes('s') ? dy : pos.includes('n') ? -dy : 0)) / sel.height;

      if (pos.includes('w')) offsetX = (1 - scaleX) * (sel.x + sel.width);
      if (pos.includes('n')) offsetY = (1 - scaleY) * (sel.y + sel.height);

      const store = useStore.getState();

      for (const origin of state.elementOrigins) {
        const nx = sel.x + (origin.x - sel.x) * scaleX + offsetX;
        const ny = sel.y + (origin.y - sel.y) * scaleY + offsetY;
        const nw = origin.width * scaleX;
        const nh = origin.height * scaleY;

        store.updateElement(origin.id, {
          x: nx,
          y: ny,
          width: nw,
          height: nh,
        } as Partial<WhiteboardElement>);
      }

      return;
    }

    if (state.type === 'marquee') {
      state.lastX = worldX;
      state.lastY = worldY;
      return;
    }
  },

  onPointerUp(_e, worldX, worldY, _camera) {
    if (state.type === 'marquee') {
      const x = Math.min(state.startX, worldX);
      const y = Math.min(state.startY, worldY);
      const w = Math.abs(worldX - state.startX);
      const h = Math.abs(worldY - state.startY);

      if (w > 3 || h > 3) {
        const found = elementsInRect(x, y, w, h);
        useStore.getState().setSelectedElementIds(found.map((e) => e.id));
      }
    }

    if (state.type === 'drag') {
      const dx = worldX - state.startX;
      const dy = worldY - state.startY;

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
        for (const origin of state.elementOrigins) {
          useStore.getState().updateElement(origin.id, {
            x: origin.x,
            y: origin.y,
          } as Partial<WhiteboardElement>);
        }
      }
    }

    state.type = 'none';
    state.elementOrigins = [];
  },

  onKeyDown(e) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const store = useStore.getState();
      if (store.selectedElementIds.length > 0) {
        store.deleteElements([...store.selectedElementIds]);
        store.setSelectedElementIds([]);
      }
    }
  },

  getPreview(): ToolPreview | null {
    if (state.type === 'marquee') {
      const x = Math.min(state.startX, state.lastX);
      const y = Math.min(state.startY, state.lastY);
      const w = Math.abs(state.lastX - state.startX);
      const h = Math.abs(state.lastY - state.startY);

      return {
        type: 'marquee',
        x, y,
        width: w,
        height: h,
        color: '#4a9eff',
        strokeWidth: 1,
        opacity: 0.5,
      };
    }

    return null;
  },
};
