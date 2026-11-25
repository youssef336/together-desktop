import type { Box } from '../../pixel/draw';
import { L } from '../../domain/speech';
import { type BitmapId, bitmapCanvas } from '../../pixel/effects';
import { Popups } from './popups';
import type { Game, GameDef, GameHost } from './types';

type Kind = 'heart' | 'gold' | 'gray';
const BMP: Record<Kind, BitmapId> = { heart: 'heart', gold: 'goldHeart', gray: 'grayHeart' };
const SECONDS = 40;

interface Floater {
  kind: Kind;
  x: number;
  y: number;
  vy: number;
  phase: number;
}

/** They throw hearts up; click to pop them before they float away. Leave the gray ones alone. */
class HeartPop implements Game {
  readonly id = 'heart-pop' as const;
  readonly capture = true;
  score = 0;
  over = false;
  private t = 0;
  private nextThrow = 0.6;
  private throwers: number = 0;
  private items: Floater[] = [];
  private popups = new Popups();
  private popped = 0;

  constructor(private readonly h: GameHost) {}

  start(): void {
    const { player, partner, world } = this.h;
    for (const a of [player, partner]) {
      if (!a) continue;
      a.target = null;
      a.animator.play('idle', { force: true });
    }
    world.say(player, L('Pop my hearts! 💗', 'فرقع قلوبي! 💗'));
  }

  update(dt: number): void {
    const { player, partner, world, hud } = this.h;
    const s = world.scale;
    this.t += dt;
    this.nextThrow -= dt;
    if (this.nextThrow <= 0 && this.t < SECONDS - 1.5) {
      const heat = this.t / SECONDS;
      this.nextThrow = 0.7 - heat * 0.4 + world.rnd() * 0.2;
      const throwers = [player, partner].filter((a): a is NonNullable<typeof a> => !!a);
      const by = throwers[this.throwers++ % throwers.length]!;
      by.animator.play('cheer', { force: true, then: 'idle' });
      const r = world.rnd();
      const kind: Kind = r < 0.06 ? 'gold' : r < 0.2 + heat * 0.1 ? 'gray' : 'heart';
      this.items.push({ kind, x: by.x + (world.rnd() - 0.5) * 10 * s, y: by.y - 40 * s, vy: -(28 + heat * 30 + world.rnd() * 14) * s, phase: world.rnd() * 6 });
    }
    for (const f of this.items) {
      f.y += f.vy * dt;
      f.x += Math.sin(this.t * 2 + f.phase) * 18 * s * dt;
    }
    this.items = this.items.filter((f) => f.y > -20 * s);
    this.popups.update(dt);
    hud.set(`💗 ${this.score} · ${Math.max(0, Math.ceil(SECONDS - this.t))}s`);
    if (this.t >= SECONDS && this.items.length === 0) this.over = true;
    if (this.t >= SECONDS + 6) this.over = true;
  }

  pointerDown(x: number, y: number): void {
    const { world, player, partner } = this.h;
    const s = world.scale;
    const hit = this.items.findIndex((f) => Math.hypot(f.x - x, f.y - 4 * s - y) < 9 * s);
    if (hit < 0) return;
    const [f] = this.items.splice(hit, 1);
    if (!f) return;
    if (f.kind === 'gray') {
      this.score = Math.max(0, this.score - 3);
      this.popups.add('-3', f.x, f.y, '#8c8aa0');
      world.say(partner ?? player, L('Not that one! 😖', 'مش دي! 😖'));
      return;
    }
    const pts = f.kind === 'gold' ? 5 : 1;
    this.score += pts;
    this.popped++;
    this.popups.add(`+${pts}`, f.x, f.y, f.kind === 'gold' ? '#c9a227' : '#e8707f');
    world.effect('sparkle', f.x, f.y + 4 * s, 0.3);
    if (this.popped % 15 === 0) world.say(player, L('You caught so many! 🥰', 'مسكت كتير أوي! 🥰'));
  }

  draw(ctx: CanvasRenderingContext2D): Box[] {
    const s = this.h.world.scale;
    const ps = Math.max(3, Math.round(s * 1.6));
    const boxes: Box[] = [];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const f of this.items) {
      const img = bitmapCanvas(BMP[f.kind]);
      const w = img.width * ps;
      const hgt = img.height * ps;
      ctx.drawImage(img, Math.round(f.x - w / 2), Math.round(f.y - hgt / 2), w, hgt);
      boxes.push({ x: f.x - w / 2 - 2, y: f.y - hgt / 2 - 2, w: w + 4, h: hgt + 4 });
    }
    ctx.restore();
    return [...boxes, ...this.popups.draw(ctx, Math.round(6 * s))];
  }
}

export const HEART_POP: GameDef = {
  id: 'heart-pop',
  title: 'Heart Pop',
  emoji: '💗',
  description: 'They throw hearts into the air — click to pop them. Gold is worth 5. Leave the gray ones alone.',
  unit: 'points',
  create: (h) => new HeartPop(h),
};
