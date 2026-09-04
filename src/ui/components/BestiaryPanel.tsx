import { memo, useState } from 'react';
import { useSel } from '../store';
import { ENEMIES, BOSSES, ZONES, ZONE_ORDER, getZone } from '@/content';
import { VARIANTS } from '@/engine';
import { Plate } from '@/render/Plate';
import { Slab } from '@/render/materials/Slab';
import { hasAsset } from '../../../assets/manifest';

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
      <div className="t-display text-[20px] text-ember-hot">Bestiary</div>
      <p className="text-[13px] text-bone/70">What you have learned of the road. Knowledge is kept through every fire.</p>
      {ZONE_ORDER.filter((z) => zones.includes(z)).map((zid) => {
        const z = getZone(zid);
        const enemies = Array.from(new Set(z.tiers.flatMap((t) => t.enemies)));
        const bosses = [z.boss, z.secretBoss].filter(Boolean) as string[];
        return (
          <div key={zid} className="border border-ash/50 p-2">
            <div className="font-display text-[16px] text-parchment">{z.name}</div>
            <div className="text-[13px] italic text-bone/70 mb-1">{z.lore}</div>
            {enemies.map((id) => <Entry key={id} id={id} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />)}
            {bosses.map((id) => <Entry key={id} id={id} boss known={killed.has(id)} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />)}
          </div>
        );
      })}
      {kindles > 0 && (
        <div className="border border-ash/50 p-2">
          <div className="font-display text-[16px] text-parchment">Variants of the second burning</div>
          {Object.entries(VARIANTS).filter(([, v]) => v.minNg <= kindles).map(([k, v]) => (
            <div key={k} className="text-[14px]"><span className="text-ember-hot">{v.name}</span> <span className="text-bone/70">— {v.desc}</span></div>
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
  const kind = boss ? 'boss' : 'enemy';
  const plate = known && hasAsset(kind, id);
  return (
    <div className="text-[14px]">
      <button className={`text-left w-full flex items-center gap-2 ${boss ? 'font-display text-[15px]' : ''} ${known ? 'text-parchment' : 'text-bone/70'} hover:text-ember-hot`} onClick={onToggle}>
        <span className="w-8 h-8 shrink-0 overflow-hidden" style={{ opacity: plate ? 1 : 0.3 }}>{plate ? <Plate kind={kind} id={id} className="w-full h-full object-cover object-top" /> : <span className="block w-full h-full" style={{ background: 'var(--ink)' }} />}</span>
        <span>{known ? name : boss ? 'A lord, unmet' : name}</span>
      </button>
      {open && (
        <div className="my-2 -mx-1">
          <Slab material="parchment" seed={`lore-${id}`} rough={6} ornament="none" tilt={0.4} className="p-3 pl-[128px] min-h-[150px] leading-snug relative">
            {plate && <div className="absolute left-2 top-2 w-[112px] h-[140px]" style={{ filter: 'sepia(0.35) contrast(1.05)' }}><Plate kind={kind} id={id} className="w-full h-full object-contain object-bottom" /></div>}
            <div className="t-display text-[17px]" style={{ color: 'var(--ink)' }}>{known ? name : 'Unknown'}</div>
            <div className="t-lore text-[14px] mt-1" style={{ color: 'var(--stone)' }}>{known ? def.lore : 'You have not yet seen it fall.'}</div>
            {!boss && known && <div className="font-num text-[12px] mt-2" style={{ color: 'var(--ash)' }}>hp ×{(def as any).hpMult} · dmg ×{(def as any).dmgMult} · poise ×{(def as any).poiseMult} · resists {Object.entries((def as any).resist).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'} · status {Object.entries((def as any).statusResist).map(([k, v]) => `${k} ${v}`).join(', ') || 'normal'}</div>}
            {boss && known && <div className="text-[13px] mt-2" style={{ color: 'var(--ash)' }}>{(def as any).phases.map((p: any) => `${p.name}: ${p.mechanic ?? 'no trick'}`).join(' · ')}</div>}
          </Slab>
        </div>
      )}
    </div>
  );
}
