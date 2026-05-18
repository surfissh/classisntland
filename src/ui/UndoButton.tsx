import { useState, useRef, useCallback, useEffect } from 'react';
import useStore from '@/store/useStore';

const UndoButton = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const undo = useStore((s) => s.undo);
  const clearPage = useStore((s) => s.clearPage);

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
    if (showConfirm) {
      const handler = (e: MouseEvent) => {
        if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
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
    <div className="relative">
      <button
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="p-2 rounded-lg text-neutral-300 hover:bg-neutral-700 transition-all active:scale-95 select-none"
        title="Undo (hold to clear page)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      {showConfirm && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-neutral-800 border border-neutral-600 rounded-xl p-3 shadow-xl flex flex-col gap-2 whitespace-nowrap">
          <div className="text-xs text-neutral-300">Clear entire page?</div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmClear}
              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs hover:brightness-110 active:scale-95 transition-all"
            >
              Clear
            </button>
            <button
              onClick={handleCancelClear}
              className="px-3 py-1 rounded-lg bg-neutral-700 text-neutral-300 text-xs hover:bg-neutral-600 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UndoButton;
