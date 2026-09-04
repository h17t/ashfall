import { memo } from 'react';

interface Props {
  value: number;
  max: number;
  color: string;
  label?: string;
  height?: number;
  className?: string;
  text?: string;
}

export const Bar = memo(function Bar({ value, max, color, label, height = 10, className = '', text }: Props) {
  const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className={`w-full ${className}`}>
      {label && <div className="text-[10px] uppercase tracking-widest text-bone-400 mb-0.5 flex justify-between"><span>{label}</span>{text && <span className="font-num text-bone-300">{text}</span>}</div>}
      <div className="w-full bg-ash-900 border border-ash-700 rounded-sm overflow-hidden" style={{ height }}>
        <div className="h-full transition-[width] duration-100 ease-linear" style={{ width: `${frac * 100}%`, background: color }} />
      </div>
    </div>
  );
});
