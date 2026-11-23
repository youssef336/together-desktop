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
  wobble: number;
}

interface Emitter {
  kind: EffectKind;
  x: number;
  y: number;
  left: number; // seconds of emission left
  next: number;
}

const SPEC: Record<EffectKind, { bmp: BitmapId; every: number; life: number; vy: number; spread: number; once?: boolean }> = {
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
      if (e.next <= 0) {
        e.next = spec.every;
        const offsetX = e.kind === 'steam' ? 0 : (rnd() - 0.5) * spec.spread * s;
        this.items.push({
          bmp: spec.bmp,
          x: e.x + offsetX,
          y: e.y,
          vx: e.kind === 'zzz' ? 5 : (rnd() - 0.5) * 6,
          vy: spec.vy,
          age: 0,
          ttl: spec.life,
          wobble: rnd() * Math.PI * 2,
        });
      }
    }
    this.emitters = this.emitters.filter((e) => e.left > 0);
    for (const p of this.items) {
      p.age += dt;
      p.x += (p.vx + Math.sin(p.age * 4 + p.wobble) * 4) * (s / 3) * dt;
      p.y += p.vy * (s / 3) * dt;
    }
    for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i]!.age >= this.items[i]!.ttl) this.items.splice(i, 1);
  }
}
