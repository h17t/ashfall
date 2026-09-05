import { memo } from 'react';
import { Gauge, type Tone } from '@/render/Gauge';

interface Props {
  value: number;
  max: number;
  /** a palette tone; older callers passed a colour, which maps onto the nearest tone */
  color: Tone | string;
  label?: string;
  height?: number;
  className?: string;
  text?: string;
}

const TONES: Tone[] = ['blood', 'ember', 'stamina', 'bone', 'wisp', 'gold', 'verdigris'];
function toTone(c: string): Tone {
  if ((TONES as string[]).includes(c)) return c as Tone;
  if (c.includes('wisp')) return 'wisp';
  if (c.includes('verdigris')) return 'stamina';
  if (c.includes('gold')) return 'gold';
  if (c.includes('ember')) return 'ember';
  if (c.includes('blood')) return 'blood';
  return 'bone';
}

/** Thin wrapper kept for older call sites; everything renders as a chipped Gauge. */
export const Bar = memo(function Bar({ value, max, color, label, height = 10, className = '', text }: Props) {
  return <Gauge value={value} max={max} tone={toTone(color)} label={label} text={text} height={height} className={className} />;
});
