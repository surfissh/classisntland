import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';
import type { WhiteboardElement, StrokeElement } from '@/types';

interface PagePreviewProps {
  onClose: () => void;
}

const PREVIEW_W = 150;
const PREVIEW_H = 100;

function renderPreview(elements: WhiteboardElement[]): string {
  const scale = 0.15;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(PREVIEW_W));
  svg.setAttribute('height', String(PREVIEW_H));
  svg.setAttribute('viewBox', `0 0 ${PREVIEW_W / scale} ${PREVIEW_H / scale}`);

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(100, 80)`);

  for (const el of elements) {
    if (el.type === 'pen') {
      const stroke = el as StrokeElement;
      if (stroke.points.length < 2) continue;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let d = `M ${stroke.points[0].x} ${stroke.points[0].y}`;
      for (let i = 1; i < stroke.points.length; i++) {
        d += ` L ${stroke.points[i].x} ${stroke.points[i].y}`;
      }
      path.setAttribute('d', d);
      path.setAttribute('stroke', stroke.style.color);
      path.setAttribute('stroke-width', String(stroke.baseWidth));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('opacity', String(stroke.style.opacity));
      g.appendChild(path);
    } else {
      const shapeEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const { x, y, width, height, shapeType, strokeWidth, fillColor, startAngle, endAngle } = el;

      switch (shapeType) {
        case 'rectangle': {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', String(x));
          rect.setAttribute('y', String(y));
          rect.setAttribute('width', String(width));
          rect.setAttribute('height', String(height));
          rect.setAttribute('stroke', el.style.color);
          rect.setAttribute('stroke-width', String(strokeWidth));
          rect.setAttribute('fill', fillColor ?? 'none');
          rect.setAttribute('opacity', String(el.style.opacity));
          shapeEl.appendChild(rect);
          break;
        }
        case 'circle': {
          const cx = x + width / 2;
          const cy = y + height / 2;
          const r = Math.min(width, height) / 2;
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(cx));
          circle.setAttribute('cy', String(cy));
          circle.setAttribute('r', String(r));
          circle.setAttribute('stroke', el.style.color);
          circle.setAttribute('stroke-width', String(strokeWidth));
          circle.setAttribute('fill', fillColor ?? 'none');
          circle.setAttribute('opacity', String(el.style.opacity));
          shapeEl.appendChild(circle);
          break;
        }
        case 'arc': {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          if (startAngle != null && endAngle != null) {
            const cx = x + width / 2;
            const cy = y + height / 2;
            const rx = width / 2;
            const ry = height / 2;
            const sa = startAngle;
            const ea = endAngle;
            const x1 = cx + rx * Math.cos(sa);
            const y1 = cy + ry * Math.sin(sa);
            const x2 = cx + rx * Math.cos(ea);
            const y2 = cy + ry * Math.sin(ea);
            const large = ea - sa > Math.PI ? 1 : 0;
            path.setAttribute(
              'd',
              `M ${cx} ${cy} L ${x1} ${y1} A ${rx} ${ry} 0 ${large} 1 ${x2} ${y2} Z`
            );
          }
          path.setAttribute('stroke', el.style.color);
          path.setAttribute('stroke-width', String(strokeWidth));
          path.setAttribute('fill', fillColor ?? 'none');
          path.setAttribute('opacity', String(el.style.opacity));
          shapeEl.appendChild(path);
          break;
        }
        case 'line': {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', String(x));
          line.setAttribute('y1', String(y));
          line.setAttribute('x2', String(x + width));
          line.setAttribute('y2', String(y + height));
          line.setAttribute('stroke', el.style.color);
          line.setAttribute('stroke-width', String(strokeWidth));
          line.setAttribute('opacity', String(el.style.opacity));
          shapeEl.appendChild(line);
          break;
        }
        case 'arrow': {
          const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          const x2 = x + width;
          const y2 = y + height;
          line.setAttribute('x1', String(x));
          line.setAttribute('y1', String(y));
          line.setAttribute('x2', String(x2));
          line.setAttribute('y2', String(y2));
          line.setAttribute('stroke', el.style.color);
          line.setAttribute('stroke-width', String(strokeWidth));
          line.setAttribute('opacity', String(el.style.opacity));
          g2.appendChild(line);

          const angle = Math.atan2(y2 - y, x2 - x);
          const headLen = 12;
          const x3 = x2 - headLen * Math.cos(angle - Math.PI / 6);
          const y3 = y2 - headLen * Math.sin(angle - Math.PI / 6);
          const x4 = x2 - headLen * Math.cos(angle + Math.PI / 6);
          const y4 = y2 - headLen * Math.sin(angle + Math.PI / 6);
          const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          head.setAttribute('points', `${x2},${y2} ${x3},${y3} ${x4},${y4}`);
          head.setAttribute('fill', el.style.color);
          head.setAttribute('opacity', String(el.style.opacity));
          g2.appendChild(head);
          shapeEl.appendChild(g2);
          break;
        }
      }
      g.appendChild(shapeEl);
    }

    if (g.childNodes.length > 200) break;
  }

  svg.appendChild(g);
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
}

const PagePreview = ({ onClose }: PagePreviewProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const pages = useStore((s) => s.pages);
  const currentPageId = useStore((s) => s.currentPageId);
  const elements = useStore((s) => s.elements);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const deletePage = useStore((s) => s.deletePage);
  const addPage = useStore((s) => s.addPage);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div
        ref={panelRef}
        className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-w-2xl w-full mx-4 max-h-[80vh]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Pages</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={addPage}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:brightness-110 active:scale-95 transition-all"
            >
              + New Page
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pages.map((page) => {
              const pageElements = elements[page.id] ?? [];
              const previewSrc = pageElements.length > 0 ? renderPreview(pageElements) : null;
              const isActive = page.id === currentPageId;
              const canDelete = pages.length > 1;

              return (
                <div
                  key={page.id}
                  className={`
                    relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer
                    ${isActive ? 'border-blue-500' : 'border-gray-200 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-500'}
                  `}
                >
                  <div
                    onClick={() => {
                      setCurrentPage(page.id);
                      onClose();
                    }}
                    className="w-full h-[100px] bg-white dark:bg-neutral-900 flex items-center justify-center"
                  >
                    {previewSrc ? (
                      <img
                        src={previewSrc}
                        alt={page.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 dark:text-neutral-600 text-xs">{page.name}</span>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm px-2 py-1 text-xs text-gray-700 dark:text-neutral-300 flex items-center justify-between">
                    <span className="truncate">{page.name}</span>
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(page.id);
                        }}
                        className="text-gray-400 dark:text-neutral-500 hover:text-red-400 transition-colors shrink-0 ml-1"
                        title="Delete page"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PagePreview;
