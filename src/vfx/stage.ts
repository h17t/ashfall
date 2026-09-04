import { compile, createFbo, createGL, destroyFbo, loadTexture, quad, toRgb, uniforms, type Fbo, type Uniforms } from './gl';
import { QUAD_VS, LAYER_FS, FIGURE_FS, PARTICLE_VS, PARTICLE_FS, BRIGHT_FS, BLUR_FS, COMPOSITE_FS } from './shaders';
import { Particles, STRIDE_FLOATS } from './particles';
import { asset, type AssetKind } from '../../assets/manifest';

/**
 * The arena stage: region layers, the illustrated figure, particles, and a post chain
 * (bloom, chromatic aberration, shockwave, heat shimmer, blood vignette, iris, flash) in one
 * WebGL2 canvas under the DOM HUD. All timing here is presentation: the engine never waits on it.
 */
const PAL = {
  void: '#0A0908', ink: '#14100E', stone: '#241E1A', ash: '#4A423C', bone: '#C8BBA6', parchment: '#E8DCC4',
  ember: '#C8560F', emberHot: '#F0902E', blood: '#6E1212', bloodBright: '#A81C1C', verdigris: '#3D5A4C', soul: '#5C7A99', gold: '#B8912F',
};

interface Ambient { embers: number; ash: number; wisps: number; heat: number; motes: string }
const AMBIENT: Record<string, Ambient> = {
  approach: { embers: 6, ash: 10, wisps: 0, heat: 0.25, motes: PAL.emberHot },
  mire: { embers: 0, ash: 4, wisps: 3, heat: 0, motes: PAL.verdigris },
  archive: { embers: 0, ash: 6, wisps: 1, heat: 0, motes: PAL.soul },
  sanctum: { embers: 3, ash: 3, wisps: 0, heat: 0.1, motes: PAL.gold },
  deep: { embers: 0, ash: 2, wisps: 5, heat: 0, motes: PAL.soul },
  kiln: { embers: 18, ash: 8, wisps: 0, heat: 0.7, motes: PAL.emberHot },
  abyss: { embers: 0, ash: 1, wisps: 8, heat: 0, motes: PAL.soul },
};

export interface Snapshot {
  zone: string;
  kind: AssetKind | null;
  id: string;
  big: boolean;
  hpFrac: number;        // player hp fraction
  riposteOpen: boolean;
  poison: boolean;
  frost: boolean;
  bleed: number;         // 0..100
  dead: boolean;
  dim: number;
  reduceFx: boolean;
}

interface Decay { t: number; dur: number }
const decay = (d: Decay, dt: number) => { d.t = Math.max(0, d.t - dt / d.dur); };

export class Stage {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private vao: WebGLVertexArrayObject;
  private pLayer: WebGLProgram; private uLayer: Uniforms;
  private pFigure: WebGLProgram; private uFigure: Uniforms;
  private pPart: WebGLProgram; private uPart: Uniforms;
  private pBright: WebGLProgram; private uBright: Uniforms;
  private pBlur: WebGLProgram; private uBlur: Uniforms;
  private pComp: WebGLProgram; private uComp: Uniforms;
  private partVao: WebGLVertexArrayObject; private partBuf: WebGLBuffer;
  private scene: Fbo | null = null; private bloomA: Fbo | null = null; private bloomB: Fbo | null = null;
  private layers: (WebGLTexture | null)[] = [null, null, null, null];
  private layerZone = '';
  private figure: { tex: WebGLTexture; mask: WebGLTexture; w: number; h: number; key: string } | null = null;
  private figureKey = '';
  private w = 1; private h = 1; private dpr = 1;
  private quality = 2; // 2 full, 1 degraded (dpr 1, no bloom)
  private frameTimes: number[] = [];
  readonly parts = new Particles();
  private time = 0;
  private last = 0;
  private snap: Snapshot = { zone: 'approach', kind: null, id: '', big: false, hpFrac: 1, riposteOpen: false, poison: false, frost: false, bleed: 0, dead: false, dim: 0.3, reduceFx: false };
  private emitAcc = { embers: 0, ash: 0, wisps: 0 };

