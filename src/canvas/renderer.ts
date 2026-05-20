import type {
  WhiteboardElement,
  StrokeElement,
  ShapeElement,
  Camera,
  Point,
  ToolType,
} from '@/types';
import type { ToolPreview } from '@/tools/types';

const GRID_SPACING = 20;
const GRID_DOT_RADIUS = 1.2;
const GRID_COLOR = 'rgba(128,128,128,0.2)';
const HANDLE_SIZE = 7;
const HANDLE_COLOR = '#4a9eff';
const HANDLE_BORDER = '#ffffff';
const SELECTION_DASH = [6, 3];
const ARROW_HEAD_LENGTH = 14;
const ARROW_HEAD_ANGLE = Math.PI / 6;
const ROTATION_HANDLE_OFFSET = 22;
const ROTATION_HANDLE_RADIUS = 8;

export type { ToolPreview };

function applyCamera(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  cssW: number,
  cssH: number,
) {
  ctx.transform(
    camera.zoom,
    0,
    0,
    camera.zoom,
    cssW / 2 - camera.x * camera.zoom,
    cssH / 2 - camera.y * camera.zoom,
  );
}

function strokePen(ctx: CanvasRenderingContext2D, el: StrokeElement) {
  const pts = el.points;
  if (pts.length === 0) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = el.style.opacity;
  ctx.strokeStyle = el.style.color;

  const rotation = el.rotation ?? 0;
  if (rotation !== 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
  }

  if (pts.length === 1) {
    const w = pts[0].pressure * el.baseWidth;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, w / 2, 0, Math.PI * 2);
    ctx.fillStyle = el.style.color;
    ctx.fill();
    if (rotation !== 0) ctx.restore();
    return;
  }

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const w = ((p0.pressure + p1.pressure) / 2) * el.baseWidth;

    ctx.beginPath();
    ctx.lineWidth = w;

    if (i === 0) {
      ctx.moveTo(p0.x, p0.y);
    } else {
      const prevMidX = (pts[i - 1].x + p0.x) / 2;
      const prevMidY = (pts[i - 1].y + p0.y) / 2;
      ctx.moveTo(prevMidX, prevMidY);
    }

    if (i === pts.length - 2) {
      ctx.quadraticCurveTo(p0.x, p0.y, p1.x, p1.y);
    } else {
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }

    ctx.stroke();
  }

  if (rotation !== 0) ctx.restore();
}

function strokeShape(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  ctx.globalAlpha = el.style.opacity;
  ctx.strokeStyle = el.style.color;
  ctx.lineWidth = el.strokeWidth ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const { x, y, width: w, height: h } = el;

  const rotation = el.rotation ?? 0;
  if (rotation !== 0) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.beginPath();

  switch (el.shapeType) {
    case 'rectangle':
      ctx.rect(x, y, w, h);
      break;

    case 'circle': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.abs(w) / 2;
      const ry = Math.abs(h) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      break;
    }

    case 'arc': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.abs(w) / 2;
      const ry = Math.abs(h) / 2;
      const start = el.startAngle ?? 0;
      const end = el.endAngle ?? Math.PI * 2;
      ctx.ellipse(cx, cy, rx, ry, 0, start, end);
      break;
    }

    case 'line':
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      break;

    case 'arrow': {
      const ex = x + w;
      const ey = y + h;
      const angle = Math.atan2(h, w);
      const headBaseX = ex - ARROW_HEAD_LENGTH * Math.cos(angle);
      const headBaseY = ey - ARROW_HEAD_LENGTH * Math.sin(angle);
      ctx.moveTo(x, y);
      ctx.lineTo(headBaseX, headBaseY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - ARROW_HEAD_LENGTH * Math.cos(angle - ARROW_HEAD_ANGLE),
        ey - ARROW_HEAD_LENGTH * Math.sin(angle - ARROW_HEAD_ANGLE),
      );
      ctx.lineTo(
        ex - ARROW_HEAD_LENGTH * Math.cos(angle + ARROW_HEAD_ANGLE),
        ey - ARROW_HEAD_LENGTH * Math.sin(angle + ARROW_HEAD_ANGLE),
      );
      ctx.closePath();
      ctx.fillStyle = el.style.color;
      ctx.fill();
      if (rotation !== 0) ctx.restore();
      return;
    }
  }

  if (el.fillColor !== null && el.fillColor !== undefined) {
    ctx.fillStyle = el.fillColor;
    ctx.fill();
  }

  ctx.stroke();

  if (rotation !== 0) ctx.restore();
}

function drawBackgroundGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  cssW: number,
  cssH: number,
) {
  ctx.fillStyle = GRID_COLOR;

  const invZoom = 1 / camera.zoom;
  const worldLeft = (0 - cssW / 2) * invZoom + camera.x;
  const worldRight = (cssW - cssW / 2) * invZoom + camera.x;
  const worldTop = (0 - cssH / 2) * invZoom + camera.y;
  const worldBottom = (cssH - cssH / 2) * invZoom + camera.y;

  const startX = Math.floor(worldLeft / GRID_SPACING) * GRID_SPACING;
  const endX = Math.ceil(worldRight / GRID_SPACING) * GRID_SPACING;
  const startY = Math.floor(worldTop / GRID_SPACING) * GRID_SPACING;
  const endY = Math.ceil(worldBottom / GRID_SPACING) * GRID_SPACING;

  for (let wx = startX; wx <= endX; wx += GRID_SPACING) {
    for (let wy = startY; wy <= endY; wy += GRID_SPACING) {
      ctx.beginPath();
      ctx.arc(wx, wy, GRID_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function getElementBounds(el: WhiteboardElement): { x: number; y: number; width: number; height: number } {
  if (el.type === 'pen' && 'points' in el) {
    const pts = (el as StrokeElement).points;
    if (pts.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  const s = el as ShapeElement;
  const mx = Math.min(s.x, s.x + s.width);
  const my = Math.min(s.y, s.y + s.height);
  return { x: mx, y: my, width: Math.abs(s.width), height: Math.abs(s.height) };
}

function getElementCenter(el: WhiteboardElement): { cx: number; cy: number } {
  const b = getElementBounds(el);
  return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
}

function getRotatedCorners(
  el: WhiteboardElement
): { corners: { x: number; y: number }[]; cx: number; cy: number } {
  const b = getElementBounds(el);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const corners = [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y },
    { x: b.x + b.width, y: b.y + b.height },
    { x: b.x, y: b.y + b.height },
  ];
  const rotation = el.rotation ?? 0;
  if (rotation === 0) return { corners, cx, cy };
  const rad = rotation * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    corners: corners.map((c) => ({
      x: cx + (c.x - cx) * cos - (c.y - cy) * sin,
      y: cy + (c.x - cx) * sin + (c.y - cy) * cos,
    })),
    cx,
    cy,
  };
}

function getRotatedBounds(el: WhiteboardElement): { x: number; y: number; width: number; height: number; cx: number; cy: number } {
  const { corners } = getRotatedCorners(el);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }
  const b = getElementBounds(el);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
}

function drawSelectionBox(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  camera: Camera,
  cssW: number,
  cssH: number,
  centerX?: number,
  centerY?: number,
) {
  const dpr = window.devicePixelRatio || 1;
  const offX = (cssW / 2 - camera.x * camera.zoom) * dpr;
  const offY = (cssH / 2 - camera.y * camera.zoom) * dpr;
  const z = camera.zoom * dpr;

  const sLeft = bounds.x * z + offX;
  const sTop = bounds.y * z + offY;
  const sRight = (bounds.x + bounds.width) * z + offX;
  const sBottom = (bounds.y + bounds.height) * z + offY;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.strokeStyle = HANDLE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash(SELECTION_DASH);
  ctx.strokeRect(sLeft, sTop, sRight - sLeft, sBottom - sTop);
  ctx.setLineDash([]);

  const handles = [
    { x: sLeft, y: sTop },
    { x: (sLeft + sRight) / 2, y: sTop },
    { x: sRight, y: sTop },
    { x: sRight, y: (sTop + sBottom) / 2 },
    { x: sRight, y: sBottom },
    { x: (sLeft + sRight) / 2, y: sBottom },
    { x: sLeft, y: sBottom },
    { x: sLeft, y: (sTop + sBottom) / 2 },
  ];

  for (const h of handles) {
    ctx.fillStyle = HANDLE_BORDER;
    ctx.fillRect(h.x - HANDLE_SIZE / 2 - 1, h.y - HANDLE_SIZE / 2 - 1, HANDLE_SIZE + 2, HANDLE_SIZE + 2);
    ctx.fillStyle = HANDLE_COLOR;
    ctx.fillRect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  }

  const rotHandleX = centerX !== undefined ? centerX * z + offX : (sLeft + sRight) / 2;
  const rotHandleY = sTop - ROTATION_HANDLE_OFFSET;

  ctx.beginPath();
  ctx.moveTo(rotHandleX, sTop);
  ctx.lineTo(rotHandleX, rotHandleY + ROTATION_HANDLE_RADIUS);
  ctx.strokeStyle = HANDLE_COLOR;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, ROTATION_HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = HANDLE_BORDER;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, ROTATION_HANDLE_RADIUS - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = HANDLE_COLOR;
  ctx.fill();

  ctx.restore();
}

function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  el: WhiteboardElement,
  camera: Camera,
  cssW: number,
  cssH: number,
) {
  const rb = getRotatedBounds(el);
  drawSelectionBox(ctx, { x: rb.x, y: rb.y, width: rb.width, height: rb.height }, camera, cssW, cssH);
}

function drawPreview(ctx: CanvasRenderingContext2D, preview: ToolPreview) {
  const {
    type,
    x = 0,
    y = 0,
    width: w = 0,
    height: h = 0,
    color = '#ffffff',
    strokeWidth = 2,
    fillColor = null,
    opacity = 0.5,
    points,
    baseWidth,
    startAngle,
    endAngle,
    showArrow,
  } = preview;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;

  ctx.beginPath();

  switch (type) {
    case 'rectangle':
      ctx.rect(x, y, w, h);
      break;

    case 'circle': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.abs(w) / 2;
      const ry = Math.abs(h) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      break;
    }

    case 'arc': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.abs(w) / 2;
      const ry = Math.abs(h) / 2;
      const start = startAngle ?? 0;
      const end = endAngle ?? Math.PI * 2;
      ctx.ellipse(cx, cy, rx, ry, 0, start, end);
      break;
    }

    case 'line':
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      break;

    case 'arrow': {
      const ex = x + w;
      const ey = y + h;
      const angle = Math.atan2(h, w);
      const headBaseX = ex - ARROW_HEAD_LENGTH * Math.cos(angle);
      const headBaseY = ey - ARROW_HEAD_LENGTH * Math.sin(angle);
      ctx.moveTo(x, y);
      ctx.lineTo(headBaseX, headBaseY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - ARROW_HEAD_LENGTH * Math.cos(angle - ARROW_HEAD_ANGLE),
        ey - ARROW_HEAD_LENGTH * Math.sin(angle - ARROW_HEAD_ANGLE),
      );
      ctx.lineTo(
        ex - ARROW_HEAD_LENGTH * Math.cos(angle + ARROW_HEAD_ANGLE),
        ey - ARROW_HEAD_LENGTH * Math.sin(angle + ARROW_HEAD_ANGLE),
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    case 'pen': {
      const pts = points;
      if (!pts || pts.length === 0) break;
      const bw = baseWidth ?? strokeWidth;
      if (pts.length === 1) {
        const dotW = pts[0].pressure * bw;
        ctx.arc(pts[0].x, pts[0].y, dotW / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const segW = ((p0.pressure + p1.pressure) / 2) * bw;
          ctx.beginPath();
          ctx.lineWidth = segW;
          if (i === 0) {
            ctx.moveTo(p0.x, p0.y);
          } else {
            const pmx = (pts[i - 1].x + p0.x) / 2;
            const pmy = (pts[i - 1].y + p0.y) / 2;
            ctx.moveTo(pmx, pmy);
          }
          if (i === pts.length - 2) {
            ctx.quadraticCurveTo(p0.x, p0.y, p1.x, p1.y);
          } else {
            const mx = (p0.x + p1.x) / 2;
            const my = (p0.y + p1.y) / 2;
            ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
          }
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }

    case 'marquee':
      ctx.rect(x, y, w, h);
      break;
  }

  if (fillColor !== null && fillColor !== undefined) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function renderAll(
  ctx: CanvasRenderingContext2D,
  elements: WhiteboardElement[],
  camera: Camera,
  selectedIds: string[],
  activeTool: ToolType,
  toolPreview: ToolPreview | null,
  cssW: number,
  cssH: number,
) {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, cssW, cssH);

  ctx.save();
  applyCamera(ctx, camera, cssW, cssH);

  drawBackgroundGrid(ctx, camera, cssW, cssH);

  const selectedSet = new Set(selectedIds);

  for (const el of elements) {
    if (selectedSet.has(el.id)) continue;
    if (el.type === 'pen') {
      strokePen(ctx, el as StrokeElement);
    } else {
      strokeShape(ctx, el as ShapeElement);
    }
  }

  for (const el of elements) {
    if (!selectedSet.has(el.id)) continue;
    if (el.type === 'pen') {
      strokePen(ctx, el as StrokeElement);
    } else {
      strokeShape(ctx, el as ShapeElement);
    }
  }

  const selectedElements = elements.filter(el => selectedSet.has(el.id));

  if (selectedElements.length === 1) {
    drawSelectionHandles(ctx, selectedElements[0], camera, cssW, cssH);
  } else if (selectedElements.length > 1) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const centers: { cx: number; cy: number }[] = [];
    for (const el of selectedElements) {
      const rb = getRotatedBounds(el);
      minX = Math.min(minX, rb.x);
      minY = Math.min(minY, rb.y);
      maxX = Math.max(maxX, rb.x + rb.width);
      maxY = Math.max(maxY, rb.y + rb.height);
      centers.push({ cx: rb.cx, cy: rb.cy });
    }
    const avgCx = centers.reduce((s, c) => s + c.cx, 0) / centers.length;
    const avgCy = centers.reduce((s, c) => s + c.cy, 0) / centers.length;
    const unionBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: avgCx, cy: avgCy };
    drawSelectionBox(ctx, { x: unionBounds.x, y: unionBounds.y, width: unionBounds.width, height: unionBounds.height }, camera, cssW, cssH, avgCx, avgCy);
  }

  if (toolPreview) {
    drawPreview(ctx, toolPreview);
  }

  ctx.restore();
}
