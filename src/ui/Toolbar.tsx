import { useState, useRef, useCallback } from 'react';
import useStore from '@/store/useStore';
import type { ToolType } from '@/types';
import ToolButton from './ToolButton';
import UndoButton from './UndoButton';
import SaveButton from './SaveButton';
import PageManager from './PageManager';
import SecondaryMenu from './SecondaryMenu';
import SettingsPanel from './SettingsPanel';

const TOOLS: { type: ToolType; icon: React.ReactNode; label: string }[] = [
  {
    type: 'select',
    label: 'Select',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
      </svg>
    ),
  },
  {
    type: 'pen',
    label: 'Pen',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    ),
  },
  {
    type: 'eraser',
    label: 'Eraser',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20H7L3 16a2 2 0 0 1 0-2.83l8.59-8.59a2 2 0 0 1 2.82 0l3.42 3.41a2 2 0 0 1 0 2.83L12 16" />
        <path d="M6 20h4" />
      </svg>
    ),
  },
  {
    type: 'rectangle',
    label: 'Shapes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
  },
];

const shapeTools: ToolType[] = ['rectangle', 'circle', 'arc', 'line', 'arrow'];

function isShapeTool(tool: ToolType): boolean {
  return shapeTools.includes(tool);
}

const Toolbar = () => {
  const [secondaryMenuTool, setSecondaryMenuTool] = useState<ToolType | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const secondaryMenuTargetRef = useRef<HTMLDivElement | null>(null);

  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);

  const handleToolClick = useCallback(
    (tool: ToolType) => {
      if (activeTool === tool && secondaryMenuTool !== tool) {
        setSecondaryMenuTool(tool);
        return;
      }

      if (secondaryMenuTool) {
        setSecondaryMenuTool(null);
      }

      setActiveTool(tool);
    },
    [activeTool, secondaryMenuTool, setActiveTool]
  );

  const handleToolDoubleClick = useCallback((tool: ToolType) => {
    setSecondaryMenuTool(tool);
  }, []);

  const toolbarPosition = settings.toolbarPosition;
  const toolbarMode = settings.toolbarMode;
  const showToolbar = settings.showToolbar;

  const positionClasses: Record<string, string> = {
    top: 'top-0 left-0 right-0 flex-row',
    bottom: 'bottom-0 left-0 right-0 flex-row',
    left: 'left-0 top-0 bottom-0 flex-col',
    right: 'right-0 top-0 bottom-0 flex-col',
  };

  const fillClasses: Record<string, string> = {
    top: 'w-full rounded-none',
    bottom: 'w-full rounded-none',
    left: 'h-full rounded-none',
    right: 'h-full rounded-none',
  };

  const floatingClasses: Record<string, string> = {
    top: 'w-auto rounded-xl mx-auto mt-2',
    bottom: 'w-auto rounded-xl mx-auto mb-2',
    left: 'h-auto rounded-xl my-auto ml-2',
    right: 'h-auto rounded-xl my-auto mr-2',
  };

  const containerClass = `
    ${positionClasses[toolbarPosition] || positionClasses.bottom}
    ${toolbarMode === 'fill'
      ? fillClasses[toolbarPosition] || fillClasses.bottom
      : floatingClasses[toolbarPosition] || floatingClasses.bottom
    }
  `;

  const isVertical = toolbarPosition === 'left' || toolbarPosition === 'right';

  if (!showToolbar) {
    return (
      <button
        onClick={() => setSettings({ showToolbar: true })}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-neutral-800/90 border border-neutral-600 shadow-xl flex items-center justify-center text-neutral-300 hover:bg-neutral-700 backdrop-blur-md transition-all active:scale-95"
        title="Show toolbar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="12" y2="17" />
        </svg>
      </button>
    );
  }

  const toolbarContent = (
    <>
      <div className={`flex items-center ${isVertical ? 'flex-col' : ''} gap-0.5`}>
        <UndoButton />
        <SaveButton />
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg text-neutral-300 hover:bg-neutral-700 transition-all active:scale-95 select-none"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <div className={`flex items-center ${isVertical ? 'flex-col' : ''} gap-0.5 mx-1`}>
        {TOOLS.map(({ type, icon, label }) => (
          <div
            key={type}
            ref={secondaryMenuTool === type ? secondaryMenuTargetRef : undefined}
            className="tool-btn-wrapper relative"
          >
            <ToolButton
              icon={icon}
              label={label}
              isActive={activeTool === type || (isShapeTool(activeTool) && isShapeTool(type) && type === 'rectangle')}
              onClick={() => handleToolClick(type)}
              onDoubleClick={() => handleToolDoubleClick(type)}
            />
            {secondaryMenuTool === type && (
              <SecondaryMenu
                tool={type}
                onClose={() => setSecondaryMenuTool(null)}
                buttonRef={secondaryMenuTargetRef}
              />
            )}
          </div>
        ))}
      </div>

      <PageManager isVertical={isVertical} />
    </>
  );

  return (
    <>
      <div
        className={`
          fixed z-50 flex backdrop-blur-md bg-neutral-900/90 border border-neutral-700 p-2 gap-1
          ${containerClass}
        `}
      >
        {isVertical ? (
          <div className="flex flex-col items-center">
            {toolbarContent}
          </div>
        ) : (
          <div className={`flex items-center gap-1 ${toolbarMode === 'fill' ? 'justify-between w-full' : ''}`}>
            {toolbarContent}
          </div>
        )}
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default Toolbar;
