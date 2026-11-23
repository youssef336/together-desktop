import type { Box } from '../../pixel/draw';

/** Floating "+3" style labels drawn on the game layer. */
export class Popups {
  private items: { text: string; x: number; y: number; age: number; color: string }[] = [];

  add(text: string, x: number, y: number, color = '#3a2a35'): void {
    this.items.push({ text, x, y, age: 0, color });
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.age += dt;
      p.y -= 40 * dt;
    }
    this.items = this.items.filter((p) => p.age < 0.9);
  }

  draw(ctx: CanvasRenderingContext2D, size: number): Box[] {
    const boxes: Box[] = [];
    ctx.save();
    ctx.font = `600 ${size}px "Pixelify Sans", system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.lineWidth = Math.max(3, size / 5);
    ctx.strokeStyle = '#fffaf3';
    for (const p of this.items) {
      ctx.globalAlpha = Math.min(1, (0.9 - p.age) / 0.3);
      const w = ctx.measureText(p.text).width;
      ctx.strokeText(p.text, p.x - w / 2, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x - w / 2, p.y);
      boxes.push({ x: p.x - w / 2 - 6, y: p.y - 6, w: w + 12, h: size + 12 });
    }
    ctx.restore();
    return boxes;
  }
}
