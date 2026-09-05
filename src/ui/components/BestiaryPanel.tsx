import { memo, useState } from 'react';
import { useSel } from '../store';
import { ENEMIES, BOSSES, ZONES, ZONE_ORDER, getZone } from '@/content';
import { VARIANTS, studyRank, studyKills, studyNext, studyBonus, studyThresholds } from '@/engine';
import { STUDY_RANK_NAMES, STUDY_REVEALS, MATERIALS } from '@/content';
import { Plate } from '@/render/Plate';
import { Slab } from '@/render/materials/Slab';
import { hasAsset } from '../../../assets/manifest';

/** Kept knowledge: every foe you have met, with its lore and its numbers. Survives Snuffing and the Severing. */
export const BestiaryPanel = memo(function BestiaryPanel() {
  const seen = useSel((s) => s.unlockedZones.join(','));
  const ever = useSel((s) => s.prestige.bossesEverKilled.join(','));
  const wakings = useSel((s) => s.prestige.wakings);
  const [open, setOpen] = useState<string | null>(null);
  const zones = seen.split(',').filter(Boolean);
  const killed = new Set(ever.split(',').filter(Boolean));
  return (
    <div className="flex flex-col gap-3">
      <div className="t-display text-[20px] text-ember-hot">The Study</div>
      <p className="text-[13px] text-bone/70">What you have learned of the road, one kill at a time. Every rank reveals more of a creature, sharpens you against it, and pays a small bonus that is kept through every fire.</p>
      <StudyBar />
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
      {wakings > 0 && (
        <div className="border border-ash/50 p-2">
          <div className="font-display text-[16px] text-parchment">Variants of the second burning</div>
          {Object.entries(VARIANTS).filter(([, v]) => v.minNg <= wakings).map(([k, v]) => (
            <div key={k} className="text-[14px]"><span className="text-ember-hot">{v.name}</span> <span className="text-bone/70">— {v.desc}</span></div>
          ))}
        </div>
      )}
    </div>
  );
});

function StudyBar() {
  const b = useSel((s) => JSON.stringify(studyBonus(s)));
  const { dmg, ranks, total } = JSON.parse(b) as { dmg: number; ranks: number; total: number };
  const pct = total ? Math.round((ranks / total) * 100) : 0;
  return (
    <div className="study-bar" role="status" aria-label={`The Study ${pct} percent complete`}>
      <div className="flex justify-between text-[13px]"><span className="t-label">Completion</span><span className="t-num" style={{ color: 'var(--parchment)' }}>{ranks}/{total} ranks · {pct}%</span></div>
      <div className="study-track"><div className="study-fill" style={{ width: `${pct}%` }} /></div>
      <div className="text-[13px] mt-1" style={{ color: 'var(--bone)' }}>Damage and marrow <span className="t-num" style={{ color: 'var(--ember-hot)' }}>+{Math.round(dmg * 1000) / 10}%</span> from what you know.</div>
    </div>
  );
}

function RankPips({ id }: { id: string }) {
  const rank = useSel((s) => studyRank(s, id));
  const kills = useSel((s) => studyKills(s, id));
  const next = useSel((s) => studyNext(s, id));
  const th = studyThresholds(id);
  const prev = rank > 0 ? th[rank - 1] : 0;
  const frac = next === null ? 1 : Math.min(1, (kills - prev) / (next - prev));
  return (
    <span className="flex items-center gap-2 shrink-0">
      <span className="rank-pips" aria-label={`${STUDY_RANK_NAMES[rank]}, ${kills} kills`}>{th.map((_, i) => <span key={i} className={`rank-pip ${i < rank ? 'is-on' : ''}`} />)}</span>
      <span className="t-num text-[12px]" style={{ color: 'var(--bone)' }}>{kills}{next !== null ? `/${next}` : ''}</span>
      {next !== null && <span className="rank-track"><span className="rank-fill" style={{ width: `${Math.round(frac * 100)}%` }} /></span>}
    </span>
  );
}

