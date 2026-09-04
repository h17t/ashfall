import { memo, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { gsap } from 'gsap';
import { Sequencer } from './sequencer';
import { subscribeEvents, useGame } from '@/ui/store';
import { useSettings } from '@/ui/settings';
import { getBoss, getZone, ZONE_ORDER } from '@/content';
import { fmt, type GameEvent } from '@/engine';
import { stageRef } from '@/vfx/Vfx';
import { Plate } from '@/render/Plate';
import { asset } from '../../../assets/manifest';

/**
 * The cinematic layer: letterbox bars, the boss name card, phase cards, YOU DIED, the bloodstain,
 * the region card, and the Kindling rite. DOM and gsap; the stage (zoom, dim) is driven through
 * stageRef when it exists. Boss intros are unskippable the first time you meet a lord.
 */
const SEEN_KEY = 'ashfall.seenBosses';
function seenBosses(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')); } catch { return new Set(); } }
function markSeen(id: string) { try { const s = seenBosses(); s.add(id); localStorage.setItem(SEEN_KEY, JSON.stringify([...s])); } catch { /* ignore */ } }

export const sequencer = new Sequencer();

interface Card { title: string; sub?: string; text?: string; kind: 'boss' | 'phase' | 'region' | 'died' | 'stain' | 'kindle'; extra?: string; plate?: { kind: 'ui' | 'boss'; id: string } }

export const Cinema = memo(function Cinema() {
  const root = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [playing, setPlaying] = useState(false);
  const cardRef = useRef<Card | null>(null);
  const reduce = () => useSettings.getState().reduceFx;

  useEffect(() => {
    const off = sequencer.onChange((c) => { setPlaying(!!c); document.documentElement.classList.toggle('cine', !!c); });
    const q = (sel: string) => root.current!.querySelector(sel) as HTMLElement;
    const speed = () => (reduce() ? 0.55 : 1);
    const stage = () => stageRef.current;

    // commit the card synchronously so the timeline built right after finds its targets in the DOM
    const show = (c: Card | null) => { cardRef.current = c; flushSync(() => setCard(c)); };
    /** put the card inside the combat frame, lower left, where the figure's feet are */
    const placeInArena = () => {
      const arena = document.querySelector('.arena') as HTMLElement | null;
      const card = root.current?.querySelector('.cine-card') as HTMLElement | null;
      if (!arena || !card) return;
      const r = arena.getBoundingClientRect();
      card.style.left = `${Math.round(r.left + 40)}px`;
      card.style.top = `${Math.round(r.top + r.height * 0.42)}px`;
      card.style.bottom = 'auto';
      card.style.maxWidth = `${Math.round(r.width * 0.62)}px`;
    };

    /** letterbox in/out around a timeline */
    const letterbox = (tl: gsap.core.Timeline, on: boolean, at: number | string) => {
      tl.to('.cine-bar-top', { height: on ? '11%' : 0, duration: 0.55 * speed(), ease: on ? 'power3.out' : 'power2.in' }, at);
      tl.to('.cine-bar-bottom', { height: on ? '11%' : 0, duration: 0.55 * speed(), ease: on ? 'power3.out' : 'power2.in' }, '<');
    };

    const bossIntro = (id: string) => {
      const boss = getBoss(id);
      const first = !seenBosses().has(id);
      sequencer.enqueue({
        id: 'boss:' + id, priority: 1, skippable: !first,
        build: () => {
          markSeen(id);
          show({ kind: 'boss', title: boss.name, sub: boss.title, text: boss.lore });
          placeInArena();
          const tl = gsap.timeline();
          const st = stage();
          tl.call(() => { if (st && !reduce()) { st.zoom = 1.12; st.zoomTarget = 1.12; } if (st) st.extraDim = 0.35; });
          letterbox(tl, true, 0);
          tl.fromTo('.cine-card', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.2);
          tl.fromTo('.cine-title', { opacity: 0, letterSpacing: '0.6em', y: 8 }, { opacity: 1, letterSpacing: '0.16em', y: 0, duration: 1.4 * speed(), ease: 'power3.out' }, 0.35);
          tl.fromTo('.cine-rule', { scaleX: 0 }, { scaleX: 1, duration: 0.9 * speed(), ease: 'power2.inOut' }, 0.9);
          tl.fromTo('.cine-sub', { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.8 * speed() }, 1.2);
          tl.fromTo('.cine-text', { opacity: 0 }, { opacity: 0.85, duration: 0.9 * speed() }, 1.8);
          tl.call(() => { if (st) st.zoomTarget = 1; }, undefined, 0.6);
          tl.to({}, { duration: (first ? 2.4 : 1.4) * speed() });
          tl.to('.cine-card', { opacity: 0, duration: 0.6 * speed(), ease: 'power2.in' });
          letterbox(tl, false, '<');
          tl.call(() => { if (st) st.extraDim = 0; show(null); });
          return tl;
        },
      });
    };

    const phase = (name: string, text: string) => sequencer.enqueue({
      id: 'phase', priority: 2, skippable: true,
      build: () => {
        show({ kind: 'phase', title: name, text });
        placeInArena();
        const tl = gsap.timeline();
        const st = stage();
        tl.call(() => { if (st) { st.extraDim = 0.3; if (!reduce()) { st.zoom = 1.08; st.zoomTarget = 1; } } });
        tl.fromTo('.cine-card', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
        tl.fromTo('.cine-title', { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.45 * speed(), ease: 'power4.out' }, 0.05);
        tl.fromTo('.cine-rule', { scaleX: 0 }, { scaleX: 1, duration: 0.5 * speed() }, 0.25);
        tl.fromTo('.cine-text', { opacity: 0, y: 6 }, { opacity: 0.9, y: 0, duration: 0.5 * speed() }, 0.45);
        tl.to({}, { duration: 1.6 * speed() });
        tl.to('.cine-card', { opacity: 0, duration: 0.5 * speed() });
        tl.call(() => { if (st) st.extraDim = 0; show(null); });
        return tl;
      },
    });

    const died = (lost: string) => sequencer.enqueue({
      id: 'died', priority: 0, skippable: false,
      build: () => {
        show({ kind: 'died', title: 'You Died', text: lost });
        const tl = gsap.timeline();
        tl.fromTo('.cine-shroud', { opacity: 0 }, { opacity: 0.88, duration: 0.5 * speed(), ease: 'power2.out' }, 0);
        tl.fromTo('.cine-card', { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0);
        tl.fromTo('.cine-title', { opacity: 0, letterSpacing: '0.25em', scale: 0.96 }, { opacity: 1, letterSpacing: '0.5em', scale: 1, duration: 1.6 * speed(), ease: 'power2.out' }, 0.25);
        tl.fromTo('.cine-text', { opacity: 0 }, { opacity: 0.8, duration: 0.8 * speed() }, 1.2);
        tl.to({}, { duration: 1.0 * speed() });
        tl.to(['.cine-card', '.cine-shroud'], { opacity: 0, duration: 0.7 * speed(), ease: 'power2.in' });
        tl.call(() => show(null));
        return tl;
      },
    });

    const stain = (souls: string) => sequencer.enqueue({
      id: 'stain', priority: 3, skippable: true,
      build: () => {
        show({ kind: 'stain', title: 'Bloodstain recovered', text: `${souls} souls return to you.`, plate: { kind: 'ui', id: 'bloodstain' } });
        const tl = gsap.timeline();
        tl.fromTo('.cine-stain', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 * speed(), ease: 'power3.out' }, 0);
        tl.fromTo('.cine-stain-plate', { scale: 0.6, filter: 'brightness(0.6)' }, { scale: 1, filter: 'brightness(1.6)', duration: 0.6 * speed(), ease: 'back.out(2)' }, 0.1);
        tl.to('.cine-stain-plate', { filter: 'brightness(1)', duration: 0.6 * speed() });
        tl.to({}, { duration: 1.2 * speed() });
        tl.to('.cine-stain', { opacity: 0, y: -10, duration: 0.5 * speed() });
        tl.call(() => show(null));
        return tl;
      },
    });

    const region = (zone: string) => {
      const z = getZone(zone);
      sequencer.enqueue({
        id: 'region', priority: 1, skippable: true,
        build: () => {
          show({ kind: 'region', title: z.name, sub: `Region ${z.region}`, text: z.lore });
          const tl = gsap.timeline();
          tl.fromTo('.cine-wipe', { scaleX: 0, transformOrigin: 'left' }, { scaleX: 1, duration: 0.6 * speed(), ease: 'power3.inOut' }, 0);
          tl.fromTo('.cine-card', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.5);
          tl.fromTo('.cine-sub', { opacity: 0 }, { opacity: 1, duration: 0.5 * speed() }, 0.6);
          tl.fromTo('.cine-title', { opacity: 0, letterSpacing: '0.5em' }, { opacity: 1, letterSpacing: '0.16em', duration: 1.2 * speed(), ease: 'power3.out' }, 0.7);
          tl.fromTo('.cine-rule', { scaleX: 0 }, { scaleX: 1, duration: 0.8 * speed() }, 1.0);
          tl.fromTo('.cine-text', { opacity: 0 }, { opacity: 0.85, duration: 0.8 * speed() }, 1.4);
          tl.to({}, { duration: 1.8 * speed() });
          tl.to('.cine-card', { opacity: 0, duration: 0.5 * speed() });
          tl.set('.cine-wipe', { transformOrigin: 'right' });
          tl.to('.cine-wipe', { scaleX: 0, duration: 0.6 * speed(), ease: 'power3.inOut' }, '<');
          tl.call(() => show(null));
          return tl;
        },
      });
    };

    const kindle = (humanity: string) => sequencer.enqueue({
      id: 'kindle', priority: 0, skippable: false,
      build: () => {
        show({ kind: 'kindle', title: 'The flame is kindled', text: `${humanity} Humanity gathered.`, plate: { kind: 'ui', id: 'bonfire' } });
        const tl = gsap.timeline();
        const s = speed();
        tl.set('.cine-shroud', { background: 'var(--void)' }, 0);
        tl.fromTo('.cine-shroud', { opacity: 0 }, { opacity: 1, duration: 1.2 * s, ease: 'power2.inOut' }, 0);
        tl.fromTo('.cine-kindle', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.8);
        tl.fromTo('.cine-kindle-plate', { scale: 0.7, filter: 'brightness(0.3) saturate(0.4)' }, { scale: 1, filter: 'brightness(0.55) saturate(0.7)', duration: 2.2 * s, ease: 'power2.out' }, 1.0);
        const lines = ['.cine-kl-1', '.cine-kl-2', '.cine-kl-3', '.cine-kl-4'];
        lines.forEach((l, i) => tl.fromTo(l, { opacity: 0, y: 6 }, { opacity: 0.9, y: 0, duration: 0.9 * s }, 1.6 + i * 2.1 * s));
        tl.to('.cine-kindle-plate', { filter: 'brightness(1.4) saturate(1.1)', scale: 1.12, duration: 2.4 * s, ease: 'power2.in' }, 6.0 * s);
        tl.fromTo('.cine-flash', { opacity: 0 }, { opacity: 0.9, duration: 0.35 * s, ease: 'power3.in' }, 8.6 * s);
        tl.to('.cine-flash', { opacity: 0, duration: 1.6 * s, ease: 'power2.out' });
        tl.to(['.cine-kindle', '.cine-shroud'], { opacity: 0, duration: 1.2 * s }, '<0.3');
        tl.set('.cine-shroud', { clearProps: 'background' });
        tl.call(() => show(null));
        return tl;
      },
    });

    // events → cinematics; zone changes are read off the store since a quiet travel emits no event
    let lastZone = useGame.getState().state.encounter.zone;
    const unsubZone = useGame.subscribe((g) => { const z = g.state.encounter.zone; if (z !== lastZone) { lastZone = z; if (ZONE_ORDER.includes(z)) region(z); } });
    const unsub = subscribeEvents((events: GameEvent[]) => {
      const s = useGame.getState().state;
      for (const e of events) {
        if (e.type === 'bossPhase') {
          const enemy = s.encounter.enemy;
          if (!enemy?.isBoss) continue;
          if (e.phase === 0) bossIntro(enemy.id);
          else phase(e.name, getBoss(enemy.id).phases[e.phase].text);
        }
        if (e.type === 'death') died(e.soulsLost.gt(0) ? `${fmt(e.soulsLost)} souls stain the ground where you fell.` : 'Nothing was lost but time.');
        if (e.type === 'bloodstainRecovered') stain(fmt(e.souls));
        if (e.type === 'kindled') kindle(fmt(e.humanity));
      }
    });
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') sequencer.skip(); };
    window.addEventListener('keydown', onKey);
    return () => { off(); unsub(); unsubZone(); window.removeEventListener('keydown', onKey); sequencer.clear(); };
  }, []);

  const c = card;
  return (
    <div ref={root} className={`fixed inset-0 z-[55] ${playing ? '' : 'pointer-events-none'}`} onClick={() => sequencer.skip()} aria-live="polite" role={playing ? 'dialog' : undefined}>
      <div className="cine-bar-top absolute inset-x-0 top-0 h-0" style={{ background: 'var(--void)' }} />
      <div className="cine-bar-bottom absolute inset-x-0 bottom-0 h-0" style={{ background: 'var(--void)' }} />
      <div className="cine-shroud absolute inset-0 opacity-0" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 55%, color-mix(in srgb, var(--ink) 92%, transparent), var(--void))' }} />
      <div className="cine-wipe absolute inset-0" style={{ background: 'var(--void)', transform: 'scaleX(0)', transformOrigin: 'left' }} />
      <div className="cine-flash absolute inset-0 opacity-0 pointer-events-none" style={{ background: 'var(--parchment)' }} />

      {c && (c.kind === 'boss' || c.kind === 'phase' || c.kind === 'region' || c.kind === 'died') && (
        <div className={`cine-card absolute opacity-0 ${c.kind === 'died' ? 'inset-0 flex flex-col items-center justify-center text-center' : c.kind === 'region' ? 'left-[10%] top-[34%] max-w-[560px]' : 'left-[8%] bottom-[16%] max-w-[640px]'}`}>
          {c.sub && c.kind === 'region' && <div className="cine-sub t-label" style={{ color: 'var(--bone)' }}>{c.sub}</div>}
          <div className={`cine-title t-display leading-none ${c.kind === 'died' ? 'text-[92px] md:text-[128px]' : c.kind === 'phase' ? 'text-[46px]' : 'text-[64px]'}`} style={{ color: c.kind === 'died' ? 'var(--blood-bright)' : 'var(--parchment)', textShadow: c.kind === 'died' ? '0 0 60px color-mix(in srgb, var(--blood-bright) 55%, transparent)' : '0 2px 0 var(--void), 0 0 30px var(--void)', transformOrigin: 'left center' }}>{c.title}</div>
          {c.kind !== 'died' && <div className="cine-rule mt-3 h-[2px] w-[320px]" style={{ background: 'linear-gradient(90deg, var(--ember), var(--ember-hot) 40%, transparent)', transformOrigin: 'left' }} />}
          {c.sub && c.kind !== 'region' && <div className="cine-sub t-display text-[22px] mt-3" style={{ color: 'var(--bone)', letterSpacing: '0.24em' }}>{c.sub}</div>}
          {c.text && <div className={`cine-text t-lore mt-3 ${c.kind === 'died' ? 'text-[20px]' : 'text-[17px]'} leading-snug max-w-[520px]`} style={{ color: 'var(--parchment)', textShadow: '0 1px 2px var(--void)' }}>{c.text}</div>}
        </div>
      )}

      {c && c.kind === 'stain' && (
        <div className="cine-stain absolute left-1/2 bottom-[14%] -translate-x-1/2 flex items-center gap-4 px-6 py-3 opacity-0" style={{ background: 'color-mix(in srgb, var(--void) 80%, transparent)', border: '1px solid color-mix(in srgb, var(--blood-bright) 50%, transparent)' }}>
          <div className="cine-stain-plate w-[96px] h-[48px]"><Plate kind="ui" id="bloodstain" className="w-full h-full object-contain" /></div>
          <div>
            <div className="t-display text-[22px]" style={{ color: 'var(--parchment)' }}>{c.title}</div>
            <div className="t-lore text-[15px]">{c.text}</div>
          </div>
        </div>
      )}

      {c && c.kind === 'kindle' && (
        <div className="cine-kindle absolute inset-0 flex flex-col items-center justify-center text-center opacity-0">
          <div className="cine-kindle-plate w-[360px] h-[270px]" style={{ filter: 'brightness(0.3)' }}><img src={asset('ui', 'bonfire').files.x2} alt="" className="w-full h-full object-contain" draggable={false} /></div>
          <div className="cine-kl-1 t-display text-[40px] mt-2 opacity-0" style={{ color: 'var(--parchment)' }}>{c.title}</div>
          <div className="cine-kl-2 t-lore text-[19px] mt-3 opacity-0" style={{ color: 'var(--bone)' }}>The flame takes what you carried: the souls, the road, the blade's edge.</div>
          <div className="cine-kl-3 t-display text-[26px] mt-3 opacity-0" style={{ color: 'var(--ember-hot)' }}>{c.text}</div>
          <div className="cine-kl-4 t-lore text-[19px] mt-3 opacity-0" style={{ color: 'var(--bone)' }}>What you know, you keep. The road begins again, lit a little brighter.</div>
        </div>
      )}
    </div>
  );
});
