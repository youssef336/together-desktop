import type { Toss } from '../engine/activity';
import type { Throwable } from '../pixel/effects';
import type { Particles } from './particles';

/** Things that burst on impact; everything else falls and lies on the floor for a while. */
const SQUASHY: Throwable[] = ['tomato', 'pie'];
/** Things that don't tumble end over end in the air. */
const NO_SPIN: Throwable[] = ['tomato', 'pie'];
const REST_S = 4.5;
const MAX_ITEMS = 14;

export interface Flying {
  item: Throwable;
  x: number;
  y: number;
  angle: number;
  /** 0..1 fade (resting things fade out at the end). */
  alpha: number;
}

interface Item extends Flying {
  toss: Toss;
  phase: 'fly' | 'fall' | 'rest';
  t: number;
  vx: number;
  vy: number;
  spin: number;
  bounced: boolean;
}

/**
 * Thrown things in flight (fights): an arc from hand to face, then a splat, a fall to the floor,
 * or — when dodged — on past the target and down. Dropped things lie there a few seconds.
 * Positions are screen px.
 */
export class Projectiles {
  private list: Item[] = [];

  get items(): readonly Flying[] {
    return this.list;
  }

  get active(): boolean {
    return this.list.length > 0;
  }

  clear(): void {
    this.list = [];
  }

  toss(t: Toss): void {
    const dir = t.to.x >= t.from.x ? 1 : -1;
    this.list.push({
      toss: t, item: t.item, x: t.from.x, y: t.from.y, angle: 0, alpha: 1, phase: 'fly', t: 0,
      vx: 0, vy: 0, spin: NO_SPIN.includes(t.item) ? 0 : dir * (9 + Math.random() * 5), bounced: false,
    });
    if (this.list.length > MAX_ITEMS) this.list.splice(0, this.list.length - MAX_ITEMS);
  }

  update(dt: number, s: number, fx: Particles): void {
    const g = 900 * (s / 3);
    for (const it of this.list) {
      it.t += dt;
      const { from, to, seconds, arc } = it.toss;
      if (it.phase === 'fly') {
        const u = Math.min(1, it.t / seconds);
        it.x = from.x + (to.x - from.x) * u;
        it.y = from.y + (to.y - from.y) * u - arc * s * 4 * u * (1 - u);
        it.angle += it.spin * dt;
        if (u < 1) continue;
        const dir = to.x >= from.x ? 1 : -1;
        if (it.toss.land === 'splat' && SQUASHY.includes(it.item)) {
          it.t = 99; // gone (the fight draws the splat on the face)
          continue;
        }
        it.phase = 'fall';
        if (it.toss.land === 'past') {
          // Keeps going: same speed forward, falling from here.
          it.vx = ((to.x - from.x) / seconds) * 0.9;
          it.vy = (to.y - from.y + 4 * arc * s) / seconds; // the arc's own slope where it ends
        } else {
          // Bounces off the target and drops at its feet.
          it.vx = -dir * 70 * (s / 3);
          it.vy = -180 * (s / 3);
          it.spin *= -0.6;
        }
        it.t = 0;
        continue;
      }
      if (it.phase === 'fall') {
        it.vy += g * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.angle += it.spin * dt;
        const floor = it.toss.floor - 2 * s;
        if (it.y >= floor) {
          it.y = floor;
          if (!it.bounced && Math.abs(it.vy) > 120) {
            // One small bounce, then it stays.
            it.bounced = true;
            it.vy *= -0.3;
            it.vx *= 0.5;
            fx.emit('dust', it.x, it.y, 0.05);
          } else {
            it.phase = 'rest';
            it.t = 0;
            // Lie flat: snap to the nearest quarter turn.
            it.angle = Math.round(it.angle / (Math.PI / 2)) * (Math.PI / 2);
          }
        }
        continue;
      }
      it.alpha = Math.max(0, Math.min(1, (REST_S - it.t) / 1));
    }
    this.list = this.list.filter((it) => it.t < 99 && !(it.phase === 'rest' && it.t >= REST_S));
  }
}
