import { gsap } from 'gsap';

/**
 * One cinematic at a time. Sequences are gsap timelines built against DOM the Cinema component
 * owns; the queue orders them, `skip` fast-forwards a skippable one, and nothing here touches
 * the engine: the game keeps running underneath, the way a Marrow boss keeps swinging while the
 * name card fades.
 */
export interface Cinematic {
  id: string;
  /** lower plays first when several are waiting */
  priority: number;
  skippable: boolean;
  build: () => gsap.core.Timeline;
}

type Listener = (playing: Cinematic | null) => void;

export class Sequencer {
  private queue: Cinematic[] = [];
  private current: { c: Cinematic; tl: gsap.core.Timeline } | null = null;
  private listeners = new Set<Listener>();

  enqueue(c: Cinematic) {
    // one of each kind waiting at a time; a newer card replaces an older unplayed one of the same id
    this.queue = this.queue.filter((q) => q.id !== c.id);
    this.queue.push(c);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.next();
  }

  get playing(): Cinematic | null { return this.current?.c ?? null; }

  skip() {
    if (this.current && this.current.c.skippable) this.current.tl.progress(1);
  }

  onChange(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }

  private next() {
    if (this.current || this.queue.length === 0) return;
    const c = this.queue.shift()!;
    const tl = c.build();
    this.current = { c, tl };
    tl.eventCallback('onComplete', () => { this.current = null; this.emit(); this.next(); });
    this.emit();
  }

  private emit() { for (const l of this.listeners) l(this.playing); }

  clear() {
    this.queue = [];
    if (this.current) { this.current.tl.kill(); this.current = null; }
    this.emit();
  }
}
