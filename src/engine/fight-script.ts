import { OUCH, pickLine } from '../domain/fight';
import type { Actor } from './actor';
import type { Ctx, Point, Stage, Step } from './activity';

// The little script engine fights are written in (engine/fight.ts): timed beats, knock-backs,
// and where things are on a character (face, head, hand).

/** One beat of a script: wait, do something, then (optionally) wait until something is true. */
export interface Beat {
  /** Seconds before `do`; a function is read when the beat comes up (e.g. a flight time). */
  wait?: number | (() => number);
  do?: () => void;
  until?: () => boolean;
  /** Safety cap for `until`, seconds. */
  max?: number;
}

/** Short knock-backs and shoves, moved by the script itself (walking is the actor's own). */
export class Slides {
  private items: { a: Actor; from: number; to: number; t: number; dur: number }[] = [];
  push(a: Actor, to: number, dur: number): void {
    a.target = null;
    this.items = this.items.filter((s) => s.a !== a);
    this.items.push({ a, from: a.x, to, t: 0, dur });
  }
  update(dt: number): void {
    for (const s of this.items) {
      s.t = Math.min(s.dur, s.t + dt);
      const u = 1 - (1 - s.t / s.dur) ** 3; // fast, then easing out like a stumble
      s.a.x = s.from + (s.to - s.from) * u;
    }
    this.items = this.items.filter((s) => s.t < s.dur);
  }
}

/** A step that plays a list of beats in order. The beats are built when the step starts. */
export function script(name: string, build: (slides: Slides) => Beat[]): Step {
  let beats: Beat[] = [];
  let i = 0;
  let t = 0;
  let waiting = true;
  let slides = new Slides();
  return {
    name,
    enter: () => {
      slides = new Slides();
      beats = build(slides);
      i = 0;
      t = 0;
      waiting = true;
    },
    update: (_ctx, dt) => {
      slides.update(dt);
      t += dt;
      // Several zero-length beats may run in the same frame.
      for (let guard = 0; guard < 20 && i < beats.length; guard++) {
        const b = beats[i]!;
        if (waiting) {
          const w = typeof b.wait === 'function' ? b.wait() : (b.wait ?? 0);
          if (t < w) return false;
          b.do?.();
          waiting = false;
          t = 0;
        }
        if (b.until && !b.until() && t < (b.max ?? 8)) return false;
        i++;
        waiting = true;
        t = 0;
      }
      return i >= beats.length;
    },
  };
}

// ── Geometry ──────────────────────────────────────────────────────────────
export const nameOf = (a: Actor) => a.character.nickname || a.character.name;
export const dirTo = (a: Actor, b: Actor): 1 | -1 => (b.x >= a.x ? 1 : -1);
export const faceOf = (a: Actor, st: Stage): Point => ({ x: a.x, y: a.y - st.px(21) });
export const headTop = (a: Actor, st: Stage): Point => ({ x: a.x, y: a.y - st.px(34) });
export const handOf = (a: Actor, st: Stage): Point => ({ x: a.x + a.facing * st.px(8), y: a.y - st.px(23) });
export const clampX = (st: Stage, x: number) => Math.max(st.bounds.left, Math.min(st.bounds.right, x));

/** Two x positions `gap` apart around `mid`, kept on screen. */
export function apart(st: Stage, mid: number, gap: number): [number, number] {
  const { left, right } = st.bounds;
  const half = Math.min(gap, right - left) / 2;
  const m = Math.max(left + half, Math.min(right - half, mid));
  return [m - half, m + half];
}

/** The hit itself: POW, the ouch face, a stumble back, a little shake. */
export function hit(st: Stage, slides: Slides, from: Actor, to: Actor, power: number, opts: { line?: boolean } = {}): void {
  const f = faceOf(to, st);
  st.effect('pow', f.x - dirTo(from, to) * st.px(4), f.y, 0.4);
  st.effect('anger', headTop(to, st).x + st.px(6), headTop(to, st).y + st.px(4), 1.2);
  to.faceTowards(from);
  to.animator.play('hurt', { force: true, then: 'angry' });
  slides.push(to, clampX(st, to.x + dirTo(from, to) * st.px(4 + power * 3)), 0.25);
  st.shake?.(power, 0.25);
  st.hud?.({ kind: 'hit', who: to, damage: 5 + power * 5 + Math.floor(st.rnd() * 4) });
  // Some big hits land in slow motion, with a white flash.
  if (power >= 2 && st.rnd() < 0.4) {
    st.flash?.();
    st.slowmo?.(0.3, 0.7);
  }
  if (opts.line) st.say(to, pickLine(OUCH, st.rnd));
}

export const angry = (...who: Actor[]) => who.forEach((a) => a.animator.play('angry', { force: true, then: 'angry' }));

/** Wraps a script that needs the context while it builds its beats. */
export function scene(name: string, build: (ctx: Ctx, slides: Slides) => Beat[]): Step {
  let ctx: Ctx | null = null;
  const inner = script(name, (slides) => build(ctx!, slides));
  return {
    name,
    enter: (c) => {
      ctx = c;
      inner.enter?.(c);
    },
    update: (c, dt) => inner.update(c, dt),
  };
}