function Entry({ id, boss, known = true, open, onToggle }: { id: string; boss?: boolean; known?: boolean; open: boolean; onToggle: () => void }) {
  const def = boss ? BOSSES[id] : ENEMIES[id];
  const rank = useSel((s) => studyRank(s, id));
  if (!def) return null;
  const name = boss ? `${(def as any).name}, ${(def as any).title}` : def.name;
  const kind = boss ? 'boss' : 'enemy';
  const plate = known && hasAsset(kind, id);
  return (
    <div className="text-[14px]">
      <button className={`text-left w-full flex items-center gap-2 ${boss ? 'font-display text-[15px]' : ''} ${known ? 'text-parchment' : 'text-bone/70'} hover:text-ember-hot`} onClick={onToggle}>
        <span className="w-8 h-8 shrink-0 overflow-hidden" style={{ opacity: plate ? 1 : 0.3 }}>{plate ? <Plate kind={kind} id={id} className="w-full h-full object-cover object-top" /> : <span className="block w-full h-full" style={{ background: 'var(--ink)' }} />}</span>
        <span className="flex-1 min-w-0 truncate">{known ? name : boss ? 'A lord, unmet' : name}</span>
        <RankPips id={id} />
      </button>
      {open && (
        <div className="my-2 -mx-1">
          <Slab material="parchment" seed={`lore-${id}`} rough={6} ornament="none" tilt={0.4} className="p-3 pl-[128px] min-h-[150px] leading-snug relative">
            {plate && <div className="absolute left-2 top-2 w-[112px] h-[140px]" style={{ filter: 'sepia(0.35) contrast(1.05)' }}><Plate kind={kind} id={id} className="w-full h-full object-contain object-bottom" /></div>}
            <div className="t-display text-[17px]" style={{ color: 'var(--ink)' }}>{known ? name : 'Unknown'}</div>
            <div className="t-lore text-[14px] mt-1" style={{ color: 'var(--stone)' }}>{known ? def.lore : 'You have not yet seen it fall.'}</div>
            <div className="font-num text-[11px] mt-2 uppercase tracking-wider" style={{ color: 'var(--stone)' }}>{STUDY_RANK_NAMES[rank]}{rank < 4 ? ` · next: ${STUDY_REVEALS[rank + 1]}` : ' · you know its measure'}</div>
            {rank >= 1 && <div className="font-num text-[12px] mt-1" style={{ color: 'var(--ash)' }}>resists {Object.entries((def as any).resist ?? {}).map(([k, v]) => `${k} ×${v}`).join(', ') || 'nothing'} · status {Object.entries((def as any).statusResist ?? {}).map(([k, v]) => `${k} ×${v}`).join(', ') || 'as any'}</div>}
            {rank >= 2 && !boss && <div className="text-[12px] mt-1" style={{ color: 'var(--ash)' }}>attacks: {(def as any).attacks.map((a: any) => `${a.name} (${a.windup}s tell, ×${a.mult})`).join(' · ')} · every {(def as any).attackInterval}s</div>}
            {rank >= 2 && boss && <div className="text-[12px] mt-1" style={{ color: 'var(--ash)' }}>{(def as any).phases.map((p: any) => `${p.name}: ${p.mechanic ?? 'no trick'}`).join(' · ')}</div>}
            {rank >= 3 && <div className="text-[12px] mt-1" style={{ color: 'var(--ash)' }}>drops: {Object.entries((def as any).drops).map(([k, v]) => `${MATERIALS[k]?.name ?? k} ${Math.round((v as number) * 100)}%`).join(', ') || 'nothing'}</div>}
            {rank >= 4 && !boss && <div className="font-num text-[12px] mt-1" style={{ color: 'var(--ash)' }}>hp ×{(def as any).hpMult} · dmg ×{(def as any).dmgMult} · composure ×{(def as any).composureMult} · marrow ×{(def as any).marrowMult}</div>}
            <div className="text-[12px] mt-1 italic" style={{ color: 'var(--stone)' }}>+{rank * 3}% damage against it.</div>
          </Slab>
        </div>
      )}
    </div>
  );
}
