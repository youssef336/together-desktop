// A tiny RGBA-less pixel buffer: one CSS hex colour (or null) per cell.
// Pure TypeScript so sprites can be composed and tested without a DOM.

export class PixelBuffer {
  readonly cells: (string | null)[];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.cells = new Array<string | null>(width * height).fill(null);
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return this.cells[y * this.width + x] ?? null;
  }

  px(x: number, y: number, color: string | null): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.cells[y * this.width + x] = color;
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, color);
  }

  /** Horizontal span from x0 to x1 inclusive. */
  span(x0: number, x1: number, y: number, color: string): void {
    for (let x = x0; x <= x1; x++) this.px(x, y, color);
  }

  points(pts: readonly (readonly [number, number])[], color: string, ox = 0, oy = 0): void {
    for (const [x, y] of pts) this.px(x + ox, y + oy, color);
  }

  /** Adds a 1px outline around every opaque area — the classic pixel-art finish. */
  outline(color: string): void {
    const add: number[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) !== null) continue;
        if (
          this.get(x - 1, y) !== null ||
          this.get(x + 1, y) !== null ||
          this.get(x, y - 1) !== null ||
          this.get(x, y + 1) !== null
        ) {
          add.push(y * this.width + x);
        }
      }
    }
    for (const i of add) this.cells[i] = color;
  }

  /** Opaque bounding box, or null when empty. */
  bounds(): { x: number; y: number; w: number; h: number } | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) === null) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }
}

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 0xff;
    const out = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount;
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
