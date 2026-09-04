import { memo, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { edgePolygon, type EdgeStyle } from './edge';
import { grainTile, mottleTile } from './noise';
import { hashSeed } from '../seed';

/**
 * A panel that is an object. Stone slab, scorched leather or nailed parchment: a chipped or torn
 * outline from a seeded polygon (never border-radius), a bevel lit from the bonfire at bottom-left
 * that breathes with `--fire`, grain, and a real shadow cast on whatever it overlaps.
 *
 * Nothing here uses an SVG filter at runtime; edges are clip-path polygons, grain is a cached tile,
 * so a slab costs one composited layer and re-paints only when its content does.
 */
export type Material = 'stone' | 'leather' | 'parchment' | 'iron';

interface Props {
  material?: Material;
  /** any string: the same key always tears the same way */
  seed?: string | number;
  /** classes for the content box: padding, flex, gap */
  className?: string;
  /** classes for the outer object: width, min-height, flex-1 */
  outer?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** how far the edge wanders, px */
  rough?: number;
  edge?: EdgeStyle;
  /** cast a shadow on what's beneath */
  shadow?: boolean;
  /** a nail head in the top-left, a scorch at the top-right, a fold at the bottom-right */
  ornament?: 'nail' | 'scorch' | 'fold' | 'none';
  /** slight lean, degrees */
  tilt?: number;
  as?: 'div' | 'section' | 'aside' | 'header';
}

const MAT: Record<Material, { base: string; rim: string; fg: string; grain: number; mottle: number; edge: EdgeStyle; rough: number; hot: string }> = {
  stone: { base: 'linear-gradient(155deg, var(--stone) 0%, color-mix(in srgb, var(--stone) 70%, var(--ink)) 60%, var(--ink) 100%)', rim: 'color-mix(in srgb, var(--bone) 14%, var(--stone))', fg: 'var(--bone)', grain: 0.5, mottle: 0.55, edge: 'chipped', rough: 6, hot: 'var(--ember)' },
  leather: { base: 'linear-gradient(170deg, color-mix(in srgb, var(--ink) 80%, var(--blood)) 0%, var(--ink) 55%, var(--void) 100%)', rim: 'color-mix(in srgb, var(--ash) 45%, var(--ink))', fg: 'var(--bone)', grain: 0.7, mottle: 0.75, edge: 'chipped', rough: 4, hot: 'var(--ember)' },
  parchment: { base: 'linear-gradient(160deg, var(--parchment) 0%, color-mix(in srgb, var(--parchment) 80%, var(--bone)) 55%, color-mix(in srgb, var(--bone) 85%, var(--ash)) 100%)', rim: 'color-mix(in srgb, var(--ash) 30%, var(--bone))', fg: 'var(--ink)', grain: 0.3, mottle: 0.45, edge: 'torn', rough: 9, hot: 'var(--ember-hot)' },
  iron: { base: 'linear-gradient(165deg, var(--ash) 0%, var(--stone) 40%, var(--ink) 100%)', rim: 'color-mix(in srgb, var(--bone) 25%, var(--ash))', fg: 'var(--parchment)', grain: 0.6, mottle: 0.4, edge: 'cut', rough: 2, hot: 'var(--ember-hot)' },
};

export function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => { const r = el.getBoundingClientRect(); setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height })); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

export const Slab = memo(function Slab({ material = 'stone', seed = 1, className = '', outer = '', style, children, rough, edge, shadow = true, ornament = 'nail', tilt = 0, as: Tag = 'div' }: Props) {
  const m = MAT[material];
  const seedN = typeof seed === 'number' ? seed : hashSeed(seed);
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const rgh = rough ?? m.rough;
  const edg = edge ?? m.edge;
  const outline = useMemo(() => (w > 0 ? edgePolygon(w, h, seedN, rgh, edg) : undefined), [w, h, seedN, rgh, edg]);
  const inner = useMemo(() => (w > 0 ? edgePolygon(w, h, seedN, rgh, edg, 1.5) : undefined), [w, h, seedN, rgh, edg]);
  const lit = `linear-gradient(38deg, ${m.hot} 0%, transparent 42%)`;
  const cold = 'linear-gradient(218deg, var(--void) 0%, transparent 38%)';
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={`relative ${outer}`} style={{ color: m.fg, transform: tilt ? `rotate(${tilt}deg)` : undefined, ...style }}>
      {shadow && (
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ filter: 'blur(11px)', transform: 'translate(-9px, 13px)', willChange: 'transform', opacity: 0.8 }}>
          <div className="absolute inset-0" style={{ background: 'var(--void)', clipPath: outline }} />
        </div>
      )}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: m.rim, clipPath: outline }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ clipPath: inner, background: m.base }}>
        <div className="absolute inset-0" style={{ backgroundImage: mottleTile(), backgroundSize: '256px 256px', opacity: m.mottle, mixBlendMode: 'multiply' }} />
        <div className="absolute inset-0" style={{ backgroundImage: grainTile(), backgroundSize: '256px 256px', opacity: m.grain, mixBlendMode: material === 'parchment' ? 'multiply' : 'overlay' }} />
        <div className="absolute inset-0" style={{ background: cold, opacity: 0.55 }} />
        <div className="absolute inset-0" style={{ background: lit, opacity: 'calc(0.22 * var(--fire))' as unknown as number }} />
        {ornament === 'nail' && <span className="absolute" style={{ left: 9, top: 9, width: 7, height: 7, background: 'radial-gradient(circle at 35% 35%, var(--bone), var(--ink) 70%)', clipPath: 'polygon(50% 0,100% 40%,80% 100%,20% 100%,0 40%)' }} />}
        {ornament === 'scorch' && <span className="absolute" style={{ right: -20, top: -24, width: 120, height: 70, background: 'radial-gradient(ellipse at 50% 50%, var(--void) 0%, transparent 65%)', opacity: 0.75 }} />}
        {ornament === 'fold' && <span className="absolute" style={{ right: 0, bottom: 0, width: 16, height: 16, background: 'linear-gradient(225deg, var(--bone) 0 48%, var(--ash) 50%, transparent 52%)', opacity: 0.7 }} />}
      </div>
      <div className={`relative ${className}`} style={{ clipPath: inner }}>{children}</div>
    </Tag>
  );
});
