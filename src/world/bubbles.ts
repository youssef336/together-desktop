import type { Box } from '../pixel/draw';

// Pixel speech bubbles: stepped corners, a 1-block outline and a little tail to the speaker.

const FILL = '#fffaf3';
const LINE = '#3a2a35';
const TEXT = '#3a2a35';

export interface BubbleLayout extends Box {
  lines: string[];
  tailX: number;
  below: boolean;
  font: string;
  lineH: number;
  pad: number;
  block: number;
}

export function bubbleFont(s: number): { font: string; size: number } {
  const size = Math.max(12, Math.round(s * 4.4));
  return { font: `${size}px "Pixelify Sans", ui-rounded, system-ui, sans-serif`, size };
}

const ARABIC = /[\u0600-\u06FF]/;

/** Breaks the pixel font's f-ligatures with a zero-width non-joiner. */
const noLigatures = (t: string) => t.replace(/f(?=[filt])/g, 'f\u200c');

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = noLigatures(text).split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/** Lays out a bubble above (or, near the top edge, below) a head, kept inside the window. */
export function layoutBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  headX: number,
  headTop: number,
  feetY: number,
  s: number,
  view: { w: number; h: number },
): BubbleLayout {
  const { font, size } = bubbleFont(s);
  ctx.font = font;
  const block = Math.max(2, Math.round(s * 0.75));
  const pad = block * 4;
  const maxText = Math.min(190 + s * 12, view.w - 40);
  const lines = wrap(ctx, text, maxText);
  const lineH = Math.round(size * 1.25);
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const w = Math.ceil(textW + pad * 2);
  const h = Math.ceil(lines.length * lineH + pad * 1.6);
  const tail = block * 3;
  let below = false;
  let y = headTop - h - tail - block;
  if (y < 4) {
    below = true;
    y = feetY + tail + block;
  }
  const x = Math.max(4, Math.min(view.w - w - 4, headX - w / 2));
  const tailX = Math.max(x + pad, Math.min(x + w - pad, headX));
  return { x, y, w, h, lines, tailX, below, font, lineH, pad, block };
}

export function drawBubble(ctx: CanvasRenderingContext2D, b: BubbleLayout, alpha: number): Box {
  const { x, y, w, h, block: k } = b;
  ctx.save();
  ctx.globalAlpha = alpha;
  // outline (stepped corners)
  ctx.fillStyle = LINE;
  ctx.fillRect(x + k, y, w - 2 * k, h);
  ctx.fillRect(x, y + k, w, h - 2 * k);
  ctx.fillStyle = FILL;
  ctx.fillRect(x + 2 * k, y + k, w - 4 * k, h - 2 * k);
  ctx.fillRect(x + k, y + 2 * k, w - 2 * k, h - 4 * k);
  // soft shadow row
  ctx.fillStyle = '#f0e2d6';
  ctx.fillRect(x + 2 * k, y + h - 2 * k, w - 4 * k, k);
  // tail
  const tx = Math.round(b.tailX - k);
  for (let i = 0; i < 3; i++) {
    const ty = b.below ? y - (i + 1) * k : y + h + i * k;
    const tw = (3 - i) * k;
    ctx.fillStyle = LINE;
    ctx.fillRect(tx - k, ty - (b.below ? 0 : k), tw + 2 * k - i * k, k + (i === 0 ? 0 : 0));
    ctx.fillStyle = FILL;
    if (i < 2) ctx.fillRect(tx, ty - (b.below ? 0 : k), tw - i * k, k);
  }
  ctx.fillStyle = TEXT;
  ctx.font = b.font;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  b.lines.forEach((line, i) => {
    // Arabic lines (the fight's Egyptian lines, custom lines) read right to left: emoji and "?!" land on the left.
    ctx.direction = ARABIC.test(line) ? 'rtl' : 'ltr';
    const lw = ctx.measureText(line).width;
    ctx.fillText(line, Math.round(x + (w - lw) / 2), Math.round(y + b.pad * 0.8 + i * b.lineH));
  });
  ctx.restore();
  return { x: x - k, y: y - 4 * k, w: w + 2 * k, h: h + 8 * k };
}
