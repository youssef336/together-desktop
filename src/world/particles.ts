import type { EffectKind } from '../engine/activity';
import type { BitmapId } from '../pixel/effects';

export interface Particle {
  bmp: BitmapId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  ttl: number;
  /** Sway phase; -1 = no sway. */
  wobble: number;
  /** Size multiplier (1 = the usual effect size). */
  size: number;
  /** Sprite px/s² pulling down (feathers). */
  gravity: number;
  /** Stars circling a dizzy head: centre and radius in screen px. */
  orbit?: { cx: number; cy: number; r: number };
  /** Grows from small to full size over its first 0.15 s (POW!). */
  pop?: boolean;
}

interface Emitter {
  kind: EffectKind;
  x: number;
  y: number;
  left: number; // seconds of emission left
  next: number;
}

interface Spec {
  bmp: BitmapId | BitmapId[];
  every: number;
  life: number;
  vy: number;
  spread: number;
  once?: boolean;
  /** Sideways speed range ± (sprite px/s); default 3. */
  vx?: number;
  /** Particles per emission (default 1). */
  count?: number;
  size?: [number, number];
  gravity?: number;
  /** false = no sideways sway. */
  sway?: boolean;
  orbit?: boolean;
  pop?: boolean;
}

const SPEC: Record<EffectKind, Spec> = {
  heart: { bmp: 'heart', every: 0.5, life: 1.6, vy: -18, spread: 6 },
  hearts: { bmp: 'heart', every: 0.32, life: 1.8, vy: -22, spread: 14 },
  steam: { bmp: 'steam', every: 0.6, life: 1.4, vy: -10, spread: 2 },
  zzz: { bmp: 'z', every: 1.1, life: 2.2, vy: -9, spread: 3 },
  note: { bmp: 'note', every: 0.55, life: 1.6, vy: -16, spread: 14 },
  sparkle: { bmp: 'sparkle', every: 0.25, life: 0.8, vy: -4, spread: 14 },
  gift: { bmp: 'gift', every: 99, life: 2.4, vy: 0, spread: 0, once: true },
  sweat: { bmp: 'sweat', every: 99, life: 1, vy: 6, spread: 0, once: true },
  cloud: { bmp: 'cloud', every: 99, life: 3, vy: -1, spread: 0, once: true },
  star: { bmp: 'star', every: 0.2, life: 0.9, vy: -20, spread: 18 },
  // ── Fights ──
  pow: { bmp: 'pow', every: 99, life: 0.45, vy: 0, spread: 0, once: true, vx: 0, size: [1.5, 1.8], sway: false, pop: true },
  anger: { bmp: 'anger', every: 0.7, life: 0.6, vy: -3, spread: 8, vx: 0, size: [1.1, 1.3], sway: false, pop: true },
  dust: { bmp: 'dust', every: 0.07, life: 0.7, vy: -6, spread: 30, vx: 28, size: [1.4, 2.4], count: 2 },
  feathers: { bmp: 'feather', every: 99, life: 2.4, vy: -26, spread: 10, once: true, vx: 22, count: 7, gravity: 22, size: [0.9, 1.2] },
  splat: { bmp: 'splat', every: 99, life: 1.6, vy: 0, spread: 0, once: true, vx: 0, size: [1.2, 1.2], sway: false, pop: true },
  cream: { bmp: 'cream', every: 99, life: 2, vy: 0, spread: 0, once: true, vx: 0, size: [1.3, 1.3], sway: false, pop: true },
  storm: { bmp: 'storm', every: 99, life: 6, vy: 0, spread: 0, once: true, vx: 0, sway: false },
  heartbreak: { bmp: 'heartbreak', every: 99, life: 1.8, vy: -8, spread: 0, once: true, size: [1.2, 1.2] },
  dizzy: { bmp: 'star', every: 99, life: 2.6, vy: 0, spread: 0, once: true, count: 3, orbit: true, size: [0.6, 0.7] },
  rose: { bmp: 'rose', every: 99, life: 3.2, vy: -2, spread: 0, once: true, vx: 0, size: [1.2, 1.2], sway: false },
  // Made up: a fountain of hearts and stars rising from above them.
  love: {
    bmp: ['heart', 'heart', 'goldHeart', 'star', 'star', 'sparkle'],
    every: 0.06, life: 2.6, vy: -34, spread: 46, vx: 14, count: 2, size: [0.8, 1.7],
  },
};

