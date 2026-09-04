import { memo, type CSSProperties } from 'react';
import { asset, type AssetKind } from '../../assets/manifest';

/**
 * An illustration from the manifest. Components never import an image path: they ask for a kind
 * and an id, and the manifest decides which file (procedural today, authored later) answers.
 */
interface Props {
  kind: AssetKind;
  id: string;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  /** a colour laid over the figure through its silhouette mask (status effects, hurt, stagger) */
  tint?: { color: string; opacity: number; blend?: CSSProperties['mixBlendMode'] };
  draggable?: boolean;
  /** styles for the image itself (filters that must not re-run when the tint changes) */
  imgStyle?: CSSProperties;
  /** the trimmed icon crop where the manifest has one (weapon chips) */
  variant?: 'plate' | 'icon';
}

export const Plate = memo(function Plate({ kind, id, className = '', style, alt = '', tint, imgStyle, variant = 'plate' }: Props) {
  const e = asset(kind, id);
  const icon = variant === 'icon' && e.files.icon ? e.files.icon : null;
  const img = (
    <img
      src={icon ?? e.files.x2}
      srcSet={icon ? undefined : `${e.files.x1} 1x, ${e.files.x2} 2x`}
      width={e.w}
      height={e.h}
      alt={alt}
      draggable={false}
      decoding="async"
      className={tint ? 'block w-full h-full object-contain' : className}
      style={tint ? imgStyle : { ...imgStyle, ...style }}
    />
  );
  if (!tint) return img;
  return (
    <div className={`relative ${className}`} style={style}>
      {img}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: tint.color,
          opacity: tint.opacity,
          mixBlendMode: tint.blend ?? 'screen',
          WebkitMaskImage: `url(${e.files.mask ?? ""})`,
          maskImage: `url(${e.files.mask ?? ""})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          transition: 'opacity 120ms linear',
        }}
      />
    </div>
  );
});

export function plateMask(kind: AssetKind, id: string): string {
  return asset(kind, id).files.mask ?? "";
}
