import { bitmapCanvas } from '../pixel/effects';
import { type Box, bodyBox, drawCharacter } from '../pixel/draw';
import { world as native, type HitRect } from '../platform/bridge';
import { drawBubble, layoutBubble } from './bubbles';
import type { World } from './runtime';

const pad = (b: Box, p: number): Box => ({ x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p });

/**
 * Draws the world onto one full-window canvas. Only the regions drawn last frame and this frame
 * are cleared, so an idle couple costs two small blits a few times per second.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  view = { w: 0, h: 0 };
  dpr = 1;
  dirty = true;
  private prev: Box[] = [];
  private lastHit = '';
  /** Extra interactive regions by owner (menu, choice bubble, game HUD). */
  readonly extraHit = new Map<string, HitRect[]>();
  /** True while a game wants every click in the window. */
  captureAll = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly world: World,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.view = { w: window.innerWidth, h: window.innerHeight };
    this.canvas.width = Math.round(this.view.w * this.dpr);
    this.canvas.height = Math.round(this.view.h * this.dpr);
    this.canvas.style.width = `${this.view.w}px`;
    this.canvas.style.height = `${this.view.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.view.w, this.view.h);
    this.prev = [];
    this.dirty = true;
  }

  render(): void {
    if (!this.dirty) return;
    this.dirty = false;
    const { ctx, world } = this;
    for (const b of this.prev) ctx.clearRect(b.x, b.y, b.w, b.h);
    const drawn: Box[] = [];
    const hits: HitRect[] = [...this.extraHit.values()].flat();
    if (this.captureAll) hits.push({ x: 0, y: 0, w: this.view.w, h: this.view.h });
    const s = world.scale;

    if (!world.settings?.hidden) {
      const actors = [...world.actors].sort((a, b) => a.y - b.y);
      for (const a of actors) {
        const frame = a.animator.frame();
        const look = a.look !== 0 ? a.look : frame.pose.look;
        drawn.push(pad(drawCharacter(ctx, a.character.appearance, frame, a.x, a.y, s, a.facing, { look }), 2));
        hits.push(bodyBox(a.x, a.y - (frame.lift ?? 0) * s, s, frame.lie));
      }
      for (const p of world.particles.items) {
        const img = bitmapCanvas(p.bmp);
        const alpha = Math.min(1, (p.ttl - p.age) / 0.5);
        const ps = Math.max(2, Math.round(s * 0.75));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = false;
        const box = { x: Math.round(p.x - (img.width * ps) / 2), y: Math.round(p.y - img.height * ps), w: img.width * ps, h: img.height * ps };
        ctx.drawImage(img, box.x, box.y, box.w, box.h);
        ctx.restore();
        drawn.push(pad(box, 2));
      }
      if (world.game?.draw) drawn.push(...world.game.draw(ctx));
      const bubbles: Box[] = [];
      for (const a of actors) {
        if (!a.bubble) continue;
        const frame = a.animator.frame();
        const top = frame.lie ? a.y - 18 * s : a.y - (frame.lift ?? 0) * s - 36 * s;
        const layout = layoutBubble(ctx, a.bubble.text, a.x, top, a.y, s, this.view);
        // Two bubbles at once (a game reveal): stack instead of overlapping.
        for (const other of bubbles) {
          if (layout.x < other.x + other.w && layout.x + layout.w > other.x && layout.y < other.y + other.h && layout.y + layout.h > other.y) {
            layout.y = other.y - layout.h - 6 * s;
          }
        }
        const alpha = Math.min(1, a.bubble.ttl / 0.4);
        const box = drawBubble(ctx, layout, alpha);
        bubbles.push(layout);
        drawn.push(pad(box, 2));
      }
    }
    this.prev = drawn;
    this.reportHits(hits);
  }

  private reportHits(hits: HitRect[]): void {
    // A little margin so a quick move-and-click still lands (the Rust loop polls the cursor).
    const m = 10;
    const rounded = hits.map((h) => ({ x: Math.round(h.x - m), y: Math.round(h.y - m), w: Math.round(h.w + 2 * m), h: Math.round(h.h + 2 * m) }));
    const json = JSON.stringify(rounded);
    if (json === this.lastHit) return;
    this.lastHit = json;
    void native.setHitboxes(rounded);
  }

  hitTest(x: number, y: number): string | null {
    const s = this.world.scale;
    const actors = [...this.world.actors].sort((a, b) => b.y - a.y);
    for (const a of actors) {
      const f = a.animator.frame();
      const b = bodyBox(a.x, a.y - (f.lift ?? 0) * s, s, f.lie);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return a.id;
    }
    return null;
  }
}
