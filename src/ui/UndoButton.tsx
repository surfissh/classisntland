import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';

const UndoButton = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmStyle, setConfirmStyle] = useState<React.CSSProperties>({});
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const undo = useStore((s) => s.undo);
  const clearPage = useStore((s) => s.clearPage);
  const toolbarPosition = useStore((s) => s.settings.toolbarPosition);

  const handlePointerDown = useCallback(() => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setShowConfirm(true);
    }, 1500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (!isLongPress.current) {
      undo();
    }
  }, [undo]);

  const handlePointerLeave = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const handleConfirmClear = () => {
    clearPage();
    setShowConfirm(false);
  };

  const handleCancelClear = () => {
    setShowConfirm(false);
  };

  useEffect(() => {
    if (showConfirm && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pos = toolbarPosition;

      const base: React.CSSProperties = { position: 'fixed' };

      if (pos === 'left') {
        Object.assign(base, {
          top: rect.top,
          left: rect.right + 8,
        });
      } else if (pos === 'right') {
        Object.assign(base, {
          top: rect.top,
          right: window.innerWidth - rect.left + 8,
        });
      } else {
        Object.assign(base, {
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, -100%)',
        });
      }

      setConfirmStyle(base);
    }
  }, [showConfirm, toolbarPosition]);

  useEffect(() => {
    if (showConfirm) {
      const handler = (e: MouseEvent) => {
        const isInside =
          (containerRef.current && containerRef.current.contains(e.target as Node)) ||
          (dialogRef.current && dialogRef.current.contains(e.target as Node));
        if (!isInside) {
          setShowConfirm(false);
        }
      };
      const timer = setTimeout(() => document.addEventListener('mousedown', handler), 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handler);
      };
    }
  }, [showConfirm]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="p-2 rounded-lg text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all active:scale-95 select-none min-w-[40px] h-10 flex items-center justify-center"
        title="撤销（长按清空页面）"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      {showConfirm &&
        createPortal(
          <div
            ref={dialogRef}
            style={confirmStyle}
            className="z-50 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-xl p-3 shadow-xl flex flex-col gap-2 whitespace-nowrap"
          >
            <div className="text-xs text-gray-700 dark:text-neutral-300">清空整个页面？</div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmClear}
                className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs hover:brightness-110 active:scale-95 transition-all"
              >
                清空
              </button>
              <button
                onClick={handleCancelClear}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 text-xs hover:bg-gray-200 dark:hover:bg-neutral-600 active:scale-95 transition-all"
              >
                取消
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default UndoButton;
