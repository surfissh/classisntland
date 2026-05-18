import type { WhiteboardElement, StrokeElement, ShapeElement, Point } from '@/types';

const CELL_SIZE = 200;

function boundsFromElement(el: WhiteboardElement): { minX: number; minY: number; maxX: number; maxY: number } {
  if (el.type === 'pen' && 'points' in el) {
    const stroke = el as StrokeElement;
    const pts = stroke.points;
    if (pts.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = stroke.baseWidth * 1.5;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }
  const s = el as ShapeElement;
  return {
    minX: Math.min(s.x, s.x + s.width),
    minY: Math.min(s.y, s.y + s.height),
    maxX: Math.max(s.x, s.x + s.width),
    maxY: Math.max(s.y, s.y + s.height),
  };
}

function cellKey(wx: number, wy: number): string {
  return `${Math.floor(wx / CELL_SIZE)},${Math.floor(wy / CELL_SIZE)}`;
}

function cellsForBounds(b: { minX: number; minY: number; maxX: number; maxY: number }): string[] {
  const keys: string[] = [];
  const startCol = Math.floor(b.minX / CELL_SIZE);
  const endCol = Math.floor(b.maxX / CELL_SIZE);
  const startRow = Math.floor(b.minY / CELL_SIZE);
  const endRow = Math.floor(b.maxY / CELL_SIZE);
  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      keys.push(`${c},${r}`);
    }
  }
  return keys;
}

export class SpatialIndex {
  private grid = new Map<string, Set<string>>();
  private elementMap = new Map<string, WhiteboardElement>();

  add(element: WhiteboardElement): void {
    this.elementMap.set(element.id, element);
    const bounds = boundsFromElement(element);
    for (const key of cellsForBounds(bounds)) {
      let set = this.grid.get(key);
      if (!set) {
        set = new Set();
        this.grid.set(key, set);
      }
      set.add(element.id);
    }
  }

  remove(id: string): void {
    const el = this.elementMap.get(id);
    if (!el) return;
    this.elementMap.delete(id);
    const bounds = boundsFromElement(el);
    for (const key of cellsForBounds(bounds)) {
      const set = this.grid.get(key);
      if (set) {
        set.delete(id);
        if (set.size === 0) {
          this.grid.delete(key);
        }
      }
    }
  }

  query(rect: { minX: number; minY: number; maxX: number; maxY: number }): WhiteboardElement[] {
    const seen = new Set<string>();
    const result: WhiteboardElement[] = [];
    for (const key of cellsForBounds(rect)) {
      const set = this.grid.get(key);
      if (!set) continue;
      for (const id of set) {
        if (seen.has(id)) continue;
        seen.add(id);
        const el = this.elementMap.get(id);
        if (el) result.push(el);
      }
    }
    return result;
  }

  queryPoint(point: Point): WhiteboardElement[] {
    const key = cellKey(point.x, point.y);
    const set = this.grid.get(key);
    if (!set) return [];
    const result: WhiteboardElement[] = [];
    for (const id of set) {
      const el = this.elementMap.get(id);
      if (el) result.push(el);
    }
    return result;
  }

  clear(): void {
    this.grid.clear();
    this.elementMap.clear();
  }
}
