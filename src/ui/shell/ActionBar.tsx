import { memo, useCallback } from 'react';
import { useGame, useSel } from '../store';
import { masteryRank, artFor, canArt } from '@/engine';
import { getSpell } from '@/content';
import { Plate } from '@/render/Plate';

/**
 * The thumb zone. Everything the hand does often lives here: Strike (the big one), Dodge,
 * Tallowdraught, and the recitation slots. Every target is at least 56px tall.
 */
export const ActionBar = memo(function ActionBar() {
  const dispatch = useGame((g) => g.dispatch);
  const draughts = useSel((s) => s.player.draughts);
  const draughtsMax = useSel((s) => s.player.draughtsMax);
  const hp = useSel((s) => Math.round(s.player.hp));
  const hpMax = useSel((s) => s.player.hpMax);
  const dodgeCd = useSel((s) => s.player.dodgeCd);
  const iframes = useSel((s) => s.player.iframes > 0);
  const dead = useSel((s) => s.deathScreen > 0);
  const broken = useSel((s) => (s.encounter.enemy?.reprisal ?? 0) > 0);
  const telegraph = useSel((s) => (s.encounter.enemy?.windup ?? 0) > 0);
  const slots = useSel((s) => s.player.recitationSlots);
  const recited = useSel((s) => s.player.recited.join(','));
  const cds = useSel((s) => s.player.recited.map((id) => (id ? Math.ceil(s.player.cooldowns[id] ?? 0) : 0)).join(','));
  const fp = useSel((s) => Math.floor(s.player.fp));
  const art = useSel((s) => { const inst = s.player.weapons[s.player.weapon]; if (masteryRank(inst) < 1) return ''; const a = artFor(s); return JSON.stringify({ name: a.name, id: a.id, cd: Math.ceil(s.player.artCd ?? 0), ready: canArt(s) === null, on: !!s.player.artBuff }); });
  const strike = useCallback(() => dispatch({ type: 'click' }), [dispatch]);
  const ids = recited.split(',');
  const cdList = cds.split(',').map(Number);
  return (
    <div className="action-bar" role="group" aria-label="Actions">
      {(slots > 0 || art) && (
        <div className="action-spells" role="group" aria-label="Recitations and the Art">
          {art && (() => { const a = JSON.parse(art) as { name: string; cd: number; ready: boolean; on: boolean; id: string }; return (
            <button className={`act act-spell act-art ${a.ready ? 'is-ready' : ''} ${a.on ? 'is-on' : ''}`} disabled={!a.ready || dead} aria-label={`${a.name}${a.cd > 0 ? `, ${a.cd} seconds` : ''}`} onPointerDown={(e) => { e.preventDefault(); if (a.ready) dispatch({ type: 'art' }); }}>
              <span className="act-key">Art</span>
              <span className="act-art-icon" aria-hidden><Plate kind="art" id={a.id} className="w-full h-full object-contain" /></span>
              <span className="act-name">{a.name}</span>
              {a.cd > 0 && <span className="act-cd t-num">{a.cd}s</span>}
            </button>
          ); })()}
          {Array.from({ length: slots }, (_, i) => {
            const id = ids[i] || null;
            const def = id ? getSpell(id) : null;
            const ready = !!def && cdList[i] <= 0 && fp >= def.fp;
            return (
              <button key={i} className={`act act-spell ${ready ? 'is-ready' : ''}`} disabled={!def || dead} aria-label={def ? `${def.name}${cdList[i] > 0 ? `, ${cdList[i]} seconds` : ''}` : `Empty recitation slot ${i + 1}`} onClick={() => dispatch({ type: 'cast', slot: i })}>
                <span className="act-key">{i + 1}</span>
                <span className="act-name">{def ? def.name : '—'}</span>
                {def && cdList[i] > 0 && <span className="act-cd t-num">{cdList[i]}s</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="action-main">
        <button className="act act-draught" disabled={draughts <= 0 || dead || hp >= hpMax} onClick={() => dispatch({ type: 'draughts' })} aria-label={`Tallowdraught, ${draughts} of ${draughtsMax}`}>
          <span className="act-name">Draught</span>
          <span className="act-sub t-num">{draughts}/{draughtsMax}</span>
        </button>
        <button className={`act act-strike ${broken ? 'is-reprisal' : ''}`} disabled={dead} onPointerDown={(e) => { e.preventDefault(); strike(); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); strike(); } }} aria-label={broken ? 'Reprisal' : 'Strike'}>
          <span className="act-name">{broken ? 'Reprisal' : 'Strike'}</span>
        </button>
        <button className={`act act-dodge ${telegraph ? 'is-urgent' : ''} ${iframes ? 'is-rolling' : ''}`} disabled={dodgeCd > 0 || dead} onPointerDown={(e) => { e.preventDefault(); dispatch({ type: 'dodge' }); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({ type: 'dodge' }); } }} aria-label={dodgeCd > 0 ? `Dodge, ${dodgeCd.toFixed(1)} seconds` : 'Dodge'}>
          <span className="act-name">Dodge</span>
          {dodgeCd > 0 && <span className="act-sub t-num">{dodgeCd.toFixed(1)}s</span>}
        </button>
      </div>
    </div>
  );
});
