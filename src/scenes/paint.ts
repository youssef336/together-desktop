// Low-resolution painter for scene art. Scenes are drawn at 1 unit = 1 sprite pixel on a small
// canvas, then scaled up with smoothing off — the same crisp look as the characters.

export interface Painter {
  rect(x: number, y: number, w: number, h: number, color: string): void;
  px(x: number, y: number, color: string): void;
}

export function painterFor(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): Painter {
  return {
    rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    },
    px(x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    },
  };
}

/** Tiny deterministic random, so a scene's stars or flowers are the same every time. */
export function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const INK = '#3a2a35';
