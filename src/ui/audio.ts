/**
 * Synthesized audio via Web Audio. No samples. Off by default; the player opts in from Settings.
 * Every cue is a tiny procedural instrument: thud, chime, toll, sting, crack.
 */
import { useSettings } from './settings';
import { subscribeEvents } from './store';
import type { GameEvent } from '@/engine';
import { attachBed, followGame, setRegion, toll, swell } from './audio-bed';
import { useGame } from './store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bus: GainNode | null = null;
let lastHit = 0;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = useSettings.getState().volume;
    master.connect(ctx.destination);
    bus = attachBed(ctx, master);
    setRegion(useGame.getState().state.encounter.zone);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function env(node: AudioNode, t0: number, attack: number, decay: number, peak = 1): GainNode {
  const c = ctx!;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  node.connect(g);
  g.connect(bus ?? master!);
  return g;
}

function noise(duration: number): AudioBufferSourceNode {
  const c = ctx!;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

export const sfx = {
  /** dull impact; heavier hits are lower and longer */
  hit(weight = 0.5, crit = false) {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    if (now - lastHit < 0.03) return;
    lastHit = now;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(140 - weight * 60, now);
    o.frequency.exponentialRampToValueAtTime(40, now + 0.12 + weight * 0.1);
    env(o, now, 0.005, 0.12 + weight * 0.12, 0.5 + weight * 0.3);
    o.start(now); o.stop(now + 0.35);
    const n = noise(0.08);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = crit ? 3200 : 1400;
    n.connect(f);
    env(f, now, 0.002, 0.06, crit ? 0.5 : 0.25);
    n.start(now);
  },
  /** the reprisal: a hard, bright chime with a rising fifth */
  reprisal() {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    for (const [f, delay, len] of [[880, 0, 0.5], [1318, 0.05, 0.6], [1760, 0.1, 0.9]] as const) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      env(o, now + delay, 0.005, len, 0.35);
      o.start(now + delay); o.stop(now + delay + len + 0.1);
    }
    const n = noise(0.05); const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000; n.connect(f);
    env(f, now, 0.001, 0.05, 0.4); n.start(now);
  },
  /** the strain: a crack */
  strain() {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    const n = noise(0.15); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2; n.connect(f);
    env(f, now, 0.002, 0.15, 0.6); n.start(now);
    const o = c.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(60, now + 0.2);
    env(o, now, 0.003, 0.2, 0.25); o.start(now); o.stop(now + 0.3);
  },
  /** a dodge: a soft whoosh */
  dodge(perfect: boolean) {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    const n = noise(0.25); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(600, now); f.frequency.exponentialRampToValueAtTime(perfect ? 2400 : 1200, now + 0.2); f.Q.value = 1.5; n.connect(f);
    env(f, now, 0.02, 0.22, perfect ? 0.5 : 0.3); n.start(now);
    if (perfect) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 1568; env(o, now + 0.1, 0.005, 0.3, 0.2); o.start(now + 0.1); o.stop(now + 0.5); }
  },
  /** taking a hit: a low thump */
  hurt() {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, now); o.frequency.exponentialRampToValueAtTime(30, now + 0.25);
    env(o, now, 0.005, 0.25, 0.7); o.start(now); o.stop(now + 0.4);
  },
  /** the boss-death toll: a long bell */
  toll() {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    for (const [f, amp, len] of [[196, 0.5, 3.5], [392, 0.25, 3], [587, 0.12, 2.5], [784, 0.08, 2], [1176, 0.05, 1.5]] as const) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      env(o, now, 0.01, len, amp); o.start(now); o.stop(now + len + 0.2);
    }
  },
  /** UNMADE.: a slow, heavy descending sting */
  died() {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    for (const [f, delay] of [[110, 0], [104, 0.3], [98, 0.6], [55, 0.9]] as const) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 400; o.connect(flt);
      env(flt, now + delay, 0.05, 1.2, 0.35); o.start(now + delay); o.stop(now + delay + 1.5);
    }
  },
  /** level up / unlock: a soft warm swell */
  unlock() {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    for (const [f, delay] of [[523, 0], [659, 0.08], [784, 0.16]] as const) {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      env(o, now + delay, 0.02, 0.6, 0.18); o.start(now + delay); o.stop(now + delay + 0.8);
    }
  },
  /** remains recovered: a warm chord */
  recover() {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    for (const f of [392, 494, 587, 784]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; env(o, now, 0.05, 1.2, 0.15); o.start(now); o.stop(now + 1.4); }
  },
  /** spell cast: a short glassy sweep */
  cast() {
    const c = ensure(); if (!c) return;
    const now = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(600, now); o.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
    env(o, now, 0.01, 0.25, 0.25); o.start(now); o.stop(now + 0.4);
  },
};

/** Wire game events to sounds. Returns an unsubscribe. */
export function startAudio(): () => void {
  const unsubSettings = useSettings.subscribe((s) => { if (master) master.gain.value = s.sound ? s.volume : 0; });
  const handler = (events: GameEvent[]) => {
    const st = useSettings.getState();
    if (!st.sound) return;
    let hitWeight = -1; let hitCrit = false;
    for (const e of events) {
      switch (e.type) {
        case 'hit':
          if (e.source === 'dot') break;
          if (e.reprisal) { sfx.reprisal(); break; }
          hitWeight = Math.max(hitWeight, e.source === 'player' ? 0.6 : 0.3); hitCrit = hitCrit || e.crit; break;
        case 'strain': sfx.strain(); break;
        case 'enemyAttack': if (e.dodged) sfx.dodge(e.perfect); else sfx.hurt(); break;
        case 'death': sfx.died(); break;
        case 'bossKilled': sfx.toll(); break;
        case 'bossPhase': if (e.phase === 0) toll('arrival'); else window.setTimeout(() => toll('phase'), 600); break;
        case 'snuffed': swell(5); break;
        case 'levelUp': case 'unlock': sfx.unlock(); break;
        case 'remainsRecovered': sfx.recover(); break;
        case 'cast': sfx.cast(); break;
      }
    }
    if (hitWeight >= 0) sfx.hit(hitWeight, hitCrit);
  };
  const unsub = subscribeEvents(handler);
  const unfollow = followGame();
  // browsers require a gesture before audio; the first click anywhere primes the context
  const prime = () => { if (useSettings.getState().sound) ensure(); };
  window.addEventListener('pointerdown', prime, { passive: true });
  return () => { unsub(); unfollow(); unsubSettings(); window.removeEventListener('pointerdown', prime); };
}
