import type { StrokeElement, Point } from '@/types';
import { nanoid } from 'nanoid';

interface Circle {
  x: number;
  y: number;
  radius: number;
}

interface SegIntersection {
  segT: number;
  x: number;
  y: number;
  pressure: number;
}

function pointInAnyCircle(px: number, py: number, circles: Circle[]): boolean {
  for (const c of circles) {
    const dx = px - c.x;
    const dy = py - c.y;
    if (dx * dx + dy * dy <= c.radius * c.radius) return true;
  }
  return false;
}

function segmentCircleIntersections(
  x1: number, y1: number, x2: number, y2: number,
  p1: number, p2: number,
  circle: Circle
): SegIntersection[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - circle.x;
  const fy = y1 - circle.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - circle.radius * circle.radius;

  if (a < 1e-10) return [];

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];

  const results: SegIntersection[] = [];

  if (discriminant < 1e-10) {
    const t = -b / (2 * a);
    if (t >= -1e-10 && t <= 1 + 1e-10) {
      const ct = Math.max(0, Math.min(1, t));
      results.push({
        segT: ct,
        x: x1 + ct * dx,
        y: y1 + ct * dy,
        pressure: p1 + ct * (p2 - p1),
      });
    }
    return results;
  }

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  for (const t of [t1, t2]) {
    if (t >= -1e-10 && t <= 1 + 1e-10) {
      const ct = Math.max(0, Math.min(1, t));
      results.push({
        segT: ct,
        x: x1 + ct * dx,
        y: y1 + ct * dy,
        pressure: p1 + ct * (p2 - p1),
      });
    }
  }

  return results;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    pressure: a.pressure + t * (b.pressure - a.pressure),
  };
}

export function eraserSplit(
  stroke: StrokeElement,
  circles: Circle[]
): StrokeElement[] | null {
  const pts = stroke.points;
  if (pts.length < 1 || circles.length === 0) return null;

  if (pts.length === 1) {
    if (pointInAnyCircle(pts[0].x, pts[0].y, circles)) {
      return [];
    }
    return null;
  }

  interface StrokePoint {
    x: number;
    y: number;
    pressure: number;
    dist: number;
    inside: boolean;
    isOriginal: boolean;
    segT?: number;
  }

  const strokePoints: StrokePoint[] = [];

  let cumulativeDist = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      cumulativeDist += Math.sqrt(dx * dx + dy * dy);
    }
    strokePoints.push({
      x: pts[i].x,
      y: pts[i].y,
      pressure: pts[i].pressure,
      dist: cumulativeDist,
      inside: pointInAnyCircle(pts[i].x, pts[i].y, circles),
      isOriginal: true,
    });
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const segIntersections: SegIntersection[] = [];

    for (const circle of circles) {
      const intersections = segmentCircleIntersections(
        p0.x, p0.y, p1.x, p1.y,
        p0.pressure, p1.pressure,
        circle,
      );
      segIntersections.push(...intersections);
    }

    segIntersections.sort((a, b) => a.segT - b.segT);

    const segBaseDist = strokePoints[i].dist;

    for (const inter of segIntersections) {
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      const interDist = segBaseDist + inter.segT * segLen;

      const alreadyExists = strokePoints.some(
        (sp) => Math.abs(sp.dist - interDist) < 0.001 && !sp.isOriginal,
      );
      if (alreadyExists) continue;

      strokePoints.push({
        x: inter.x,
        y: inter.y,
        pressure: inter.pressure,
        dist: interDist,
        inside: pointInAnyCircle(inter.x, inter.y, circles),
        isOriginal: false,
        segT: inter.segT,
      });
    }
  }

  strokePoints.sort((a, b) => a.dist - b.dist);

  if (strokePoints.length === 1) {
    return strokePoints[0].inside ? [] : null;
  }

  const anyInside = strokePoints.some(sp => sp.inside);
  const anyIntersection = strokePoints.some(sp => !sp.isOriginal);
  if (!anyInside && !anyIntersection) {
    return null;
  }

  const fragments: StrokeElement[] = [];
  let currentFragment: Point[] = [];

  for (let i = 0; i < strokePoints.length - 1; i++) {
    const a = strokePoints[i];
    const b = strokePoints[i + 1];

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const midInside = pointInAnyCircle(midX, midY, circles);

    if (currentFragment.length === 0) {
      if (!a.inside && !midInside) {
        currentFragment.push({ x: a.x, y: a.y, pressure: a.pressure });
      }
    }

    if (!midInside) {
      if (currentFragment.length === 0) {
        currentFragment.push({ x: a.x, y: a.y, pressure: a.pressure });
      }
      currentFragment.push({ x: b.x, y: b.y, pressure: b.pressure });
    } else {
      if (currentFragment.length > 0) {
        if (currentFragment.length === 1) {
          const last = currentFragment[0];
          const dx = a.x - last.x;
          const dy = a.y - last.y;
          if (dx * dx + dy * dy > 0.001) {
            currentFragment.push({ x: a.x, y: a.y, pressure: a.pressure });
          }
        }
        if (currentFragment.length >= 2) {
          fragments.push(createFragment(stroke, currentFragment));
        }
        currentFragment = [];
      }
    }
  }

  if (currentFragment.length >= 2) {
    fragments.push(createFragment(stroke, currentFragment));
  }

  if (fragments.length === 0 && strokePoints[0].inside) {
    return [];
  }

  if (fragments.length === 0) return null;

  return fragments;
}

function createFragment(original: StrokeElement, points: Point[]): StrokeElement {
  return {
    id: nanoid(),
    type: 'pen',
    points: points.map((p) => ({ ...p })),
    baseWidth: original.baseWidth,
    style: { ...original.style },
    pageId: original.pageId,
    createdAt: Date.now(),
    userId: original.userId,
  };
}
