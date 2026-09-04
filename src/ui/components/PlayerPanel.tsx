import { memo, useCallback, useState } from 'react';
import { useGame, useSel } from '../store';
import { useEvents } from '../hooks/useEvents';
import { fmt, D, type GameEvent, computeMods, weaponDamage } from '@/engine';
import { getZone, BALANCE, getWeapon } from '@/content';
import { Gauge } from '@/render/Gauge';
import { Slab } from '@/render/materials/Slab';
import { Plate } from '@/render/Plate';

/** The ember-tender's hub: souls, vitals, the flask, the blade in hand. Overlaps the arena's edge. */
export const PlayerPanel = memo(function PlayerPanel() {
  const dispatch = useGame((g) => g.dispatch);
  const hp = useSel((s) => Math.round(s.player.hp));
  const hpMax = useSel((s) => s.player.hpMax);
  const stam = useSel((s) => Math.round(s.player.stamina));
  const stamMax = useSel((s) => s.player.staminaMax);
  const estus = useSel((s) => s.player.estus);
  const estusMax = useSel((s) => s.player.estusMax);
  const souls = useSel((s) => s.souls.toString());
  const level = useSel((s) => s.player.level);
  const dodgeCd = useSel((s) => s.player.dodgeCd);
  const iframes = useSel((s) => s.player.iframes > 0);
  const bloodstain = useSel((s) => s.bloodstain?.souls.toString() ?? null);
  const dead = useSel((s) => s.deathScreen > 0);
  const buffs = useSel((s) => s.player.buffs.map((b) => `${b.id}:${Math.ceil(b.t)}`).join(','));
  const poisoned = useSel((s) => s.player.poisoned > 0);
  const run = useSel((s) => s.corpseRun ? `${s.corpseRun.atTier}/${s.corpseRun.targetTier}` : '');
  const runTarget = useSel((s) => s.corpseRun ? (s.corpseRun.targetTier < 0 ? 'the boss arena' : getZone(s.corpseRun.zone).tiers[s.corpseRun.targetTier].name) : '');
  const runKillsLeft = useSel((s) => {
    const r = s.corpseRun; if (!r) return 0;
    const z = getZone(r.zone);
    const target = r.targetTier < 0 ? z.tiers.length : r.targetTier;
    return (target - r.atTier + (r.targetTier < 0 ? 0 : 1)) * BALANCE.death.runKillsPerTier - r.killsAtTier;
  });
  const weaponId = useSel((s) => s.player.weapon);
  const weaponLevel = useSel((s) => s.player.weapons[s.player.weapon]?.level ?? 0);
  const weaponDmg = useSel((s) => weaponDamage(s, computeMods(s), s.player.weapon).total.toString());
  const weapon = getWeapon(weaponId);
  const [exhaustFlash, setExhaustFlash] = useState(0);
  useEvents(useCallback((events: GameEvent[]) => { if (events.some((e) => e.type === 'exhausted')) setExhaustFlash((x) => x + 1); }, []));

  return (
    <Slab material="stone" seed="hub" rough={6} className="px-6 pt-5 pb-5 flex flex-col gap-4">
      <div className="flex justify-between items-baseline">
        <span className="t-label">Ember-tender · Soul level <span className="t-num text-[12px]" style={{ color: 'var(--parchment)' }}>{level}</span></span>
      </div>
      <div className="-mt-1">
        <div className="t-label" style={{ color: 'var(--ember-hot)' }}>Souls</div>
        <div className="t-num text-[46px] leading-none mt-1" style={{ color: 'var(--parchment)' }}>{fmt(D(souls))}</div>
        {bloodstain && (
          <div className="text-[13px] mt-2 px-3 py-2" style={{ border: '1px solid color-mix(in srgb, var(--blood) 70%, transparent)', background: 'color-mix(in srgb, var(--blood) 14%, transparent)', color: 'var(--parchment)' }}>
            <div><span style={{ color: 'var(--blood-bright)' }}>Bloodstain.</span> <span className="t-num">{fmt(D(bloodstain))}</span> souls lie at {runTarget || 'where you fell'}.</div>
            {run && <div className="t-lore text-[13px]">{runKillsLeft} kill{runKillsLeft === 1 ? '' : 's'} to reach it. Die first and it is gone.</div>}
            {run && <button className="t-label mt-1 hover:text-blood-bright" onClick={() => dispatch({ type: 'abandonBloodstain' })}>Abandon the stain</button>}
          </div>
        )}
      </div>
      <Gauge value={hp} max={hpMax} tone={poisoned ? 'verdigris' : 'blood'} label="HP" text={`${hp} / ${hpMax}`} height={12} />
      <div key={exhaustFlash} className={exhaustFlash ? 'shake' : ''}>
        <Gauge value={stam} max={stamMax} tone={stam < 10 ? 'gold' : 'stamina'} label="Stamina" text={`${stam} / ${stamMax}`} height={8} cut={1} />
      </div>
      <div className="flex gap-2">
        <button className="btn flex-1" disabled={estus <= 0 || dead || hp >= hpMax} onClick={() => dispatch({ type: 'estus' })} title="Drink from the Estus flask (E)">
          Estus <span className="t-num ml-1" style={{ color: 'var(--ember-hot)' }}>{estus}/{estusMax}</span>
        </button>
        <button className={`btn flex-1 ${iframes ? 'btn-ember' : ''}`} disabled={dodgeCd > 0 || dead} onClick={() => dispatch({ type: 'dodge' })} title="Dodge (Space). Time it to the end of a telegraph for a perfect dodge.">
          Dodge {dodgeCd > 0 && <span className="t-num ml-1" style={{ color: 'var(--bone)' }}>{dodgeCd.toFixed(1)}s</span>}
        </button>
      </div>
      {buffs && (
        <div className="flex flex-wrap gap-1">
          {buffs.split(',').map((b) => {
            const [id, t] = b.split(':');
            return <span key={id} className="t-label px-2 py-0.5" style={{ border: '1px solid var(--ember)', color: 'var(--ember-hot)' }}>{id.replace('spell:', '')} {t}s</span>;
          })}
        </div>
      )}
      <div className="t-rule" />
      <div className="flex gap-3 items-start">
        <div className="w-[68px] h-[68px] shrink-0 -ml-1 -mt-1" style={{ filter: 'drop-shadow(-3px 5px 6px var(--void))' }}><Plate kind="weapon" id={weaponId} className="w-full h-full object-contain" /></div>
        <div className="min-w-0">
          <div className="t-label" style={{ color: 'var(--parchment)' }}>{weapon.name} {weaponLevel > 0 && <span style={{ color: 'var(--ember-hot)' }}>+{weaponLevel}</span>}</div>
          <div className="t-lore text-[13px] leading-snug mt-1 line-clamp-3">{weapon.lore}</div>
          <div className="t-num text-[13px] mt-1" style={{ color: 'var(--bone)' }}>Damage {fmt(D(weaponDmg))} · Stagger {weapon.stagger} · Riposte ×{weapon.riposteMult.toFixed(1)}</div>
        </div>
      </div>
      <button className="btn" disabled={dead} onClick={() => dispatch({ type: 'retreat' })} title="Return to the bonfire. Refills Estus and HP. Keeps your souls. Resets the fight.">
        Rest at the bonfire
      </button>
      <p className="t-lore text-[13px] leading-snug">Click the enemy to strike. Fill the pale bar to stagger it, then strike in the <span style={{ color: 'var(--ember-hot)', fontStyle: 'normal' }}>Riposte</span> window. Dodge when the red bar fills.</p>
    </Slab>
  );
});