/** Effect emitters and their particles; positions are in screen px, speeds in sprite px/s. */
export class Particles {
  private emitters: Emitter[] = [];
  readonly items: Particle[] = [];

  emit(kind: EffectKind, x: number, y: number, seconds: number): void {
    this.emitters.push({ kind, x, y, left: SPEC[kind].once ? 0.01 : seconds, next: 0 });
  }

  get active(): boolean {
    return this.emitters.length > 0 || this.items.length > 0;
  }

  clear(): void {
    this.emitters = [];
    this.items.length = 0;
  }

  update(dt: number, s: number, rnd: () => number): void {
    for (const e of this.emitters) {
      const spec = SPEC[e.kind];
      e.next -= dt;
      e.left -= dt;
      if (e.next > 0) continue;
      e.next = spec.every;
      const count = spec.count ?? 1;
      for (let i = 0; i < count; i++) this.items.push(this.spawn(e, spec, i, count, s, rnd));
    }
    this.emitters = this.emitters.filter((e) => e.left > 0);
    for (const p of this.items) {
      p.age += dt;
      if (p.orbit) {
        const a = p.wobble + p.age * 5;
        p.x = p.orbit.cx + Math.cos(a) * p.orbit.r;
        p.y = p.orbit.cy + Math.sin(a) * p.orbit.r * 0.35;
        continue;
      }
      p.vy += p.gravity * dt;
      // Falling feathers drift down slowly, like paper.
      if (p.gravity > 0 && p.vy > 0) p.vy = Math.min(p.vy, 9);
      const sway = p.wobble < 0 ? 0 : Math.sin(p.age * 4 + p.wobble) * (p.gravity > 0 ? 10 : 4);
      p.x += (p.vx + sway) * (s / 3) * dt;
      p.y += p.vy * (s / 3) * dt;
      if (p.gravity > 0) p.vx *= 1 - Math.min(1, dt * 1.5);
    }
    for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i]!.age >= this.items[i]!.ttl) this.items.splice(i, 1);
  }

  private spawn(e: Emitter, spec: Spec, i: number, count: number, s: number, rnd: () => number): Particle {
    const bmp = Array.isArray(spec.bmp) ? spec.bmp[Math.floor(rnd() * spec.bmp.length)]! : spec.bmp;
    const [s0, s1] = spec.size ?? [1, 1];
    const many = count > 1 || spec.vx !== undefined;
    return {
      bmp,
      x: e.x + (e.kind === 'steam' ? 0 : (rnd() - 0.5) * spec.spread * s),
      y: e.y,
      vx: e.kind === 'zzz' ? 5 : (rnd() - 0.5) * 2 * (spec.vx ?? 3),
      vy: spec.vy * (many ? 0.7 + rnd() * 0.6 : 1),
      age: 0,
      ttl: spec.life * (count > 1 ? 0.8 + rnd() * 0.4 : 1),
      // Dizzy stars start evenly spaced around the circle.
      wobble: spec.orbit ? (i / count) * Math.PI * 2 : spec.sway === false ? -1 : rnd() * Math.PI * 2,
      size: s0 + rnd() * (s1 - s0),
      gravity: spec.gravity ?? 0,
      orbit: spec.orbit ? { cx: e.x, cy: e.y, r: 9 * s } : undefined,
      pop: spec.pop,
    };
  }
}
