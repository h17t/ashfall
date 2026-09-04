import { memo } from 'react';
import { Plate } from '@/render/Plate';
import { hasAsset } from '../../../assets/manifest';
import { EnemySprite } from './EnemySprite';
import { getBoss, getEnemy } from '@/content';

/**
 * The enemy as an illustration, with status and hit reads laid over the plate through its
 * silhouette mask: blood for the hit frame, ember for the open riposte, verdigris for poison,
 * soul-blue for frost. One tint at a time; the loudest wins.
 */
interface Props { kind: 'enemy' | 'boss'; id: string; hurt: boolean; staggered: boolean; poison: boolean; frost: boolean; bleed: number; big: boolean }

export const Figure = memo(function Figure({ kind, id, hurt, staggered, poison, frost, bleed, big }: Props) {
  if (!hasAsset(kind, id)) {
    const shape = kind === 'boss' ? getBoss(id).shape : getEnemy(id).shape;
    return <div className="h-[70%]"><EnemySprite shape={shape} phase={0} staggered={staggered} hurt={hurt} /></div>;
  }
  const tint = hurt
    ? { color: 'var(--blood-bright)', opacity: 0.6, blend: 'screen' as const }
    : staggered
      ? { color: 'var(--ember-hot)', opacity: 0.4, blend: 'screen' as const }
      : frost
        ? { color: 'var(--soul)', opacity: 0.45, blend: 'screen' as const }
        : poison
          ? { color: 'var(--verdigris)', opacity: 0.5, blend: 'screen' as const }
          : bleed > 40
            ? { color: 'var(--blood)', opacity: Math.min(0.55, bleed / 160), blend: 'screen' as const }
            : undefined;
  const glow = staggered
    ? `drop-shadow(0 0 22px color-mix(in srgb, var(--ember-hot) 70%, transparent))`
    : `drop-shadow(-6px 10px 14px color-mix(in srgb, var(--void) 90%, transparent))`;
  return (
    <Plate
      kind={kind}
      id={id}
      tint={tint}
      className={big ? 'h-[100%] max-h-[600px] aspect-[384/448]' : 'h-[92%] max-h-[520px] aspect-[256/320]'}
      imgStyle={{ filter: glow, transition: 'filter 160ms' }}
    />
  );
});
