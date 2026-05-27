interface SizeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const SizeSlider = ({ label, value, min, max, step, onChange }: SizeSliderProps) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-xs text-gray-700 dark:text-neutral-300">
        <span>{label}</span>
        <span className="text-blue-400 font-mono">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          accent-blue-500 bg-gray-200 dark:bg-neutral-600
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-400
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
      />
    </div>
  );
};

export default SizeSlider;
