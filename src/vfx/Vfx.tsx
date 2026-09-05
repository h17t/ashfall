import { memo, useEffect, useRef, useSyncExternalStore } from 'react';
import { Stage, type Snapshot } from './stage';
import { subscribeEvents, useGame } from '@/ui/store';
import { useSettings } from '@/ui/settings';
import { onTierChange } from './quality';
import { ZONE_ORDER } from '@/content';
import { hasAsset } from '../../assets/manifest';
import type { GameEvent } from '@/engine';

/** One live stage per page: cinematics reach it through here. */
export const stageRef: { current: Stage | null } = { current: null };

/** 'gl' while the WebGL stage can hold its frame budget; 'dom' once it has handed the frame back (never bounces back). */
let glMode: 'gl' | 'dom' = 'gl';
const modeListeners = new Set<() => void>();
export function setGlMode(m: 'gl' | 'dom') {
  if (m === glMode) return;
  glMode = m;
  // the last rung of the ladder: a machine that cannot hold the GL stage also loses the ambient motion (grain step, motes, drift, flame)
  document.documentElement.classList.toggle('perf-lite', m === 'dom');
  modeListeners.forEach((l) => l());
}
const subscribeMode = (l: () => void) => { modeListeners.add(l); return () => { modeListeners.delete(l); }; };
const readMode = () => glMode;
export function useGlMode(): 'gl' | 'dom' {
  return useSyncExternalStore(subscribeMode, readMode, readMode);
}

/**
 * The WebGL stage under the combat HUD. Reads the game state every frame (no React re-renders) and
 * turns engine events into impacts. Everything it does is presentation; the engine never waits.
 */
export const Vfx = memo(function Vfx() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let stage: Stage;
    try { stage = new Stage(canvas); } catch { return; }
    stageRef.current = stage;
    stage.onGiveUp = () => setGlMode('dom');
    let raf = 0;
    const snap: Snapshot = { zone: 'tollroad', kind: null, id: '', big: false, hpFrac: 1, riposteOpen: false, poison: false, frost: false, bleed: 0, dead: false, dim: 0.3, reduceFx: false };
    const frame = (now: number) => {
      const s = useGame.getState().state;
      const e = s.encounter.enemy;
      const zone = ZONE_ORDER.includes(s.encounter.zone) ? s.encounter.zone : ZONE_ORDER[0];
      const kind = e ? (e.isBoss ? 'boss' : 'enemy') : null;
      snap.zone = zone;
      snap.kind = kind && hasAsset(kind, e!.id) ? kind : null;
      snap.id = e?.id ?? '';
      snap.big = !!e?.isBoss;
      snap.hpFrac = s.player.hpMax > 0 ? s.player.hp / s.player.hpMax : 1;
      snap.riposteOpen = (e?.reprisal ?? 0) > 0;
      snap.poison = (e?.statuses.poison.active ?? 0) > 0;
      snap.frost = (e?.statuses.frost.active ?? 0) > 0;
      snap.bleed = e?.statuses.bleed.buildup ?? 0;
      snap.dead = s.deathScreen > 0;
      snap.dim = e?.isBoss ? 0.45 : 0.25;
      snap.reduceFx = useSettings.getState().reduceFx;
      void stage.setZone(zone);
      void stage.setFigure(snap.kind, snap.id);
      stage.update(snap, now);
      raf = requestAnimationFrame(frame);
    };
    // rendering pauses while the page is hidden: the engine keeps ticking at 1Hz, the GPU sleeps
    const onVis = () => { cancelAnimationFrame(raf); raf = 0; if (!document.hidden) raf = requestAnimationFrame(frame); };
    document.addEventListener('visibilitychange', onVis);
    if (!document.hidden) raf = requestAnimationFrame(frame);
    const offTier = onTierChange(() => stage.resize());
    const unsub = subscribeEvents((events: GameEvent[]) => {
      const s = useGame.getState().state;
      const hpMax = Math.max(1, s.encounter.enemy?.hpMax.toNumber() ?? 1);
      const shakeOn = useSettings.getState().screenShake;
      for (const ev of events) {
        switch (ev.type) {
          case 'hit': stage.hit({ dmgFrac: Math.min(1, ev.dmg.toNumber() / hpMax), crit: ev.crit, reprisal: ev.reprisal, source: ev.source }); break;
          case 'enemyAttack': stage.enemyAttack({ dodged: ev.dodged, perfect: ev.perfect, dmgFrac: shakeOn ? ev.dmg / Math.max(1, s.player.hpMax) : 0 }); break;
          case 'kill': stage.kill(ev.isBoss); break;
          case 'statusProc': if (ev.target === 'enemy') stage.status(ev.status); break;
          case 'cast': stage.cast(); break;
          case 'death': stage.death(); break;
        }
      }
    });
    const ro = new ResizeObserver(() => stage.resize());
    ro.observe(canvas);
    // pointer parallax over the combat frame; the parent stage element receives the clicks
    const host = canvas.parentElement ?? canvas;
    const onMove = (ev: PointerEvent) => { const r = host.getBoundingClientRect(); stage.pointerTarget.x = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width - 0.5) * 2)); stage.pointerTarget.y = Math.max(-1, Math.min(1, (0.5 - (ev.clientY - r.top) / r.height) * 2)); };
    const onLeave = () => { stage.pointerTarget.x = 0; stage.pointerTarget.y = 0; };
    host.addEventListener('pointermove', onMove); host.addEventListener('pointerleave', onLeave);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); offTier(); unsub(); ro.disconnect(); host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave); stage.destroy(); if (stageRef.current === stage) stageRef.current = null; };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full block" aria-hidden />;
});
