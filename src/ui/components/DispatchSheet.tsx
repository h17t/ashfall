import { memo } from 'react';
import { useGame, useSel } from '../store';
import { Sheet } from '../shell/Sheet';
import { missionPreview, canDispatch, fmt, D, MISSION_KINDS, type MissionKind } from '@/engine';
import { getPhantom, MATERIALS, BALANCE } from '@/content';
import { haptic } from '../haptics';

const KIND_TEXT: Record<MissionKind, { name: string; lore: string }> = {
  safe: { name: 'The near road', lore: 'Known ground, a short way. It comes back with something and it comes back.' },
  risky: { name: 'The far road', lore: 'Past the last lantern. Most come back; some come back with nothing.' },
  perilous: { name: 'Into the dark', lore: 'Where the road stops being a road. The pay is the best there is, and the dark keeps one in five.' },
};

/** Three expeditions, each a duration, odds and a haul; the shade's name on the sheet. */
export const DispatchSheet = memo(function DispatchSheet({ shade, onClose }: { shade: string; onClose: () => void }) {
  const dispatch = useGame((g) => g.dispatch);
  const previews = useSel((s) => JSON.stringify(MISSION_KINDS.map((k) => { const p = missionPreview(s, shade, k); return { k, marrow: p.marrow.toString(), seconds: p.seconds, success: p.success, keepsake: p.keepsake, lost: p.lost, slag: p.slag, why: canDispatch(s, shade, k) }; })));
  const def = getPhantom(shade);
  const list = JSON.parse(previews) as { k: MissionKind; marrow: string; seconds: number; success: number; keepsake: number; lost: number; slag: string; why: string | null }[];
  return (
    <Sheet open onClose={onClose} material="stone" title={`Dispatch ${def.name}`}>
      <div className="flex flex-col gap-3">
        <p className="text-[14px] leading-snug" style={{ color: 'var(--bone)' }}>An expedition takes the shade out of your Cortege for its length and brings back marrow, slag, and sometimes a lord's Keepsake. A shade that does not return leaves an Echo: a permanent bonus by its role. The clock runs while you are away.</p>
        {list.map((p) => (
          <button key={p.k} className={`mission-card ${p.k}`} disabled={p.why !== null} onClick={() => { haptic(p.k === 'perilous' ? 'hurt' : 'tap'); dispatch({ type: 'dispatch', shade, kind: p.k }); onClose(); }}>
            <span className="flex items-baseline justify-between"><span className="t-display text-[18px]">{KIND_TEXT[p.k].name}</span><span className="t-num text-[13px]" style={{ color: 'var(--bone)' }}>{Math.round(p.seconds / 60)} min</span></span>
            <span className="block text-[14px] italic mt-1" style={{ color: 'color-mix(in srgb, var(--bone) 80%, transparent)' }}>{KIND_TEXT[p.k].lore}</span>
            <span className="block text-[14px] mt-1" style={{ color: 'var(--parchment)' }}>
              <span className="t-num" style={{ color: 'var(--ember-hot)' }}>{fmt(D(p.marrow))}</span> marrow · {p.k === 'perilous' ? 3 : p.k === 'risky' ? 2 : 1} {MATERIALS[p.slag]?.name ?? p.slag}
              {p.keepsake > 0 && <span> · <span className="t-num">{Math.round(p.keepsake * 100)}%</span> a Keepsake</span>}
            </span>
            <span className="block t-num text-[12px] mt-1" style={{ color: 'var(--bone)' }}>{Math.round(p.success * 100)}% returns with it{p.lost > 0 && <span style={{ color: 'var(--blood-bright)' }}> · {Math.round(p.lost * 100)}% does not return</span>}</span>
            {p.why && <span className="block text-[13px] mt-1" style={{ color: 'var(--blood-bright)' }}>{p.why}</span>}
          </button>
        ))}
        <div className="t-label">{BALANCE.dispatch.failRetreat}s of rest after a failed road</div>
      </div>
    </Sheet>
  );
});
