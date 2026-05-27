import { useEffect, useRef, useState } from 'react';
import useStore from '@/store/useStore';
import type { ToolType } from '@/types';
import ColorPicker from './ColorPicker';
import SizeSlider from './SizeSlider';
import ShapeSelector from './ShapeSelector';

interface SecondaryMenuProps {
  tool: ToolType;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLElement | null>;
}

const SecondaryMenu = ({ tool, onClose, buttonRef }: SecondaryMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<React.CSSProperties>({});

  const penSettings = useStore((s) => s.penSettings);
  const eraserSettings = useStore((s) => s.eraserSettings);
  const shapeSettings = useStore((s) => s.shapeSettings);
  const shapeType = useStore((s) => s.shapeType);
  const selectedElementIds = useStore((s) => s.selectedElementIds);
  const elements = useStore((s) => s.elements);
  const currentPageId = useStore((s) => s.currentPageId);
  const setPenSettings = useStore((s) => s.setPenSettings);
  const setEraserSettings = useStore((s) => s.setEraserSettings);
  const setShapeSettings = useStore((s) => s.setShapeSettings);
  const setShapeType = useStore((s) => s.setShapeType);
  const deleteElements = useStore((s) => s.deleteElements);
  const updateElement = useStore((s) => s.updateElement);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', handleKey);
    });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, buttonRef]);

  useEffect(() => {
    if (!buttonRef.current) return;
    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const toolbarPosition = useStore.getState().settings.toolbarPosition;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const menuW = 220;
      const menuMinH = 200;
      const gap = 8;
      let top: number | undefined;
      let bottom: number | undefined;
      let left: number | undefined;
      let right: number | undefined;
      let maxH = vh - 16;

      switch (toolbarPosition) {
        case 'top': {
          left = rect.left;
          top = rect.bottom + gap;
          if (top + menuMinH > vh - 8) {
            top = Math.max(8, rect.top - menuMinH - gap);
          }
          if (left + menuW > vw - 8) {
            left = Math.max(8, vw - menuW - 8);
          }
          top = Math.max(8, Math.min(top, vh - menuMinH - 8));
          maxH = vh - top - 8;
          break;
        }
        case 'bottom': {
          const aboveTop = rect.top - menuMinH - gap;
          if (aboveTop >= 8) {
            left = rect.left;
            bottom = vh - rect.top + gap;
            maxH = rect.top - bottom! - gap;
          } else {
            left = rect.left;
            const belowTop = rect.bottom + gap;
            top = belowTop;
            if (belowTop + menuMinH > vh - 8) {
              top = Math.max(8, aboveTop);
            }
            maxH = vh - top - 8;
          }
          if (left + menuW > vw - 8) {
            left = Math.max(8, vw - menuW - 8);
          }
          if (bottom !== undefined) {
            bottom = Math.max(8, Math.min(bottom, vh - 8));
          } else {
            top = Math.max(8, Math.min(top!, vh - menuMinH - 8));
          }
          break;
        }
        case 'left': {
          left = rect.right + gap;
          top = rect.top;
          if (top + menuMinH > vh - 8) {
            top = Math.max(8, vh - menuMinH - 8);
          }
          if (left + menuW > vw - 8) {
            left = Math.max(8, rect.left - menuW - gap);
          }
          top = Math.max(8, Math.min(top, vh - menuMinH - 8));
          maxH = vh - top - 8;
          break;
        }
        case 'right': {
          top = rect.top;
          right = vw - rect.left + gap;
          if (top + menuMinH > vh - 8) {
            top = Math.max(8, vh - menuMinH - 8);
          }
          if (rect.left - menuW - gap < 8) {
            right = undefined;
            left = Math.max(8, rect.right + gap);
          }
          top = Math.max(8, Math.min(top, vh - menuMinH - 8));
          maxH = vh - top - 8;
          break;
        }
        default: {
          const aboveTop = rect.top - menuMinH - gap;
          if (aboveTop >= 8) {
            left = rect.left;
            bottom = vh - rect.top + gap;
            maxH = rect.top - (bottom ?? 0) - gap;
          } else {
            left = rect.left;
            top = Math.max(8, rect.bottom + gap);
            maxH = vh - top - 8;
          }
          break;
        }
      }

      const style: React.CSSProperties = {
        position: 'fixed',
        maxHeight: `${Math.max(40, maxH)}px`,
        overflowY: 'auto',
      };
      if (top !== undefined) style.top = top;
      if (bottom !== undefined) style.bottom = bottom;
      if (left !== undefined) style.left = left;
      if (right !== undefined) style.right = right;

      setPosition(style);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [buttonRef]);

  const selectedElement = (() => {
    if (tool !== 'select' || selectedElementIds.length !== 1) return null;
    const pageElements = elements[currentPageId] || [];
    return pageElements.find((e) => e.id === selectedElementIds[0]) ?? null;
  })();

  const handleDelete = () => {
    if (selectedElementIds.length > 0) {
      deleteElements(selectedElementIds);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-xl p-3 shadow-xl backdrop-blur-md flex flex-col gap-3 min-w-[200px] overflow-y-auto"
      style={position}
    >
      {tool === 'pen' && (
        <>
          <div className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase tracking-wide">Pen Settings</div>
          <ColorPicker value={penSettings.color} onChange={(c) => setPenSettings({ color: c })} />
          <SizeSlider
            label="Base Width"
            value={penSettings.baseWidth}
            min={1}
            max={20}
            step={1}
            onChange={(v) => setPenSettings({ baseWidth: v })}
          />
        </>
      )}

      {tool === 'eraser' && (
        <>
          <div className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase tracking-wide">Eraser Settings</div>
          <SizeSlider
            label="Eraser Size"
            value={eraserSettings.size}
            min={5}
            max={200}
            step={1}
            onChange={(v) => setEraserSettings({ size: v })}
          />
        </>
      )}

      {(tool === 'rectangle' || tool === 'circle' || tool === 'arc' || tool === 'line' || tool === 'arrow') && (
        <>
          <div className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase tracking-wide">Shape Settings</div>
          <ShapeSelector value={shapeType} onChange={setShapeType} />
          <ColorPicker value={shapeSettings.color} onChange={(c) => setShapeSettings({ color: c })} />
          <SizeSlider
            label="Stroke Width"
            value={shapeSettings.strokeWidth}
            min={1}
            max={20}
            step={1}
            onChange={(v) => setShapeSettings({ strokeWidth: v })}
          />
          <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-neutral-300">
            <span>Fill</span>
            <button
              onClick={() =>
                setShapeSettings({
                  fillColor: shapeSettings.fillColor ? null : '#cccccc',
                })
              }
              className={`
                w-6 h-6 rounded border transition-colors
                ${shapeSettings.fillColor
                  ? 'bg-blue-600 border-blue-400'
                  : 'border-gray-300 dark:border-neutral-500 bg-transparent'}
              `}
            />
            {shapeSettings.fillColor && (
              <input
                type="color"
                value={shapeSettings.fillColor}
                onChange={(e) => setShapeSettings({ fillColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
              />
            )}
          </div>
        </>
      )}

      {tool === 'select' && (
        <>
          <div className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase tracking-wide">Selection</div>
          {selectedElement ? (
            <>
              <div className="text-xs text-gray-700 dark:text-neutral-300">
                {selectedElement.type}
                {selectedElement.type !== 'pen' && 'shapeType' in selectedElement
                  ? ` / ${selectedElement.shapeType}`
                  : ''}
              </div>
              <ColorPicker
                value={selectedElement.style.color}
                onChange={(c) => updateElement(selectedElement.id, { style: { ...selectedElement.style, color: c } })}
              />
              {'strokeWidth' in selectedElement && (
                <SizeSlider
                  label="Stroke Width"
                  value={selectedElement.strokeWidth}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(v) => updateElement(selectedElement.id, { strokeWidth: v } as any)}
                />
              )}
              {'baseWidth' in selectedElement && (
                <SizeSlider
                  label="Base Width"
                  value={selectedElement.baseWidth}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(v) => updateElement(selectedElement.id, { baseWidth: v })}
                />
              )}
              <button
                onClick={handleDelete}
                className="w-full py-1.5 rounded-lg bg-red-600/20 text-red-400 text-xs hover:bg-red-600/40 transition-colors"
              >
                Delete Selected
              </button>
            </>
          ) : (
            <div className="text-xs text-gray-400 dark:text-neutral-500">
              {selectedElementIds.length === 0
                ? 'No element selected'
                : `${selectedElementIds.length} elements selected`}
            </div>
          )}
        </>
      )}

      <button
        onClick={onClose}
        className="mt-1 w-full py-1 rounded-lg bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 text-xs hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
      >
        Close
      </button>
    </div>
  );
};

export default SecondaryMenu;
