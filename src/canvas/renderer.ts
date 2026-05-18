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

  if (pts.length === 1) {
    const w = pts[0].pressure * el.baseWidth;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, w / 2, 0, Math.PI * 2);
    ctx.fillStyle = el.style.color;
    ctx.fill();
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
}

function strokeShape(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  ctx.globalAlpha = el.style.opacity;
  ctx.strokeStyle = el.style.color;
  ctx.lineWidth = el.strokeWidth ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const { x, y, width: w, height: h } = el;

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
      return;
    }
  }

  if (el.fillColor !== null && el.fillColor !== undefined) {
    ctx.fillStyle = el.fillColor;
    ctx.fill();
  }

  ctx.stroke();
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

function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  el: WhiteboardElement,
  camera: Camera,
  cssW: number,
  cssH: number,
) {
  let bx: number, by: number, bw: number, bh: number;

  if (el.type === 'pen' && 'points' in el) {
    const stroke = el as StrokeElement;
    const pts = stroke.points;
    if (pts.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    bx = minX;
    by = minY;
    bw = maxX - minX;
    bh = maxY - minY;
  } else {
    const s = el as ShapeElement;
    bx = Math.min(s.x, s.x + s.width);
    by = Math.min(s.y, s.y + s.height);
    bw = Math.abs(s.width);
    bh = Math.abs(s.height);
  }

  const offX = cssW / 2 - camera.x * camera.zoom;
  const offY = cssH / 2 - camera.y * camera.zoom;
  const z = camera.zoom;

  const sLeft = bx * z + offX;
  const sTop = by * z + offY;
  const sRight = (bx + bw) * z + offX;
  const sBottom = (by + bh) * z + offY;

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

  ctx.restore();
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

  for (const el of elements) {
    if (!selectedSet.has(el.id)) continue;
    drawSelectionHandles(ctx, el, camera, cssW, cssH);
  }

  if (toolPreview) {
    drawPreview(ctx, toolPreview);
  }

  ctx.restore();
}
