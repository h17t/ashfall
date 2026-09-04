/**
 * The audio bed: a synthesized drone for each region, a convolution reverb whose impulse is built for
 * that region, and the hush before a boss changes phase. Nothing is sampled; everything is opt-in
 * with the sound setting. The cue instruments in audio.ts send into the same reverb.
 */
import { useGame } from './store';
import { useSettings } from './settings';
import { getBoss } from '@/content';

interface RegionVoice {
  /** drone roots in Hz and the oscillator shape */
  roots: number[]; shape: OscillatorType; cutoff: number; level: number;
  /** filtered-noise texture: wind, water, whispers, crackle */
  noise?: { type: BiquadFilterType; freq: number; q: number; level: number; lfo: number };
  /** occasional pings (drips, distant bells) */
  ping?: { freq: number; every: number; level: number; decay: number };
  /** reverb impulse: seconds and how dark */
  reverb: { seconds: number; damp: number; wet: number };
}

const VOICES: Record<string, RegionVoice> = {
  approach: { roots: [55, 82.4, 110], shape: 'sawtooth', cutoff: 240, level: 0.05, noise: { type: 'bandpass', freq: 380, q: 0.7, level: 0.05, lfo: 0.07 }, reverb: { seconds: 1.4, damp: 2200, wet: 0.22 } },
  mire: { roots: [49, 73.4, 98], shape: 'sine', cutoff: 400, level: 0.06, noise: { type: 'lowpass', freq: 500, q: 1.2, level: 0.05, lfo: 0.21 }, ping: { freq: 1240, every: 3.5, level: 0.05, decay: 0.5 }, reverb: { seconds: 2.0, damp: 1400, wet: 0.3 } },
  archive: { roots: [65.4, 98, 196], shape: 'triangle', cutoff: 900, level: 0.035, noise: { type: 'bandpass', freq: 2400, q: 3, level: 0.018, lfo: 0.13 }, reverb: { seconds: 3.4, damp: 3200, wet: 0.4 } },
  sanctum: { roots: [65.4, 82.4, 98, 130.8], shape: 'triangle', cutoff: 700, level: 0.045, ping: { freq: 784, every: 9, level: 0.04, decay: 2.4 }, reverb: { seconds: 5.0, damp: 2600, wet: 0.5 } },
  deep: { roots: [36.7, 55], shape: 'sine', cutoff: 200, level: 0.07, ping: { freq: 2093, every: 2.4, level: 0.035, decay: 0.35 }, reverb: { seconds: 2.8, damp: 900, wet: 0.42 } },
  kiln: { roots: [41.2, 61.7, 82.4], shape: 'sawtooth', cutoff: 180, level: 0.07, noise: { type: 'highpass', freq: 3000, q: 0.8, level: 0.02, lfo: 0.6 }, reverb: { seconds: 1.6, damp: 4200, wet: 0.25 } },
  abyss: { roots: [27.5, 41.2], shape: 'sine', cutoff: 120, level: 0.06, ping: { freq: 110, every: 6, level: 0.06, decay: 3.5 }, reverb: { seconds: 7.0, damp: 700, wet: 0.6 } },
};

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;       // everything sums here
let hush: GainNode | null = null;      // the silence before a phase change
let convolver: ConvolverNode | null = null;
let wet: GainNode | null = null;
let bedGain: GainNode | null = null;
let bedNodes: AudioNode[] = [];
let bedTimer = 0;
let currentZone = '';
let hushed = false;

/** Build (or fetch) the shared graph. Called by audio.ts once its context exists. */
export function attachBed(context: AudioContext, master: GainNode): GainNode {
  if (ctx === context && bus) return bus;
  ctx = context;
  bus = ctx.createGain();
  hush = ctx.createGain();
  convolver = ctx.createConvolver();
  wet = ctx.createGain();
  wet.gain.value = 0.25;
  bus.connect(hush);
  hush.connect(master);
  bus.connect(convolver);
  convolver.connect(wet);
  wet.connect(hush);
  bedGain = ctx.createGain();
  bedGain.gain.value = 0;
  bedGain.connect(bus);
  return bus;
}

function impulse(seconds: number, damp: number): AudioBuffer {
  const c = ctx!;
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    const k = Math.min(0.99, damp / c.sampleRate * 6);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const n = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2) * (i < 400 ? i / 400 : 1);
      lp += (n - lp) * k;
      d[i] = lp;
    }
  }
  return buf;
}

function stopBed(fade = 1.2) {
  if (!ctx || !bedGain) return;
  const now = ctx.currentTime;
  bedGain.gain.cancelScheduledValues(now);
  bedGain.gain.setValueAtTime(bedGain.gain.value, now);
  bedGain.gain.linearRampToValueAtTime(0.0001, now + fade);
  const nodes = bedNodes; bedNodes = [];
  window.clearInterval(bedTimer); bedTimer = 0;
  window.setTimeout(() => nodes.forEach((n) => { try { (n as OscillatorNode).stop?.(); } catch { /* already stopped */ } n.disconnect(); }), fade * 1000 + 50);
}

