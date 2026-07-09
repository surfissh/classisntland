import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';
import type { WhiteboardElement, StrokeElement, ShapeElement, Camera } from '@/types';
import ColorPicker from './ColorPicker';
import SizeSlider from './SizeSlider';

function getBounds(el: WhiteboardElement): { x: number; y: number; width: number; height: number; cx: number; cy: number } {
  if (el.type === 'pen') {
    const stroke = el as StrokeElement;
    const pts = stroke.points;
    if (pts.length === 0) return { x: 0, y: 0, width: 0, height: 0, cx: 0, cy: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }
  const s = el as ShapeElement;
  const mx = Math.min(s.x, s.x + s.width);
  const my = Math.min(s.y, s.y + s.height);
  const w = Math.abs(s.width);
  const h = Math.abs(s.height);
  return { x: mx, y: my, width: w, height: h, cx: mx + w / 2, cy: my + h / 2 };
}

function getSelectionBounds(elements: WhiteboardElement[]): { x: number; y: number; width: number; height: number; cx: number; cy: number } | null {
  if (elements.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumCx = 0, sumCy = 0;
  for (const el of elements) {
    const b = getBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
    sumCx += b.cx;
    sumCy += b.cy;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: sumCx / elements.length, cy: sumCy / elements.length };
}

function worldToScreen(wx: number, wy: number, camera: Camera, cssW: number, cssH: number): { x: number; y: number } {
  return {
    x: (wx - camera.x) * camera.zoom + cssW / 2,
    y: (wy - camera.y) * camera.zoom + cssH / 2,
  };
}

const SelectionInspector = () => {
  const selectedElementIds = useStore((s) => s.selectedElementIds);
  const elements = useStore((s) => s.elements);
  const currentPageId = useStore((s) => s.currentPageId);
  const camera = useStore((s) => s.camera);
  const updateElement = useStore((s) => s.updateElement);
  const deleteElements = useStore((s) => s.deleteElements);

  const [position, setPosition] = useState<{ left: number; top: number; maxHeight: number }>({ left: 0, top: 0, maxHeight: 400 });
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedElements = useMemo(() => {
    if (selectedElementIds.length === 0) return [];
    const pageElements = elements[currentPageId] || [];
    return pageElements.filter((e) => selectedElementIds.includes(e.id));
  }, [selectedElementIds, elements, currentPageId]);

  useEffect(() => {
    if (selectedElements.length === 0) return;
    const bounds = getSelectionBounds(selectedElements);
    if (!bounds) return;

    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    const bottomCenter = worldToScreen(bounds.cx, bounds.y + bounds.height, camera, cssW, cssH);
    const aboveCenter = worldToScreen(bounds.cx, bounds.y, camera, cssW, cssH);

    const panelW = 220;
    const panelMinH = 180;
    let left = bottomCenter.x - panelW / 2;
    let top = bottomCenter.y + 16;

    left = Math.max(8, Math.min(left, cssW - panelW - 8));

    if (top + panelMinH > cssH - 8) {
      const aboveTop = aboveCenter.y - panelMinH - 16;
      top = aboveTop >= 8 ? aboveTop : 8;
    }

    top = Math.max(8, Math.min(top, cssH - panelMinH - 8));

    setPosition({ left, top, maxHeight: cssH - top - 8 });
  }, [selectedElements, camera]);

  if (selectedElements.length === 0) return null;

  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-50 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-xl p-3 shadow-xl backdrop-blur-md flex flex-col gap-2 min-w-[200px] overflow-y-auto"
      style={{ left: position.left, top: position.top, maxHeight: position.maxHeight }}
    >
      <div className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase tracking-wide">
        {selectedElements.length > 1
          ? `已选中 ${selectedElements.length} 个元素`
          : selectedElement
            ? `${selectedElement.type}${selectedElement.type !== 'pen' && 'shapeType' in selectedElement ? ` / ${(selectedElement as ShapeElement).shapeType}` : ''}`
            : '选择'}
      </div>

      {selectedElement && (
        <>
          <ColorPicker
            value={selectedElement.style.color}
            onChange={(c) => updateElement(selectedElement.id, { style: { ...selectedElement.style, color: c } })}
          />
          {'strokeWidth' in selectedElement && (
            <SizeSlider
              label="线条宽度"
              value={(selectedElement as ShapeElement).strokeWidth}
              min={1}
              max={20}
              step={1}
              onChange={(v) => updateElement(selectedElement.id, { strokeWidth: v } as any)}
            />
          )}
          {'baseWidth' in selectedElement && (
            <SizeSlider
              label="笔触宽度"
              value={(selectedElement as StrokeElement).baseWidth}
              min={1}
              max={20}
              step={1}
              onChange={(v) => updateElement(selectedElement.id, { baseWidth: v })}
            />
          )}
          {('fillColor' in selectedElement) && (
            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-neutral-300">
              <span>填充</span>
              <button
                onClick={() =>
                  updateElement(selectedElement.id, {
                    fillColor: (selectedElement as ShapeElement).fillColor ? null : '#cccccc',
                  } as any)
                }
                className={`w-6 h-6 rounded border transition-colors ${
                  (selectedElement as ShapeElement).fillColor ? 'bg-blue-600 border-blue-400' : 'border-gray-300 dark:border-neutral-500 bg-transparent'
                }`}
              />
              {(selectedElement as ShapeElement).fillColor && (
                <input
                  type="color"
                  value={(selectedElement as ShapeElement).fillColor!}
                  onChange={(e) => updateElement(selectedElement.id, { fillColor: e.target.value } as any)}
                  className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                />
              )}
            </div>
          )}
        </>
      )}

      {selectedElements.length > 1 && (
        <>
          <ColorPicker
            value="#ffffff"
            onChange={(c) => {
              for (const el of selectedElements) {
                updateElement(el.id, { style: { ...el.style, color: c } });
              }
            }}
          />
          <div className="text-xs text-gray-400 dark:text-neutral-500">颜色将应用于全部</div>
        </>
      )}

      <button
        onClick={() => {
          if (selectedElementIds.length > 0) {
            deleteElements([...selectedElementIds]);
          }
        }}
        className="w-full py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs hover:bg-red-600/40 transition-colors"
      >
        删除 {selectedElements.length > 1 ? `(${selectedElements.length})` : ''}
      </button>
    </div>,
    document.body
  );
};

export default SelectionInspector;
