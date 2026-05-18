import { useState } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#a855f7',
  '#ec4899',
  '#06b6d4',
  '#94a3b8',
  '#78716c',
];

const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const [hexInput, setHexInput] = useState(value);

  const handleHexChange = (hex: string) => {
    setHexInput(hex);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => {
              onChange(color);
              setHexInput(color);
            }}
            className={`
              w-6 h-6 rounded-full transition-all duration-100
              hover:scale-110 active:scale-95
              ${value === color ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-neutral-800' : ''}
            `}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          onBlur={() => setHexInput(value)}
          placeholder="#000000"
          className="flex-1 bg-neutral-700 border border-neutral-500 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-blue-400"
        />
        <div
          className="w-6 h-6 rounded-full border border-neutral-500 shrink-0"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
};

export default ColorPicker;