/** Start the drone and reverb for a region; crossfades from whatever was playing. */
export function setRegion(zone: string) {
  if (!ctx || !bedGain || !convolver || !wet) return;
  const v = VOICES[zone] ?? VOICES.approach;
  if (zone === currentZone && bedNodes.length) return;
  currentZone = zone;
  stopBed(1.0);
  convolver.buffer = impulse(v.reverb.seconds, v.reverb.damp);
  wet.gain.setTargetAtTime(v.reverb.wet, ctx.currentTime, 0.5);
  const now = ctx.currentTime;
  // a fresh gain so the fade-out of the old bed and the fade-in of the new one overlap
  bedGain = ctx.createGain();
  bedGain.gain.setValueAtTime(0.0001, now);
  bedGain.gain.linearRampToValueAtTime(1, now + 2.5);
  bedGain.connect(bus!);
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = v.cutoff; filt.Q.value = 0.8;
  filt.connect(bedGain);
  const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.045;
  const lfoAmt = ctx.createGain(); lfoAmt.gain.value = v.cutoff * 0.45;
  lfo.connect(lfoAmt); lfoAmt.connect(filt.frequency); lfo.start(now);
  bedNodes.push(lfo, lfoAmt, filt);
  v.roots.forEach((f, i) => {
    for (const det of [-4, 3]) {
      const o = ctx!.createOscillator(); o.type = v.shape; o.frequency.value = f; o.detune.value = det + i * 2;
      const g = ctx!.createGain(); g.gain.value = v.level / (v.roots.length * 2) * 4;
      o.connect(g); g.connect(filt); o.start(now);
      bedNodes.push(o, g);
    }
  });
  if (v.noise) {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = v.noise.type; nf.frequency.value = v.noise.freq; nf.Q.value = v.noise.q;
    const ng = ctx.createGain(); ng.gain.value = v.noise.level;
    const nl = ctx.createOscillator(); nl.frequency.value = v.noise.lfo; const nla = ctx.createGain(); nla.gain.value = v.noise.level * 0.8;
    nl.connect(nla); nla.connect(ng.gain); nl.start(now);
    src.connect(nf); nf.connect(ng); ng.connect(bedGain); src.start(now);
    bedNodes.push(src, nf, ng, nl, nla);
  }
  if (v.ping) {
    const p = v.ping;
    const gainRef = bedGain;
    bedTimer = window.setInterval(() => {
      if (!ctx || gainRef !== bedGain) return;
      if (Math.random() > 0.7) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = p.freq * (1 + (Math.random() - 0.5) * 0.06);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p.level, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);
      o.connect(g); g.connect(gainRef); o.start(t); o.stop(t + p.decay + 0.1);
    }, p.every * 1000);
  }
}

/** The hush: everything ducks to a whisper in 0.4s; release brings it back over 1.2s. */
export function setHush(on: boolean) {
  if (!ctx || !hush || on === hushed) return;
  hushed = on;
  const now = ctx.currentTime;
  hush.gain.cancelScheduledValues(now);
  hush.gain.setValueAtTime(hush.gain.value, now);
  hush.gain.linearRampToValueAtTime(on ? 0.04 : 1, now + (on ? 0.4 : 1.2));
}

/** A distant bell for a boss's arrival or the turn of a phase. */
export function toll(kind: 'arrival' | 'phase') {
  if (!ctx || !bus) return;
  const now = ctx.currentTime;
  const set = kind === 'arrival' ? [[98, 0.5, 5], [196, 0.22, 4], [294, 0.1, 3], [392, 0.06, 2]] : [[147, 0.5, 3], [294, 0.2, 2.5], [441, 0.1, 2], [880, 0.05, 1]];
  for (const [f, amp, len] of set) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(amp, now + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, now + len);
    o.connect(g); g.connect(bus); o.start(now); o.stop(now + len + 0.2);
  }
  if (kind === 'phase') {
    // a struck iron rim under the bell
    const len = 0.12; const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 4;
    const g = ctx.createGain(); g.gain.value = 0.35; src.connect(f); f.connect(g); g.connect(bus); src.start(now);
  }
}

/** The Kindling swell: a rising chord under the ritual's fourth act. */
export function swell(seconds = 5) {
  if (!ctx || !bus) return;
  const now = ctx.currentTime;
  for (const f of [65.4, 98, 130.8, 196, 261.6]) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.08, now + seconds); g.gain.exponentialRampToValueAtTime(0.0001, now + seconds + 2.5);
    o.connect(g); g.connect(bus); o.start(now); o.stop(now + seconds + 3);
  }
}

/**
 * Follow the game: swap the bed on region change; hush when a boss is within four percent of its
 * next phase threshold; release with a toll once the phase turns.
 */
export function followGame(): () => void {
  let lastZone = '';
  const unsub = useGame.subscribe((g) => {
    const st = useSettings.getState();
    if (!ctx || !st.sound) return;
    const s = g.state;
    if (s.encounter.zone !== lastZone) { lastZone = s.encounter.zone; setRegion(lastZone); }
    const e = s.encounter.enemy;
    if (e && e.isBoss) {
      const phases = getBoss(e.id).phases;
      const next = phases[e.phase + 1];
      if (next) {
        const frac = e.hp.div(e.hpMax).toNumber();
        setHush(frac > next.at && frac < next.at + 0.04);
        return;
      }
    }
    setHush(false);
  });
  const unsubSettings = useSettings.subscribe((st) => { if (!st.sound) { stopBed(0.6); currentZone = ''; } else if (ctx && !bedNodes.length) setRegion(useGame.getState().state.encounter.zone); });
  return () => { unsub(); unsubSettings(); stopBed(0.3); };
}

/** For the smoke test and the settings panel. */
export function bedActive(): boolean { return bedNodes.length > 0; }

// Exposed for the headless smoke test (scripts/audio-check.mjs), like __ashfall for the store.
(globalThis as any).__ashfallAudio = { bedActive, region: () => currentZone, hushed: () => hushed };
