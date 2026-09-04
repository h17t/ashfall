import { memo } from 'react';
import { useGame, useSel } from '../store';
import { fmt, D } from '@/engine';
import { Bar } from './Bar';

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

  return (
    <div className="slab p-4 flex flex-col gap-3">
      <div className="flex justify-between items-baseline">
        <span className="font-display text-xl text-bone-100">Ember-tender</span>
        <span className="text-[10px] uppercase tracking-widest text-bone-400">Soul level <span className="font-num text-bone-200">{level}</span></span>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-ember-400">Souls</div>
        <div className="font-num text-3xl text-bone-100 leading-tight">{fmt(D(souls))}</div>
        {bloodstain && <div className="text-[11px] text-blood-500 mt-0.5">Bloodstain: <span className="font-num">{fmt(D(bloodstain))}</span> souls lie where you fell.</div>}
      </div>
      <Bar value={hp} max={hpMax} color={poisoned ? '#7c4dab' : '#7d1620'} label="HP" text={`${hp}/${hpMax}`} height={12} />
      <Bar value={stam} max={stamMax} color="#3f7a3a" label="Stamina" text={`${stam}/${stamMax}`} height={8} />
      <div className="flex gap-2">
        <button className="btn flex-1" disabled={estus <= 0 || dead || hp >= hpMax} onClick={() => dispatch({ type: 'estus' })} title="Drink from the Estus flask (E)">
          Estus <span className="font-num text-ember-400">{estus}/{estusMax}</span>
        </button>
        <button className={`btn flex-1 ${iframes ? 'border-ember-500 text-ember-400' : ''}`} disabled={dodgeCd > 0 || dead} onClick={() => dispatch({ type: 'dodge' })} title="Dodge (Space). Time it to the end of a telegraph for a perfect dodge.">
          Dodge {dodgeCd > 0 && <span className="font-num text-bone-400">{dodgeCd.toFixed(1)}s</span>}
        </button>
      </div>
      {buffs && (
        <div className="flex flex-wrap gap-1">
          {buffs.split(',').map((b) => {
            const [id, t] = b.split(':');
            return <span key={id} className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 border border-ember-700 text-ember-400 rounded-sm">{id.replace('spell:', '')} {t}s</span>;
          })}
        </div>
      )}
      <button className="btn text-xs" disabled={dead} onClick={() => dispatch({ type: 'retreat' })} title="Return to the bonfire. Refills Estus and HP. Keeps your souls. Resets the fight.">
        Rest at bonfire
      </button>
      <p className="text-[11px] text-bone-400 leading-snug">Click the enemy to strike. Fill the pale bar to stagger it, then strike during the <span className="text-ember-400">Riposte</span> window. Dodge when the red bar fills.</p>
    </div>
  );
});
