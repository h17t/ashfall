import { memo, useEffect, useRef } from 'react';
import { Stage, type Snapshot } from './stage';
import { subscribeEvents, useGame } from '@/ui/store';
import { useSettings } from '@/ui/settings';
import { ZONE_ORDER } from '@/content';
import { hasAsset } from '../../assets/manifest';
import type { GameEvent } from '@/engine';

/** One live stage per page: cinematics reach it through here. */
export const stageRef: { current: Stage | null } = { current: null };

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
    let raf = 0;
    const snap: Snapshot = { zone: 'approach', kind: null, id: '', big: false, hpFrac: 1, riposteOpen: false, poison: false, frost: false, bleed: 0, dead: false, dim: 0.3, reduceFx: false };
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
      snap.riposteOpen = (e?.riposte ?? 0) > 0;
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
    raf = requestAnimationFrame(frame);
    const unsub = subscribeEvents((events: GameEvent[]) => {
      const s = useGame.getState().state;
      const hpMax = Math.max(1, s.encounter.enemy?.hpMax.toNumber() ?? 1);
      const shakeOn = useSettings.getState().screenShake;
      for (const ev of events) {
        switch (ev.type) {
          case 'hit': stage.hit({ dmgFrac: Math.min(1, ev.dmg.toNumber() / hpMax), crit: ev.crit, riposte: ev.riposte, source: ev.source }); break;
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
    return () => { cancelAnimationFrame(raf); unsub(); ro.disconnect(); stage.destroy(); if (stageRef.current === stage) stageRef.current = null; };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full block" aria-hidden />;
});