  // ---- effect state (all decaying toward rest)
  shake = { x: 0, y: 0, amp: 0, t: 0, dur: 0.25 };
  shock = { x: 0.5, y: 0.5, t: 0, dur: 0.55, amp: 0 };
  ca: Decay = { t: 0, dur: 0.35 };
  flash = { color: toRgb(PAL.parchment), t: 0, dur: 0.22 };
  figFlash = { color: toRgb(PAL.bloodBright), t: 0, dur: 0.11 };
  punch: Decay = { t: 0, dur: 0.18 };
  freezeUntil = 0;
  /** the first riposte hit in a window gets the full landing; later hits in the same window only sparks */
  private riposteLanded = false;
  desat = 0;      // current, eased
  rim = 0;        // current, eased
  iris = 0;       // current, eased
  desatTarget = 0; rimTarget = 0; irisTarget = 0;
  timeScale = 1;
  zoom = 1; zoomTarget = 1;
  parallax = { x: 0, y: 0 };  // -1..1, set by the cinematics/pointer
  drift = 0;
  /** external hooks for cinematics: extra dim and an override of the iris centre */
  extraDim = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = createGL(canvas);
    if (!gl) throw new Error('webgl2 unavailable');
    this.gl = gl; this.canvas = canvas;
    this.vao = quad(gl);
    this.pLayer = compile(gl, QUAD_VS, LAYER_FS); this.uLayer = uniforms(gl, this.pLayer, ['u_rect', 'u_uvA', 'u_uvB', 'u_tex', 'u_fogColor', 'u_fog', 'u_alpha']);
    this.pFigure = compile(gl, QUAD_VS, FIGURE_FS); this.uFigure = uniforms(gl, this.pFigure, ['u_rect', 'u_uvA', 'u_uvB', 'u_tex', 'u_mask', 'u_tint', 'u_tintAmt', 'u_flash', 'u_flashAmt', 'u_rimColor', 'u_rim', 'u_texel', 'u_desat', 'u_alpha']);
    this.pPart = compile(gl, PARTICLE_VS, PARTICLE_FS); this.uPart = uniforms(gl, this.pPart, ['u_res', 'u_dpr', 'u_time']);
    this.pBright = compile(gl, QUAD_VS, BRIGHT_FS); this.uBright = uniforms(gl, this.pBright, ['u_rect', 'u_uvA', 'u_uvB', 'u_tex', 'u_threshold']);
    this.pBlur = compile(gl, QUAD_VS, BLUR_FS); this.uBlur = uniforms(gl, this.pBlur, ['u_rect', 'u_uvA', 'u_uvB', 'u_tex', 'u_dir']);
    this.pComp = compile(gl, QUAD_VS, COMPOSITE_FS); this.uComp = uniforms(gl, this.pComp, ['u_rect', 'u_uvA', 'u_uvB', 'u_scene', 'u_bloom', 'u_time', 'u_aspect', 'u_shock', 'u_ca', 'u_caDir', 'u_heat', 'u_desat', 'u_vign', 'u_iris', 'u_flash', 'u_flashAmt', 'u_bloomAmt', 'u_shake', 'u_zoom', 'u_dim']);
    // particle geometry
    this.partVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.partVao);
    this.partBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.parts.cap * STRIDE_FLOATS * 4, gl.DYNAMIC_DRAW);
    const S = STRIDE_FLOATS * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, S, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, S, 12);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, S, 28);
    gl.bindVertexArray(null);
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const dpr = Math.min(this.quality === 2 ? 2 : 1, window.devicePixelRatio || 1);
    if (w === this.w && h === this.h && dpr === this.dpr && this.scene) return;
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    const gl = this.gl;
    if (this.scene) destroyFbo(gl, this.scene);
    if (this.bloomA) destroyFbo(gl, this.bloomA);
    if (this.bloomB) destroyFbo(gl, this.bloomB);
    this.scene = createFbo(gl, this.canvas.width, this.canvas.height);
    const bw = Math.max(1, Math.round(this.canvas.width / 4)), bh = Math.max(1, Math.round(this.canvas.height / 4));
    this.bloomA = createFbo(gl, bw, bh); this.bloomB = createFbo(gl, bw, bh);
  }

  async setZone(zone: string) {
    if (zone === this.layerZone) return;
    this.layerZone = zone;
    const e = asset('region', zone);
    const urls = (e.layers ?? []).map((u) => u.replace('@2x', ''));
    const texes = await Promise.all(urls.map((u) => loadTexture(this.gl, u)));
    if (this.layerZone !== zone) { texes.forEach((t) => this.gl.deleteTexture(t)); return; }
    this.layers.forEach((t) => t && this.gl.deleteTexture(t));
    this.layers = texes;
    this.parts.clear();
  }

  async setFigure(kind: AssetKind | null, id: string) {
    const key = kind ? `${kind}:${id}` : '';
    if (key === this.figureKey) return;
    this.figureKey = key;
    if (!kind) { this.figure = null; return; }
    const e = asset(kind, id);
    const [tex, mask] = await Promise.all([loadTexture(this.gl, e.files.x2), loadTexture(this.gl, e.files.mask ?? e.files.x1)]);
    if (this.figureKey !== key) { this.gl.deleteTexture(tex); this.gl.deleteTexture(mask); return; }
    if (this.figure) { this.gl.deleteTexture(this.figure.tex); this.gl.deleteTexture(this.figure.mask); }
    this.figure = { tex, mask, w: e.w, h: e.h, key };
  }

  /** where the figure stands, in stage px (y up) */
  figureRect() {
    const big = this.snap.big;
    const fh = this.h * (big ? 0.8 : 0.74);
    const fw = this.figure ? fh * (this.figure.w / this.figure.h) : fh * 0.8;
    const cx = this.w * 0.5, bottom = this.h * 0.1;
    return { x: cx - fw / 2, y: bottom, w: fw, h: fh, cx, cy: bottom + fh * 0.5 };
  }

  // ---- impacts (called from the event bridge)
  hit(opts: { dmgFrac: number; crit: boolean; riposte: boolean; source: string }) {
    const f = this.figureRect();
    const px = f.cx + this.parts.rand(-f.w * 0.15, f.w * 0.15), py = f.cy + this.parts.rand(-f.h * 0.15, f.h * 0.2);
    const n = Math.round(6 + Math.min(30, opts.dmgFrac * 60)) * (opts.crit ? 1.6 : 1) * (opts.riposte ? 2.2 : 1);
    if (!this.snap.reduceFx) {
      for (let i = 0; i < n; i++) {
        const a = this.parts.rand(-0.9, 0.9) + (opts.riposte ? 0.6 : 0.3), sp = this.parts.rand(120, 420) * (opts.riposte ? 1.5 : 1);
        this.parts.emit({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + 80, life: this.parts.rand(0.4, 0.9), size: this.parts.rand(2, 5), color: i % 4 === 0 ? PAL.bloodBright : PAL.blood, grav: 900, drag: 1.2, blend: 0, shrink: 0.4 });
      }
      const sparks = opts.riposte ? 40 : opts.crit ? 10 : 3;
      for (let i = 0; i < sparks; i++) {
        const a = this.parts.rand(0, Math.PI * 2), sp = this.parts.rand(200, 700);
        this.parts.emit({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: this.parts.rand(0.25, 0.6), size: this.parts.rand(1.5, 3.5), color: PAL.emberHot, grav: 500, drag: 2.5, blend: 1, shrink: 0.8 });
      }
    }
    this.figFlash.t = 1; this.figFlash.color = toRgb(opts.riposte ? PAL.emberHot : PAL.bloodBright);
    this.punch.t = 1;
    if (opts.riposte && !this.riposteLanded) { this.riposteLanded = true; this.landRiposte(px, py); }
    else if (opts.riposte) { this.kick(3, -0.5, 0.5); this.freeze(0.03); }
    else if (opts.crit) { this.kick(4, 0.7, 0.4); this.shockAt(px, py, 0.5); this.freeze(0.045); }
    else if (opts.source === 'player') this.kick(1.5, 0.6, 0.3);
  }

  private landRiposte(px: number, py: number) {
    this.freeze(0.08);
    this.flash.t = 1; this.flash.color = toRgb(PAL.emberHot); this.flash.dur = 0.22;
    this.shockAt(px, py, 1);
    this.kick(9, -0.5, 0.5);
    this.ca.t = 1;
    // a blood arc: a fan of heavy drops thrown up and to the right
    if (!this.snap.reduceFx) for (let i = 0; i < 60; i++) {
      const a = this.parts.rand(0.35, 1.25), sp = this.parts.rand(260, 620);
      this.parts.emit({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: this.parts.rand(0.6, 1.2), size: this.parts.rand(3, 7), color: i % 3 ? PAL.blood : PAL.bloodBright, grav: 1100, drag: 0.8, blend: 0, shrink: 0.3 });
    }
  }

  enemyAttack(opts: { dodged: boolean; perfect: boolean; dmgFrac: number }) {
    if (opts.dodged) {
      if (opts.perfect) { this.flash.t = 0.5; this.flash.color = toRgb(PAL.soul); this.flash.dur = 0.18; this.ca.t = 0.4; }
      return;
    }
    this.kick(6 + Math.min(14, opts.dmgFrac * 40), 0.2, -0.9);
    this.ca.t = 0.8;
    this.flash.t = 0.6; this.flash.color = toRgb(PAL.blood); this.flash.dur = 0.25;
  }

  kill(boss: boolean) {
    const f = this.figureRect();
    if (this.snap.reduceFx) return;
    const n = boss ? 90 : 26;
    for (let i = 0; i < n; i++) {
      this.parts.emit({ x: f.cx + this.parts.rand(-f.w * 0.3, f.w * 0.3), y: f.y + this.parts.rand(0, f.h * 0.9), vx: this.parts.rand(-30, 30), vy: this.parts.rand(40, 140), life: this.parts.rand(1.5, 3.5), size: this.parts.rand(2, boss ? 6 : 4), color: boss ? (i % 3 ? PAL.emberHot : PAL.gold) : PAL.soul, drag: 0.4, wob: 60, blend: 1, shrink: 0.7 });
    }
    if (boss) { this.flash.t = 1; this.flash.color = toRgb(PAL.emberHot); this.flash.dur = 0.5; this.shockAt(f.cx, f.cy, 1.2); this.kick(5, 0, 1); }
  }

  status(status: string) {
    const f = this.figureRect();
    if (this.snap.reduceFx) return;
    const col = status === 'poison' ? PAL.verdigris : status === 'frost' ? PAL.soul : PAL.bloodBright;
    for (let i = 0; i < 24; i++) {
      this.parts.emit({ x: f.cx + this.parts.rand(-f.w * 0.3, f.w * 0.3), y: f.cy + this.parts.rand(-f.h * 0.3, f.h * 0.3), vx: this.parts.rand(-20, 20), vy: status === 'frost' ? this.parts.rand(20, 60) : this.parts.rand(-40, 10), life: this.parts.rand(0.8, 1.6), size: this.parts.rand(2, 4), color: col, grav: status === 'poison' ? 120 : 0, blend: status === 'frost' ? 1 : 0, wob: 20 });
    }
    this.flash.t = 0.4; this.flash.color = toRgb(col); this.flash.dur = 0.25;
  }

  cast() {
    if (this.snap.reduceFx) return;
    for (let i = 0; i < 30; i++) {
      this.parts.emit({ x: this.w * this.parts.rand(0.05, 0.3), y: this.h * this.parts.rand(0.05, 0.4), vx: this.parts.rand(80, 260), vy: this.parts.rand(20, 120), life: this.parts.rand(0.5, 1.1), size: this.parts.rand(1.5, 4), color: PAL.soul, drag: 1.5, blend: 1 });
    }
    this.ca.t = 0.4;
  }

  death() { this.desatTarget = 0.7; this.flash.t = 0.9; this.flash.color = toRgb(PAL.blood); this.flash.dur = 0.6; this.kick(8, 0, -1); }

  private freeze(s: number) { if (!this.snap.reduceFx) this.freezeUntil = this.time + s; }
  private kick(px: number, dx: number, dy: number) {
    if (this.snap.reduceFx) return;
    const l = Math.hypot(dx, dy) || 1;
    this.shake = { x: dx / l, y: dy / l, amp: px, t: 1, dur: 0.22 + px * 0.01 };
  }
  private shockAt(px: number, py: number, amp: number) {
    if (this.snap.reduceFx) return;
    this.shock = { x: px / this.w, y: py / this.h, t: 1, dur: 0.6, amp };
  }

  update(snap: Snapshot, now: number) {
    const gl = this.gl;
    if (!this.scene || !this.bloomA || !this.bloomB) return;
    const rawDt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    this.snap = snap;
    this.resize();
    const frozen = now / 1000 < this.freezeUntil + (this.time - now / 1000); // freeze measured in stage time
    if (!frozen) this.time += rawDt;
    const dt = frozen ? 0 : rawDt * this.timeScale;

    // riposte window: dilate, desaturate, rim-light, iris to the figure
    const open = snap.riposteOpen && !snap.dead;
    if (!open) this.riposteLanded = false;
    this.desatTarget = snap.dead ? 0.7 : open ? 0.55 : 0;
    this.rimTarget = open ? 1 : 0.28;
    this.irisTarget = open ? 0.45 : 0;
    this.timeScale = snap.reduceFx ? 1 : open ? 0.85 : 1;
    const ease = (cur: number, target: number, k: number) => cur + (target - cur) * Math.min(1, k * rawDt);
    this.desat = ease(this.desat, this.desatTarget, 8); this.rim = ease(this.rim, this.rimTarget, 6); this.iris = ease(this.iris, this.irisTarget, 6);
    this.zoom = ease(this.zoom, this.zoomTarget, 4);
    decay(this.shake, rawDt); decay(this.shock, rawDt); decay(this.ca, rawDt); decay(this.flash, rawDt); decay(this.figFlash, rawDt); decay(this.punch, rawDt);
    this.drift += rawDt;

    // ambient emitters
    const amb = AMBIENT[snap.zone] ?? AMBIENT.approach;
    if (!snap.reduceFx && dt > 0) {
      this.emitAcc.embers += amb.embers * dt; this.emitAcc.ash += amb.ash * dt; this.emitAcc.wisps += amb.wisps * dt;
      while (this.emitAcc.embers >= 1) { this.emitAcc.embers--; this.parts.emit({ x: this.w * this.parts.rand(0, 0.55), y: -6, vx: this.parts.rand(10, 40), vy: this.parts.rand(30, 90), life: this.parts.rand(3, 7), size: this.parts.rand(1.5, 3.5), color: this.parts.rand() < 0.3 ? PAL.emberHot : PAL.ember, wob: 25, blend: 1, shrink: 0.5 }); }
      while (this.emitAcc.ash >= 1) { this.emitAcc.ash--; this.parts.emit({ x: this.w * this.parts.rand(-0.1, 1.1), y: this.h + 6, vx: this.parts.rand(-15, 5), vy: this.parts.rand(-40, -14), life: this.parts.rand(6, 14), size: this.parts.rand(1.2, 2.8), color: PAL.bone, alpha: 0.55, wob: 18, blend: 0, shrink: 0.2 }); }
      while (this.emitAcc.wisps >= 1) { this.emitAcc.wisps--; this.parts.emit({ x: this.w * this.parts.rand(0, 1), y: this.h * this.parts.rand(0.1, 0.6), vx: this.parts.rand(-10, 10), vy: this.parts.rand(6, 22), life: this.parts.rand(4, 9), size: this.parts.rand(2, 5), color: amb.motes, alpha: 0.7, wob: 30, blend: 1, shrink: 0.9 }); }
      // status drips on the figure
      if (this.figure && (snap.poison || snap.frost)) {
        const f = this.figureRect();
        if (this.parts.rand() < 0.35) this.parts.emit({ x: f.cx + this.parts.rand(-f.w * 0.25, f.w * 0.25), y: f.cy + this.parts.rand(-f.h * 0.3, f.h * 0.2), vx: 0, vy: snap.frost ? this.parts.rand(10, 30) : this.parts.rand(-60, -20), life: this.parts.rand(0.6, 1.4), size: this.parts.rand(1.5, 3), color: snap.frost ? PAL.soul : PAL.verdigris, grav: snap.frost ? 0 : 200, blend: snap.frost ? 1 : 0, wob: 4 });
      }
    }
    if (dt > 0) this.parts.update(dt, this.time, 6);
    this.parts.pack();

    // ---- render scene
    const W = this.canvas.width, H = this.canvas.height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0.039, 0.035, 0.031, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.bindVertexArray(this.vao);

    // layers, bottom-anchored cover fit, parallax by depth
    gl.useProgram(this.pLayer);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const stageAspect = this.w / this.h, texAspect = 16 / 9;
    const fog = toRgb(PAL.void);
    for (let i = 0; i < 4; i++) {
      const tex = this.layers[i];
      if (!tex) continue;
      let ax = 1, ay = 1, bx = 0, by = 0;
      if (stageAspect > texAspect) { ay = texAspect / stageAspect; } else { ax = stageAspect / texAspect; bx = (1 - ax) / 2; }
      const z = 1 + i * 0.035 + (this.zoom - 1) * (0.4 + i * 0.25);
      const px = this.parallax.x * (i * 0.012) + Math.sin(this.drift * 0.08 + i) * 0.004 * i;
      const py = this.parallax.y * (i * 0.006);
      // zoom about bottom-centre: uv' = o + (uv - o)/z
      const ox = 0.5, oy = 0;
      const A = [ax / z, ay / z];
      const B = [bx / z + ox - ox / z - px, by / z + oy - oy / z - py];
      gl.uniform4f(this.uLayer.u_rect, -1, -1, 2, 2);
      gl.uniform2f(this.uLayer.u_uvA, A[0], A[1]);
      gl.uniform2f(this.uLayer.u_uvB, B[0], B[1]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(this.uLayer.u_tex, 0);
      gl.uniform3f(this.uLayer.u_fogColor, fog[0], fog[1], fog[2]);
      gl.uniform1f(this.uLayer.u_fog, i === 0 ? snap.dim * 0.5 : (3 - i) * 0.06 + snap.dim * 0.35);
      gl.uniform1f(this.uLayer.u_alpha, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // figure
    if (this.figure) {
      const f = this.figureRect();
      const punch = 1 + this.punch.t * this.punch.t * 0.035;
      const fw = f.w * punch, fh = f.h * punch;
      const zx = 0.5, zy = 0.12;
      const zw = fw / this.w * 2 * this.zoom, zh = fh / this.h * 2 * this.zoom;
      // zoom grows the figure upward; drop its feet so the head stays in frame
      const x = (zx - 0.5) * 2 - zw / 2, y = (zy - 0.5) * 2 - (this.zoom - 1) * 1.2;
      gl.useProgram(this.pFigure);
      gl.uniform4f(this.uFigure.u_rect, x, y, zw, zh);
      gl.uniform2f(this.uFigure.u_uvA, 1, 1); gl.uniform2f(this.uFigure.u_uvB, 0, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.figure.tex); gl.uniform1i(this.uFigure.u_tex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.figure.mask); gl.uniform1i(this.uFigure.u_mask, 1);
      let tint = toRgb(PAL.emberHot), tintAmt = 0;
      if (open) { tint = toRgb(PAL.ember); tintAmt = 0.12; }
      else if (snap.frost) { tint = toRgb(PAL.soul); tintAmt = 0.5; }
      else if (snap.poison) { tint = toRgb(PAL.verdigris); tintAmt = 0.55; }
      else if (snap.bleed > 40) { tint = toRgb(PAL.blood); tintAmt = Math.min(0.6, snap.bleed / 150) * (0.8 + 0.2 * Math.sin(this.time * 8)); }
      gl.uniform3f(this.uFigure.u_tint, tint[0], tint[1], tint[2]); gl.uniform1f(this.uFigure.u_tintAmt, tintAmt);
      const ff = this.figFlash;
      gl.uniform3f(this.uFigure.u_flash, ff.color[0], ff.color[1], ff.color[2]); gl.uniform1f(this.uFigure.u_flashAmt, ff.t * ff.t * 0.45);
      const rimC = open ? toRgb(PAL.emberHot) : toRgb(PAL.ember);
      gl.uniform3f(this.uFigure.u_rimColor, rimC[0], rimC[1], rimC[2]); gl.uniform1f(this.uFigure.u_rim, this.rim * (open ? 0.9 : 0.5));
      gl.uniform2f(this.uFigure.u_texel, 1 / (this.figure.w * 2), 1 / (this.figure.h * 2));
      gl.uniform1f(this.uFigure.u_desat, open ? 0 : this.desat * 0.5);
      gl.uniform1f(this.uFigure.u_alpha, 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // particles
    if (this.parts.nNorm + this.parts.nAdd > 0) {
      gl.useProgram(this.pPart);
      gl.bindVertexArray(this.partVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.partBuf);
      gl.uniform2f(this.uPart.u_res, this.w, this.h); gl.uniform1f(this.uPart.u_dpr, this.dpr); gl.uniform1f(this.uPart.u_time, this.time);
      if (this.parts.nNorm) {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.parts.bufNorm, 0, this.parts.nNorm * STRIDE_FLOATS);
        gl.drawArrays(gl.POINTS, 0, this.parts.nNorm);
      }
      if (this.parts.nAdd) {
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.parts.bufAdd, 0, this.parts.nAdd * STRIDE_FLOATS);
        gl.drawArrays(gl.POINTS, 0, this.parts.nAdd);
      }
      gl.bindVertexArray(this.vao);
    }
    gl.disable(gl.BLEND);

    // bloom
    const bloomOn = this.quality === 2 && !snap.reduceFx;
    if (bloomOn) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo); gl.viewport(0, 0, this.bloomA.w, this.bloomA.h);
      gl.useProgram(this.pBright);
      gl.uniform4f(this.uBright.u_rect, -1, -1, 2, 2); gl.uniform2f(this.uBright.u_uvA, 1, 1); gl.uniform2f(this.uBright.u_uvB, 0, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.scene.tex); gl.uniform1i(this.uBright.u_tex, 0);
      gl.uniform1f(this.uBright.u_threshold, 0.42);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(this.pBlur);
      gl.uniform4f(this.uBlur.u_rect, -1, -1, 2, 2); gl.uniform2f(this.uBlur.u_uvA, 1, 1); gl.uniform2f(this.uBlur.u_uvB, 0, 0);
      for (let pass = 0; pass < 2; pass++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomB.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex); gl.uniform1i(this.uBlur.u_tex, 0); gl.uniform2f(this.uBlur.u_dir, 1 / this.bloomA.w, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex); gl.uniform2f(this.uBlur.u_dir, 0, 1 / this.bloomA.h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // composite
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.pComp);
    gl.uniform4f(this.uComp.u_rect, -1, -1, 2, 2); gl.uniform2f(this.uComp.u_uvA, 1, 1); gl.uniform2f(this.uComp.u_uvB, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.scene.tex); gl.uniform1i(this.uComp.u_scene, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomOn ? this.bloomA.tex : this.scene.tex); gl.uniform1i(this.uComp.u_bloom, 1);
    gl.uniform1f(this.uComp.u_time, this.time);
    gl.uniform1f(this.uComp.u_aspect, stageAspect);
    const sh = this.shock;
    gl.uniform4f(this.uComp.u_shock, sh.x, sh.y, (1 - sh.t) * 0.9, sh.t * sh.t * sh.amp);
    gl.uniform1f(this.uComp.u_ca, this.ca.t * this.ca.t * 0.005);
    gl.uniform2f(this.uComp.u_caDir, 1, 0.35);
    gl.uniform1f(this.uComp.u_heat, snap.reduceFx ? 0 : amb.heat);
    gl.uniform1f(this.uComp.u_desat, this.desat);
    const low = Math.max(0, 0.45 - snap.hpFrac) / 0.45;
    gl.uniform1f(this.uComp.u_vign, snap.dead ? 0.9 : low * low * 0.9);
    const f = this.figureRect();
    gl.uniform4f(this.uComp.u_iris, f.cx / this.w, (f.cy + f.h * 0.15) / this.h, 0.32, this.iris);
    gl.uniform3f(this.uComp.u_flash, this.flash.color[0], this.flash.color[1], this.flash.color[2]);
    gl.uniform1f(this.uComp.u_flashAmt, this.flash.t * this.flash.t * (snap.reduceFx ? 0.15 : 0.38));
    gl.uniform1f(this.uComp.u_bloomAmt, bloomOn ? 0.55 : 0);
    const s = this.shake, k = s.t * s.t * s.amp / this.w;
    const wob = Math.sin(this.time * 90) * k;
    gl.uniform2f(this.uComp.u_shake, s.x * wob, s.y * wob * (this.w / this.h));
    gl.uniform3f(this.uComp.u_zoom, 0.5, 0.35, 1);
    gl.uniform1f(this.uComp.u_dim, Math.min(1, this.extraDim));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // adaptive quality: if the last 40 frames average above 22ms, drop to 1x and no bloom (never bounces back)
    this.frameTimes.push(rawDt * 1000);
    if (this.frameTimes.length >= 40) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.frameTimes.length = 0;
      if (avg > 22 && this.quality === 2) { this.quality = 1; this.resize(); }
    }
  }

  destroy() {
    const gl = this.gl;
    this.layers.forEach((t) => t && gl.deleteTexture(t));
    if (this.figure) { gl.deleteTexture(this.figure.tex); gl.deleteTexture(this.figure.mask); }
    if (this.scene) destroyFbo(gl, this.scene);
    if (this.bloomA) destroyFbo(gl, this.bloomA);
    if (this.bloomB) destroyFbo(gl, this.bloomB);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
