import type { ShapeType } from '@/types';

interface ShapeSelectorProps {
  value: ShapeType;
  onChange: (type: ShapeType) => void;
}

const SHAPES: { type: ShapeType; icon: string; label: string }[] = [
  { type: 'rectangle', icon: '▭', label: 'Rectangle' },
  { type: 'circle', icon: '○', label: 'Circle' },
  { type: 'arc', icon: '◠', label: 'Arc' },
  { type: 'line', icon: '╱', label: 'Line' },
  { type: 'arrow', icon: '→', label: 'Arrow' },
];

const ShapeSelector = ({ value, onChange }: ShapeSelectorProps) => {
  return (
    <div className="flex items-center gap-1">
      {SHAPES.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          title={label}
          className={`
            w-9 h-9 flex items-center justify-center rounded-lg text-lg
            transition-all duration-100
            hover:bg-gray-100 dark:hover:bg-neutral-700 active:scale-95
            ${value === type
              ? 'bg-blue-600 ring-2 ring-blue-400 text-white'
              : 'text-gray-700 dark:text-neutral-300'
            }
          `}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

export default ShapeSelector;
