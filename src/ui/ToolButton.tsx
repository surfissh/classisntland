import { useState, useRef, type ReactNode } from 'react';

interface ToolButtonProps {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
}

const ToolButton = ({ icon, label, isActive, onClick, onDoubleClick }: ToolButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
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
            : 'bg-transparent text-neutral-300 hover:bg-neutral-700'
          }
          p-2 min-w-[40px] h-10
        `}
        title={label}
      >
        {icon}
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs rounded-md bg-neutral-800 text-white border border-neutral-600 shadow-lg whitespace-nowrap z-50 pointer-events-none">
          {label}
        </div>
      )}
    </div>
  );
};

export default ToolButton;
