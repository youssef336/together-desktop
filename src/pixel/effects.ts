// Tiny pixel bitmaps for world effects. '.' = transparent; other chars index the palette.

export interface Bitmap {
  rows: string[];
  palette: Record<string, string>;
}

const OUT = '#3a2a35';

export const BITMAPS = {
  heart: {
    rows: ['.oo.oo.', 'oRRoRRo', 'oRWRRRo', 'oRRRRRo', '.oRRRo.', '..oRo..', '...o...'],
    palette: { o: OUT, R: '#e8707f', W: '#fbd3d6' },
  },
  z: {
    rows: ['ooooo', 'oWWWo', 'ooWoo', '.oWo.', 'oWooo', 'oWWWo', 'ooooo'],
    palette: { o: OUT, W: '#dfe6ff' },
  },
  note: {
    rows: ['..ooo', '..oNo', '..oNo', '..o.o', 'oNo..', 'NNo..', 'oo...'],
    palette: { o: OUT, N: '#9a8fd8' },
  },
  steam: {
    rows: ['.W.', 'W..', '.W.', '..W', '.W.'],
    palette: { W: '#ffffffcc' },
  },
  sparkle: {
    rows: ['..Y..', '..Y..', 'YYWYY', '..Y..', '..Y..'],
    palette: { Y: '#f2c94c', W: '#fffbe6' },
  },
  gift: {
    rows: ['.ooo.ooo.', 'oRRoYoRRo', 'ooooooooo', 'oPPPYPPPo', 'oPPPYPPPo', 'oPPPYPPPo', 'ooooooooo'],
    palette: { o: OUT, R: '#e8707f', Y: '#f2c94c', P: '#9fd0d8' },
  },
  sweat: {
    rows: ['.o.', 'oBo', 'oBo', '.o.'],
    palette: { o: OUT, B: '#9fd0d8' },
  },
} satisfies Record<string, Bitmap>;

export type BitmapId = keyof typeof BITMAPS;

const cache = new Map<string, HTMLCanvasElement>();

/** 1× canvas for a bitmap; draw it scaled with smoothing off. */
export function bitmapCanvas(id: BitmapId): HTMLCanvasElement {
  const hit = cache.get(id);
  if (hit) return hit;
  const bmp: Bitmap = BITMAPS[id];
  const h = bmp.rows.length;
  const w = Math.max(...bmp.rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  bmp.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const color = bmp.palette[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  cache.set(id, c);
  return c;
}
