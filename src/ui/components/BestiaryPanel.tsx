import { memo, useState } from 'react';
import { useSel } from '../store';
import { ENEMIES, BOSSES, ZONES, ZONE_ORDER, getZone } from '@/content';
import { VARIANTS } from '@/engine';

/** Kept knowledge: every foe you have met, with its lore and its numbers. Survives Kindling and the Sigil. */
export const BestiaryPanel = memo(function BestiaryPanel() {
  const seen = useSel((s) => s.unlockedZones.join(','));
  const ever = useSel((s) => s.prestige.bossesEverKilled.join(','));
  const kindles = useSel((s) => s.prestige.kindles);
  const [open, setOpen] = useState<string | null>(null);
  const zones = seen.split(',').filter(Boolean);
  const killed = new Set(ever.split(',').filter(Boolean));
  return (
    <div className="flex flex-col gap-3">
      <div className="font-display text-lg text-ember-400">Bestiary</div>
      <p className="text-[11px] text-bone-400">What you have learned of the road. Knowledge is kept through every fire.</p>
      {ZONE_ORDER.filter((z) => zones.includes(z)).map((zid) => {
        const z = getZone(zid);
        const enemies = Array.from(new Set(z.tiers.flatMap((t) => t.enemies)));
        const bosses = [z.boss, z.secretBoss].filter(Boolean) as string[];
        return (
          <div key={zid} className="border border-ash-700 rounded-sm p-2">
            <div className="font-display text-base text-bone-100">{z.name}</div>
            <div className="text-[11px] italic text-bone-400 mb-1">{z.lore}</div>
            {enemies.map((id) => <Entry key={id} id={id} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />)}
            {bosses.map((id) => <Entry key={id} id={id} boss known={killed.has(id)} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />)}
          </div>
        );
      })}
      {kindles > 0 && (
        <div className="border border-ash-700 rounded-sm p-2">
          <div className="font-display text-base text-bone-100">Variants of the second burning</div>
          {Object.entries(VARIANTS).filter(([, v]) => v.minNg <= kindles).map(([k, v]) => (
            <div key={k} className="text-[12px]"><span className="text-ember-400">{v.name}</span> <span className="text-bone-400">— {v.desc}</span></div>
          ))}
        </div>
      )}
    </div>
  );
});

function Entry({ id, boss, known = true, open, onToggle }: { id: string; boss?: boolean; known?: boolean; open: boolean; onToggle: () => void }) {
  const def = boss ? BOSSES[id] : ENEMIES[id];
  if (!def) return null;
  const name = boss ? `${(def as any).name}, ${(def as any).title}` : def.name;
  return (
    <div className="text-[12px]">
      <button className={`text-left w-full ${boss ? 'font-display text-sm' : ''} ${known ? 'text-bone-200' : 'text-bone-400'} hover:text-ember-400`} onClick={onToggle}>{boss ? '☠ ' : '· '}{known ? name : boss ? 'A lord, unmet' : name}</button>
      {open && (
        <div className="pl-3 pb-1 text-bone-400 italic leading-snug">
          {known ? def.lore : 'You have not yet seen it fall.'}
          {!boss && known && <div className="not-italic font-num text-[10px] mt-1">hp ×{(def as any).hpMult} · dmg ×{(def as any).dmgMult} · poise ×{(def as any).poiseMult} · resists {Object.entries((def as any).resist).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'} · status {Object.entries((def as any).statusResist).map(([k, v]) => `${k} ${v}`).join(', ') || 'normal'}</div>}
          {boss && known && <div className="not-italic text-[10px] mt-1">{(def as any).phases.map((p: any) => `${p.name}: ${p.mechanic ?? 'no trick'}`).join(' · ')}</div>}
        </div>
      )}
    </div>
  );
}
