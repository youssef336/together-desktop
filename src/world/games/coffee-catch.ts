import type { Box } from '../../pixel/draw';
import { type BitmapId, bitmapCanvas } from '../../pixel/effects';
import { type DropKind, FallingField, GAME_SECONDS, scoreFor } from './falling';
import { Popups } from './popups';
import type { Game, GameDef, GameHost } from './types';

const BITMAP: Record<DropKind, BitmapId> = { cup: 'cup', gold: 'goldCup', heart: 'heart', mug: 'brokenMug' };
const MAX_LIVES = 3;
const CHEERS = ['Go go go!', 'Wow!!', 'So fast!', 'Coffee master ☕', "That's my person!"];
const OUCH = ['Ouch!', 'Not the broken one!', 'Careful!!'];

/** Coffee falls from the top; move your character with the mouse or ←/→ and catch it. */
class CoffeeCatch implements Game {
  readonly id = 'coffee-catch' as const;
  readonly capture = true;
  score = 0;
  over = false;
  private lives = MAX_LIVES;
  private combo = 0;
  private best = 0;
  private targetX: number;
  private keys = { left: false, right: false };
  private field: FallingField;
  private popups = new Popups();
  private groundY: number;

  constructor(private readonly h: GameHost) {
    const { world, player } = h;
    this.field = new FallingField(world.renderer.view.w, world.scale, world.rnd);
    this.groundY = world.bounds.bottom - 2;
    this.targetX = player.x;
  }

  start(): void {
    const { player, partner, world } = this.h;
    player.target = null;
    player.y = this.groundY;
    player.animator.play('catch', { force: true, then: 'catch' });
    if (partner) {
      partner.target = null;
      partner.y = this.groundY;
      partner.x = Math.max(world.bounds.left, Math.min(world.bounds.right, partner.x));
      partner.animator.play('idle', { force: true });
      world.say(partner, 'You can do it!');
    }
    world.say(player, 'Catch the coffee! ☕');
  }

  pointerMove(x: number): void {
    this.targetX = x;
  }

  key(code: string, down: boolean): void {
    if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = down;
    if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = down;
  }

  update(dt: number): void {
    const { player, partner, world, hud } = this.h;
    const s = world.scale;
    const { left, right } = world.bounds;
    if (this.keys.left || this.keys.right) this.targetX = player.x + (this.keys.right ? 1 : -1) * 260 * (s / 3);
    const dx = this.targetX - player.x;
    const maxStep = 340 * (s / 3) * dt;
    const move = Math.max(-maxStep, Math.min(maxStep, dx));
    player.x = Math.max(left, Math.min(right, player.x + move));
    if (Math.abs(move) > 0.5) player.facing = move > 0 ? 1 : -1;

    const events = this.field.step(dt, player.x, player.y - 44 * s, player.y - 26 * s, this.groundY);
    for (const e of events) {
      if (!e.caught) {
        if (e.kind === 'cup' || e.kind === 'gold') this.combo = 0;
        continue;
      }
      const r = scoreFor(e.kind, this.combo, this.lives, MAX_LIVES);
      this.score += r.points;
      if (e.kind === 'mug') {
        this.combo = 0;
        player.animator.play('surprise', { force: true, then: 'catch' });
        world.effect('sweat', player.x + 8 * s, player.y - 34 * s, 1);
        this.popups.add('💔', e.x, e.y - 10 * s, '#e8707f');
        if (partner) world.say(partner, OUCH[Math.floor(world.rnd() * OUCH.length)]!);
      } else {
        this.combo++;
        this.best = Math.max(this.best, this.combo);
        if (e.kind === 'heart' && r.lives > this.lives) this.popups.add('+♥', e.x, e.y - 10 * s, '#e8707f');
        else this.popups.add(`+${r.points}`, e.x, e.y - 10 * s, e.kind === 'gold' ? '#c9a227' : '#3a2a35');
        if (e.kind === 'gold') world.effect('sparkle', e.x, e.y, 0.6);
        if (partner && this.combo > 0 && this.combo % 8 === 0) {
          partner.animator.play('cheer', { force: true });
          world.say(partner, CHEERS[Math.floor(world.rnd() * CHEERS.length)]!);
        }
      }
      this.lives = r.lives;
    }
    this.popups.update(dt);
    const left_ = Math.max(0, Math.ceil(GAME_SECONDS - this.field.elapsed));
    hud.set(`☕ ${this.score} · ${'♥'.repeat(this.lives)}${'♡'.repeat(MAX_LIVES - this.lives)} · ${left_}s${this.combo >= 5 ? ` · combo ×${1 + Math.floor(this.combo / 5)}` : ''}`);
    if (this.lives <= 0 || this.field.elapsed >= GAME_SECONDS) this.over = true;
  }

  draw(ctx: CanvasRenderingContext2D): Box[] {
    const s = this.h.world.scale;
    const ps = Math.max(3, Math.round(s * 1.5));
    const boxes: Box[] = [];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const d of this.field.drops) {
      const img = bitmapCanvas(BITMAP[d.kind]);
      const w = img.width * ps;
      const hgt = img.height * ps;
      const x = Math.round(d.x - w / 2);
      const y = Math.round(d.y - hgt);
      ctx.drawImage(img, x, y, w, hgt);
      boxes.push({ x: x - 2, y: y - 2, w: w + 4, h: hgt + 4 });
    }
    ctx.restore();
    return [...boxes, ...this.popups.draw(ctx, Math.round(6 * s))];
  }
}

export const COFFEE_CATCH: GameDef = {
  id: 'coffee-catch',
  title: 'Coffee Catch',
  emoji: '☕',
  description: 'Coffee rains from the top of your screen. Move with the mouse or ←/→, catch cups, grab hearts, dodge broken mugs.',
  unit: 'cups',
  create: (h) => new CoffeeCatch(h),
};
