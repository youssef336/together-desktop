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
  cloud: {
    rows: ['...ooo....', '.oooGGoo..', 'oGGGGGGGoo', 'oGGGGGGGGo', '.oooooooo.', '..B..B..B.', '.B..B..B..'],
    palette: { o: OUT, G: '#c9c4d6', B: '#9fd0d8' },
  },
  cup: {
    rows: ['.W..W.', '..W..W', 'oooooo.', 'oCCCCo.', 'oWWWWooo', 'oWWWWo.o', 'oWWWWooo', '.oooo..'],
    palette: { o: OUT, W: '#fbf6ee', C: '#6b4226' },
  },
  goldCup: {
    rows: ['.Y..Y.', '..Y..Y', 'oooooo.', 'oCCCCo.', 'oYYYYooo', 'oYWYYo.o', 'oYYYYooo', '.oooo..'],
    palette: { o: OUT, Y: '#f2c94c', W: '#fffbe6', C: '#6b4226' },
  },
  brokenMug: {
    rows: ['oooo.oo', 'oSSo.oo', 'oSSSoSo', 'oSSoSSo', '.oSSSSo', '.oooooo'],
    palette: { o: OUT, S: '#8c8aa0' },
  },
  grayHeart: {
    rows: ['.oo.oo.', 'oGGoGGo', 'oGGoGGo', 'oGGGoGo', '.oGoGo.', '..oGo..', '...o...'],
    palette: { o: OUT, G: '#8c8aa0' },
  },
  goldHeart: {
    rows: ['.oo.oo.', 'oYYoYYo', 'oYWYYYo', 'oYYYYYo', '.oYYYo.', '..oYo..', '...o...'],
    palette: { o: OUT, Y: '#f2c94c', W: '#fffbe6' },
  },
  star: {
    rows: ['...o...', '..oYo..', 'ooYYYoo', 'oYYWYYo', '.oYYYo.', 'oYo.oYo', 'oo...oo'],
    palette: { o: OUT, Y: '#f2c94c', W: '#fffbe6' },
  },
  // ── Fights: things they throw at each other ─────────────────────────────
  slipper: {
    rows: ['...oooo...', '..oBBBBo..', 'oooooooooo', 'oSSSSSSSSo', '.oooooooo.'],
    palette: { o: OUT, B: '#5b7fd1', S: '#f2d58c' },
  },
  pillow: {
    rows: ['.oooooooo.', 'oPWWWWWWPo', 'oWWWWWWWWo', 'oWWWLWWWWo', 'oPWWWWWWPo', '.oooooooo.'],
    palette: { o: OUT, W: '#fbf6ee', L: '#e9d9cd', P: '#e8a5a0' },
  },
  tomato: {
    rows: ['..GG..', '.oGGo.', 'oRWRRo', 'oRRRRo', 'oRRRRo', '.oooo.'],
    palette: { o: OUT, G: '#6d8a6f', R: '#d94a3a', W: '#f4a3a3' },
  },
  book: {
    rows: ['ooooooo', 'oBBBBWo', 'oBYYBWo', 'oBBBBWo', 'oBBBBWo', 'ooooooo'],
    palette: { o: OUT, B: '#5a6a8a', Y: '#f2c94c', W: '#fbf6ee' },
  },
  remote: {
    rows: ['oooo', 'oRDo', 'oDDo', 'oWDo', 'oDWo', 'oWDo', 'oDDo', 'oooo'],
    palette: { o: OUT, D: '#2f2b3a', R: '#e04848', W: '#8c8aa0' },
  },
  banana: {
    rows: ['......oo', '.....oYo', 'oo..oYYo', 'oYooYYo.', '.oYYYoo.', '..ooo...'],
    palette: { o: OUT, Y: '#f2d24c' },
  },
  pie: {
    rows: ['..oooo..', '.oCCCCo.', 'oCRCCRCo', 'oBBBBBBo', '.oooooo.'],
    palette: { o: OUT, C: '#fbf6ee', R: '#d94a3a', B: '#c98b4b' },
  },
  sock: {
    rows: ['ooo..', 'oWo..', 'oRo..', 'oWo..', 'oWWoo', 'oWWWo', 'ooooo'],
    palette: { o: OUT, W: '#fbf6ee', R: '#e8707f' },
  },
  // ── Fights: effects ─────────────────────────────────────────────────────
  pow: {
    rows: ['o...o...o', '.oYoYoYo.', '..oYWYo..', 'oYYWRWYYo', '.oYRRRYo.', 'oYYWRWYYo', '..oYWYo..', '.oYoYoYo.', 'o...o...o'],
    palette: { o: OUT, Y: '#f2c94c', W: '#fffbe6', R: '#e04848' },
  },
  anger: {
    rows: ['RR.RR', 'R...R', '.....', 'R...R', 'RR.RR'],
    palette: { R: '#e04848' },
  },
  dust: {
    rows: ['..ooo..', '.oDDDo.', 'oDDLDDo', 'oDLDDDo', '.oDDDo.', '..ooo..'],
    palette: { o: '#8a7d6e', D: '#d8cdbd', L: '#f6f1e9' },
  },
  feather: {
    rows: ['...o', '..oW', '.oWo', 'oWo.', 'Wo..', 'o...'],
    palette: { o: '#8c8aa0', W: '#ffffff' },
  },
  splat: {
    rows: ['R..RR..R.', '.RRRRRR..', 'RRRRRRRRR', '.R.RR.R.R'],
    palette: { R: '#d94a3a' },
  },
  cream: {
    rows: ['W..WW..W.', '.WWWWWW..', 'WWWRWWWWW', '.W.WW.W.W'],
    palette: { W: '#fbf6ee', R: '#d94a3a' },
  },
  storm: {
    rows: ['...ooo....', '.oooDDoo..', 'oDDDDDDDoo', 'oDDDDDDDDo', '.oooYoooo.', '....Y.....', '...Y......'],
    palette: { o: OUT, D: '#6b6880', Y: '#f2c94c' },
  },
  heartbreak: {
    rows: ['.oo.oo.', 'oRRoRRo', 'oRRo.Ro', 'oRRRoRo', '.oRoRo.', '..oRo..', '...o...'],
    palette: { o: OUT, R: '#e8707f' },
  },
  rose: {
    rows: ['.oRo.', 'oRRRo', 'oRWRo', '.oRo.', '..G..', '.GG..', '..G.G', '..GG.', '..G..'],
    palette: { o: OUT, R: '#e04860', W: '#f4a3a3', G: '#6d8a6f' },
  },
} satisfies Record<string, Bitmap>;

/** Things a character can throw in a fight (engine/fight.ts picks one, world/projectiles.ts flies it). */
export const THROWABLES = ['slipper', 'pillow', 'tomato', 'book', 'remote', 'banana', 'pie', 'sock'] as const;
export type Throwable = (typeof THROWABLES)[number];

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
