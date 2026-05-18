import type { WhiteboardElement, StrokeElement, ShapeElement, Point } from '@/types';

const HIT_TOLERANCE = 4;

function pointToSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function angleInRange(a: number, start: number, end: number): boolean {
  if (start === end) return true;
  const twoPi = Math.PI * 2;
  let sa = ((start % twoPi) + twoPi) % twoPi;
  let ea = ((end % twoPi) + twoPi) % twoPi;
  let aa = ((a % twoPi) + twoPi) % twoPi;
  if (sa <= ea) return aa >= sa && aa <= ea;
  return aa >= sa || aa <= ea;
}

function hitTestStroke(point: Point, el: StrokeElement): boolean {
  const pts = el.points;
  if (pts.length === 0) return false;
  const tolerance = HIT_TOLERANCE;
  const halfW = el.baseWidth / 2 + tolerance;
  if (pts.length === 1) {
    return Math.hypot(point.x - pts[0].x, point.y - pts[0].y) <= halfW;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    if (pointToSegDist(point.x, point.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= halfW) {
      return true;
    }
  }
  return false;
}

function hitTestShape(point: Point, el: ShapeElement): boolean {
  const tolerance = HIT_TOLERANCE;
  const halfSW = (el.strokeWidth ?? 1) / 2 + tolerance;
  const { x, y, width: w, height: h } = el;

  switch (el.shapeType) {
    case 'rectangle': {
      if (el.fillColor !== null) {
        return (
          point.x >= Math.min(x, x + w) &&
          point.x <= Math.max(x, x + w) &&
          point.y >= Math.min(y, y + h) &&
          point.y <= Math.max(y, y + h)
        );
      }
      const l = Math.min(x, x + w);
      const r = Math.max(x, x + w);
      const t = Math.min(y, y + h);
      const b = Math.max(y, y + h);
      if (
        point.y >= t - halfSW && point.y <= b + halfSW &&
        point.x >= l - halfSW && point.x <= l + halfSW
      ) return true;
      if (
        point.y >= t - halfSW && point.y <= b + halfSW &&
        point.x >= r - halfSW && point.x <= r + halfSW
      ) return true;
      if (
        point.x >= l - halfSW && point.x <= r + halfSW &&
        point.y >= t - halfSW && point.y <= t + halfSW
      ) return true;
      if (
        point.x >= l - halfSW && point.x <= r + halfSW &&
        point.y >= b - halfSW && point.y <= b + halfSW
      ) return true;
      return false;
    }

    case 'circle': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.abs(w) / 2;
      const ry = Math.abs(h) / 2;
      const ndx = (point.x - cx) / rx;
      const ndy = (point.y - cy) / ry;
      const nd = Math.sqrt(ndx * ndx + ndy * ndy);
      if (el.fillColor !== null) {
        return nd <= 1;
      }
      const angle = Math.atan2(ndy, ndx);
      const ex = cx + rx * Math.cos(angle);
      const ey = cy + ry * Math.sin(angle);
      return Math.hypot(point.x - ex, point.y - ey) <= halfSW;
    }

    case 'arc': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.abs(w) / 2;
      const ry = Math.abs(h) / 2;
      const ndx = (point.x - cx) / rx;
      const ndy = (point.y - cy) / ry;
      const nd = Math.sqrt(ndx * ndx + ndy * ndy);
      const a = Math.atan2(point.y - cy, point.x - cx);
      if (el.startAngle !== undefined && el.endAngle !== undefined) {
        if (!angleInRange(a, el.startAngle, el.endAngle)) return false;
      }
      const maxR = Math.max(rx, ry);
      return Math.abs(nd - 1) * maxR <= halfSW;
    }

    case 'line':
    case 'arrow': {
      const ax = x;
      const ay = y;
      const bx = x + w;
      const by = y + h;
      return pointToSegDist(point.x, point.y, ax, ay, bx, by) <= halfSW;
    }

    default:
      return false;
  }
}

export function hitTest(point: Point, elements: WhiteboardElement[]): WhiteboardElement | null {
  let best: WhiteboardElement | null = null;
  let bestIdx = -1;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    let hit = false;
    if (el.type === 'pen') {
      hit = hitTestStroke(point, el as StrokeElement);
    } else {
      hit = hitTestShape(point, el as ShapeElement);
    }
    if (hit && i > bestIdx) {
      bestIdx = i;
      best = el;
    }
  }

  return best;
}

function boundsIntersect(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

function strokeBounds(el: StrokeElement): { minX: number; minY: number; maxX: number; maxY: number } {
  const pts = el.points;
  if (pts.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = el.baseWidth / 2;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

function shapeBounds(el: ShapeElement): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.min(el.x, el.x + el.width),
    minY: Math.min(el.y, el.y + el.height),
    maxX: Math.max(el.x, el.x + el.width),
    maxY: Math.max(el.y, el.y + el.height),
  };
}

export function hitTestRect(
  rect: { minX: number; minY: number; maxX: number; maxY: number },
  elements: WhiteboardElement[],
): WhiteboardElement[] {
  const result: WhiteboardElement[] = [];
  for (const el of elements) {
    const b = el.type === 'pen' ? strokeBounds(el as StrokeElement) : shapeBounds(el as ShapeElement);
    if (boundsIntersect(rect, b)) {
      result.push(el);
    }
  }
  return result;
}
