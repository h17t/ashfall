import { toRgb } from './gl';
import { seeded } from '@/render/seed';

/**
 * CPU particle pool, drawn as GL points. Two blend groups: additive (motes, wisps, sparks, glow)
 * and normal (ash, blood, drips). Positions are stage pixels with y up.
 */
export type Blend = 0 | 1; // 0 normal, 1 additive

const CAP = 2400;
const STRIDE = 8; // x y size r g b a seed

export class Particles {
  readonly cap = CAP;
  n = 0;
  x = new Float32Array(CAP); y = new Float32Array(CAP);
  vx = new Float32Array(CAP); vy = new Float32Array(CAP);
  life = new Float32Array(CAP); max = new Float32Array(CAP);
  size = new Float32Array(CAP); size0 = new Float32Array(CAP);
  r = new Float32Array(CAP); g = new Float32Array(CAP); b = new Float32Array(CAP); a = new Float32Array(CAP);
  drag = new Float32Array(CAP); grav = new Float32Array(CAP); wob = new Float32Array(CAP);
  blend = new Uint8Array(CAP); seed = new Float32Array(CAP);
  shrink = new Float32Array(CAP);
  private rnd = seeded(0xa5f);
  bufAdd = new Float32Array(CAP * STRIDE);
  bufNorm = new Float32Array(CAP * STRIDE);
  nAdd = 0; nNorm = 0;

  rand(a = 0, b = 1) { return a + this.rnd() * (b - a); }

  emit(o: { x: number; y: number; vx?: number; vy?: number; life: number; size: number; color: string | [number, number, number]; alpha?: number; drag?: number; grav?: number; wob?: number; blend?: Blend; shrink?: number }) {
    if (this.n >= CAP) return;
    const i = this.n++;
    const c = typeof o.color === 'string' ? toRgb(o.color) : o.color;
    this.x[i] = o.x; this.y[i] = o.y; this.vx[i] = o.vx ?? 0; this.vy[i] = o.vy ?? 0;
    this.life[i] = o.life; this.max[i] = o.life; this.size[i] = o.size; this.size0[i] = o.size;
    this.r[i] = c[0]; this.g[i] = c[1]; this.b[i] = c[2]; this.a[i] = o.alpha ?? 1;
    this.drag[i] = o.drag ?? 0; this.grav[i] = o.grav ?? 0; this.wob[i] = o.wob ?? 0;
    this.blend[i] = o.blend ?? 1; this.seed[i] = this.rnd(); this.shrink[i] = o.shrink ?? 0.6;
  }

  update(dt: number, t: number, wind: number) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { n--; this.swap(i, n); i--; continue; }
      const k = Math.exp(-this.drag[i] * dt);
      this.vx[i] = this.vx[i] * k + (wind + Math.sin(t * 1.7 + this.seed[i] * 20) * this.wob[i]) * dt;
      this.vy[i] = this.vy[i] * k - this.grav[i] * dt;
      this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt;
      const f = this.life[i] / this.max[i];
      this.size[i] = this.size0[i] * (1 - this.shrink[i] * (1 - f));
    }
    this.n = n;
  }

  private swap(i: number, j: number) {
    const A = [this.x, this.y, this.vx, this.vy, this.life, this.max, this.size, this.size0, this.r, this.g, this.b, this.a, this.drag, this.grav, this.wob, this.seed, this.shrink];
    for (const arr of A) { const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    const t = this.blend[i]; this.blend[i] = this.blend[j]; this.blend[j] = t;
  }

  /** pack into the two upload buffers; alpha fades over the last 30% of life */
  pack() {
    let na = 0, nn = 0;
    for (let i = 0; i < this.n; i++) {
      const f = this.life[i] / this.max[i];
      const fade = f < 0.3 ? f / 0.3 : f > 0.92 ? (1 - f) / 0.08 : 1;
      const buf = this.blend[i] ? this.bufAdd : this.bufNorm;
      const o = (this.blend[i] ? na++ : nn++) * STRIDE;
      buf[o] = this.x[i]; buf[o + 1] = this.y[i]; buf[o + 2] = this.size[i];
      buf[o + 3] = this.r[i]; buf[o + 4] = this.g[i]; buf[o + 5] = this.b[i]; buf[o + 6] = this.a[i] * fade; buf[o + 7] = this.seed[i];
    }
    this.nAdd = na; this.nNorm = nn;
  }

  clear() { this.n = 0; }
}

export const STRIDE_FLOATS = STRIDE;
