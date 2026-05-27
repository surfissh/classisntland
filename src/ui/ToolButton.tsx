import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ToolButtonProps {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
}

const ToolButton = ({ icon, label, isActive, onClick, onDoubleClick }: ToolButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastClickTimeRef = useRef(0);

  const handleClick = () => {
    const now = Date.now();
    const isDouble = now - lastClickTimeRef.current < 300;
    lastClickTimeRef.current = now;

    onClick();

    if (isDouble && onDoubleClick) {
      onDoubleClick();
    }
  };

  useEffect(() => {
    if (!showTooltip || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setTooltipStyle({
      position: 'fixed',
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
      transform: 'translate(-50%, -100%)',
    });
  }, [showTooltip]);

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          inline-flex items-center justify-center gap-1.5 rounded-lg
          transition-all duration-150 select-none
          hover:brightness-110 active:scale-95
          ${isActive
            ? 'bg-blue-600 ring-2 ring-blue-400 text-white'
            : 'bg-transparent text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
          }
          p-2 min-w-[40px] h-10
        `}
        title={label}
      >
        {icon}
      </button>
      {showTooltip &&
        createPortal(
          <div
            style={tooltipStyle}
            className="px-2 py-1 text-xs rounded-md bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white border border-gray-200 dark:border-neutral-600 shadow-lg whitespace-nowrap z-50 pointer-events-none"
          >
            {label}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default ToolButton;
