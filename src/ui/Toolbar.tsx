import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const secondaryMenuTargetRef = useRef<HTMLDivElement | null>(null);

  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const setSelectedElementIds = useStore((s) => s.setSelectedElementIds);
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

      if (tool !== activeTool) {
        setSelectedElementIds([]);
      }
      setActiveTool(tool);
    },
    [activeTool, secondaryMenuTool, setActiveTool, setSelectedElementIds]
  );

  const handleToolDoubleClick = useCallback((tool: ToolType) => {
    setSecondaryMenuTool(tool);
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const toolbarPosition = settings.toolbarPosition;
  const toolbarMode = settings.toolbarMode;
  const showToolbar = settings.showToolbar;

  const positionClasses: Record<string, string> = {
    top: 'top-0 flex-row',
    bottom: 'bottom-0 flex-row',
    left: 'left-0 flex-col',
    right: 'right-0 flex-col',
  };

  const fillEdgeClasses: Record<string, string> = {
    top: 'left-0 right-0 w-full overflow-x-auto rounded-none',
    bottom: 'left-0 right-0 w-full overflow-x-auto rounded-none',
    left: 'top-0 bottom-0 h-full overflow-y-auto rounded-none',
    right: 'top-0 bottom-0 h-full overflow-y-auto rounded-none',
  };

  const floatingEdgeClasses: Record<string, string> = {
    top: 'left-1/2 -translate-x-1/2 max-w-[calc(100vw-1rem)] overflow-x-auto rounded-xl mt-2',
    bottom: 'left-1/2 -translate-x-1/2 max-w-[calc(100vw-1rem)] overflow-x-auto rounded-xl mb-2',
    left: 'top-1/2 -translate-y-1/2 max-h-[calc(100vh-1rem)] overflow-y-auto rounded-xl ml-2',
    right: 'top-1/2 -translate-y-1/2 max-h-[calc(100vh-1rem)] overflow-y-auto rounded-xl mr-2',
  };

  const containerClass = `
    ${positionClasses[toolbarPosition] || positionClasses.bottom}
    ${toolbarMode === 'fill'
      ? fillEdgeClasses[toolbarPosition] || fillEdgeClasses.bottom
      : floatingEdgeClasses[toolbarPosition] || floatingEdgeClasses.bottom
    }
  `;

  const isVertical = toolbarPosition === 'left' || toolbarPosition === 'right';

  if (!showToolbar) {
    return (
      <button
        onClick={() => {
          setShowSettings(false);
          setSettings({ showToolbar: true });
        }}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-gray-50/90 dark:bg-neutral-800/90 border border-gray-200 dark:border-neutral-600 shadow-xl flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 backdrop-blur-md transition-all active:scale-95"
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
      <div className={`flex items-center ${toolbarMode === 'fill' ? 'flex-1' : ''} ${isVertical ? 'flex-col' : ''} gap-0.5`}>
        <SaveButton />
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all active:scale-95 select-none"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all active:scale-95 select-none"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {toolbarMode === 'floating' && (
        <div className={isVertical ? 'h-px w-6 bg-gray-200 dark:bg-neutral-600 my-1' : 'w-px h-6 bg-gray-200 dark:bg-neutral-600 mx-1'} />
      )}

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
            {secondaryMenuTool === type &&
              createPortal(
                <SecondaryMenu
                  tool={type}
                  onClose={() => setSecondaryMenuTool(null)}
                  buttonRef={secondaryMenuTargetRef}
                />,
                document.body,
              )}
          </div>
        ))}
        <UndoButton />
      </div>

      {toolbarMode === 'floating' && (
        <div className={isVertical ? 'h-px w-6 bg-gray-200 dark:bg-neutral-600 my-1' : 'w-px h-6 bg-gray-200 dark:bg-neutral-600 mx-1'} />
      )}

      <div className={`flex items-center ${isVertical ? 'flex-col' : ''} ${toolbarMode === 'fill' ? 'flex-1 justify-end' : ''} gap-0.5`}>
        <PageManager isVertical={isVertical} />
      </div>
    </>
  );

  return (
    <>
      <div
        className={`
          fixed z-50 flex backdrop-blur-md bg-white/90 dark:bg-neutral-900/90 border border-gray-200 dark:border-neutral-700 p-2 gap-1
          ${containerClass}
        `}
      >
        {isVertical ? (
          <div className={`flex flex-col items-center ${toolbarMode === 'fill' ? 'h-full w-full' : ''}`}>
            {toolbarContent}
          </div>
        ) : (
          <div className={`flex items-center gap-1 flex-nowrap ${toolbarMode === 'fill' ? 'w-full' : 'justify-center'}`}>
            {toolbarContent}
          </div>
        )}
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default Toolbar;
