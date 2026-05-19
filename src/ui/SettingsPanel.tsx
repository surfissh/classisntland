import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useStore from '@/store/useStore';
import type { ToolbarPosition, ToolbarMode } from '@/types';

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

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

  const positions: ToolbarPosition[] = ['top', 'bottom', 'left', 'right'];
  const modes: ToolbarMode[] = ['fill', 'floating'];

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div
        ref={panelRef}
        className="bg-neutral-800 border border-neutral-600 rounded-2xl p-6 shadow-2xl w-80 flex flex-col gap-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-neutral-400 uppercase tracking-wide font-medium">Toolbar Position</span>
          <div className="flex gap-1">
            {positions.map((pos) => (
              <button
                key={pos}
                onClick={() => setSettings({ toolbarPosition: pos })}
                className={`
                  flex-1 py-1.5 rounded-lg text-xs capitalize transition-all
                  ${settings.toolbarPosition === pos
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}
                `}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-neutral-400 uppercase tracking-wide font-medium">Toolbar Mode</span>
          <div className="flex gap-1">
            {modes.map((mode) => (
              <button
                key={mode}
                onClick={() => setSettings({ toolbarMode: mode })}
                className={`
                  flex-1 py-1.5 rounded-lg text-xs capitalize transition-all
                  ${settings.toolbarMode === mode
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}
                `}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400 uppercase tracking-wide font-medium">Show Toolbar</span>
          <button
            onClick={() => setSettings({ showToolbar: !settings.showToolbar })}
            className={`
              relative w-10 h-5 rounded-full transition-colors duration-200
              ${settings.showToolbar ? 'bg-blue-600' : 'bg-neutral-600'}
            `}
          >
            <div
              className={`
                absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                ${settings.showToolbar ? 'translate-x-5' : 'translate-x-0.5'}
              `}
            />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SettingsPanel;
