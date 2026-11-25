import type { Actor } from '../engine/actor';
import type { HudEvent } from '../engine/activity';

const INK = '#3a2a35';
const GOLD = '#f2c94c';
const RED = '#e04848';
const CREAM = '#fffaf3';
const BAR_W = 230;
const BAR_H = 16;

interface Fighter {
  id: string;
  name: string;
  health: number;
  /** The white "damage trail" that catches up with the health bar. */
  trail: number;
  shake: number;
}

interface Banner {
  text: string;
  sub?: string;
  t: number;
  dur: number;
  color: string;
  size: number;
}

/**
 * The fighting-game layer of a fight: two health bars with their names at the top of the screen,
 * "ROUND 1 … FIGHT!" banners, the bars dropping on every hit, K.O.!, and the names in gold when
 * they make up. Drawn on the world canvas; it never takes clicks.
 */
export class FightHud {
  private fighters: [Fighter, Fighter] | null = null;
  private banners: Banner[] = [];
  private alpha = 0;
  private showing = false;

  get active(): boolean {
    return this.showing || this.alpha > 0 || this.banners.length > 0;
  }

  clear(): void {
    this.fighters = null;
    this.banners = [];
    this.alpha = 0;
    this.showing = false;
  }

  on(e: HudEvent, actors: readonly Actor[]): void {
    const name = (a: Actor) => (a.character.nickname || a.character.name).toUpperCase();
    switch (e.kind) {
      case 'start': {
        // The one on the left gets the left bar.
        const [l, r] = [...actors].sort((p, q) => p.x - q.x) as [Actor, Actor];
        this.fighters = [l, r].map((a) => ({ id: a.id, name: name(a), health: 100, trail: 100, shake: 0 })) as [Fighter, Fighter];
        this.showing = true;
        break;
      }
      case 'round':
        this.banner(e.title, 1.1, GOLD, 1);
        this.banner(e.go, 0.9, RED, 1.25, 1.1);
        break;
      case 'hit': {
        const f = this.fighters?.find((x) => x.id === e.who.id);
        if (!f) break;
        // Never below 8: nobody really gets knocked out, it's a couple.
        f.health = Math.max(8, f.health - e.damage);
        f.shake = 0.3;
        break;
      }
      case 'ko':
        this.banner(e.text, 2.2, RED, 1.5, 0, e.sub);
        this.showing = false;
        break;
      case 'love':
        this.fighters = null;
        this.banner(e.text, 5.5, GOLD, 1.15, 0, e.sub);
        break;
    }
  }

  private banner(text: string, dur: number, color: string, size: number, delay = 0, sub?: string): void {
    this.banners.push({ text, sub, t: -delay, dur, color, size });
  }

  update(dt: number): void {
    this.alpha = Math.max(0, Math.min(1, this.alpha + (this.showing ? dt / 0.4 : -dt / 0.6)));
    for (const f of this.fighters ?? []) {
      if (f.trail > f.health) f.trail = Math.max(f.health, f.trail - dt * 40);
      f.shake = Math.max(0, f.shake - dt);
    }
    for (const b of this.banners) b.t += dt;
    // One banner at a time: the next waits for the current one.
    this.banners = this.banners.filter((b) => b.t < b.dur);
    if (!this.showing && this.alpha === 0 && this.banners.length === 0) this.fighters = null;
  }

  /** Draws and returns the boxes it covered (for dirty-rect clearing). */
  draw(ctx: CanvasRenderingContext2D, view: { w: number; h: number }, s: number, time: number): { x: number; y: number; w: number; h: number }[] {
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    const k = Math.max(1, s / 3);
    const top = 64 * k;
    ctx.save();
    if (this.fighters && this.alpha > 0) {
      ctx.globalAlpha = this.alpha;
      const w = BAR_W * k;
      const h = BAR_H * k;
      const gap = 70 * k;
      const cx = view.w / 2;
      this.fighters.forEach((f, i) => {
        const left = i === 0;
        const jx = f.shake > 0 ? Math.round((Math.random() - 0.5) * 6 * k) : 0;
        const x = (left ? cx - gap / 2 - w : cx + gap / 2) + jx;
        // Frame, the white trail, then the health (drains toward the centre, like the arcade).
        ctx.fillStyle = INK;
        ctx.fillRect(x - 3 * k, top - 3 * k, w + 6 * k, h + 6 * k);
        ctx.fillStyle = '#5a4a55';
        ctx.fillRect(x, top, w, h);
        const fill = (v: number, color: string) => {
          const fw = (w * v) / 100;
          ctx.fillStyle = color;
          ctx.fillRect(left ? x + w - fw : x, top, fw, h);
        };
        fill(f.trail, CREAM);
        fill(f.health, f.health > 40 ? GOLD : RED);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x, top, w, Math.max(2, h * 0.25));
        // Name under the bar.
        ctx.font = `${Math.round(15 * k)}px "Pixelify Sans", system-ui, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = left ? 'right' : 'left';
        outlined(ctx, f.name, left ? x + w : x, top + h + 7 * k, CREAM, k);
        boxes.push({ x: x - 8 * k, y: top - 8 * k, w: w + 16 * k, h: h + 34 * k });
      });
      // "VS" heart between the bars.
      ctx.textAlign = 'center';
      ctx.font = `${Math.round(20 * k)}px "Pixelify Sans", system-ui, sans-serif`;
      outlined(ctx, 'VS', cx, top - 4 * k, RED, k);
      boxes.push({ x: cx - 30 * k, y: top - 10 * k, w: 60 * k, h: 40 * k });
    }
    const b = this.banners.find((x) => x.t >= 0);
    if (b) {
      // Pops in big, settles, fades out.
      const u = b.t / b.dur;
      const pop = b.t < 0.15 ? 1.6 - (b.t / 0.15) * 0.6 : 1;
      const a = Math.min(1, (b.dur - b.t) / 0.35, b.t / 0.08);
      const size = Math.round(52 * k * b.size * pop);
      const y = view.h * 0.32 - (b.color === GOLD && b.dur > 3 ? u * 20 * k : 0);
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${size}px "Pixelify Sans", system-ui, sans-serif`;
      const wob = b.color === GOLD && b.dur > 3 ? Math.sin(time * 3) * 2 * k : 0;
      outlined(ctx, b.text, view.w / 2, y + wob, b.color, k * b.size * 1.6);
      const tw = ctx.measureText(b.text).width;
      let bh = size * 1.4;
      if (b.sub) {
        ctx.font = `${Math.round(26 * k)}px "Pixelify Sans", system-ui, sans-serif`;
        outlined(ctx, b.sub, view.w / 2, y + size * 0.9, CREAM, k);
        bh += 30 * k;
      }
      boxes.push({ x: view.w / 2 - tw / 2 - 30 * k, y: y - size, w: tw + 60 * k, h: bh + size * 0.4 });
    }
    ctx.restore();
    return boxes;
  }
}

/** Pixel-style text: a thick dark outline, then the colour. */
function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, k: number): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, 4 * k);
  ctx.strokeStyle = INK;
  ctx.direction = /[؀-ۿ]/.test(text) ? 'rtl' : 'ltr';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
