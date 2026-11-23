// Generates the app icon (1024² source for `tauri icon`) and the tray template icon.
import { writeFileSync } from 'node:fs';
import { encodePng } from './png';

const HEART = [
  '..XX...XX..',
  '.XXXX.XXXX.',
  'XXHXXXXXXXX',
  'XHXXXXXXXXX',
  'XXXXXXXXXXX',
  '.XXXXXXXXX.',
  '..XXXXXXX..',
  '...XXXXX...',
  '....XXX....',
  '.....X.....',
];

function canvas(size: number, bg: number[] | null) {
  const rgba = Buffer.alloc(size * size * 4);
  if (bg) for (let i = 0; i < size * size; i++) rgba.set(bg, i * 4);
  const fill = (x: number, y: number, w: number, h: number, c: number[]) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) rgba.set(c, (j * size + i) * 4);
  };
  return { rgba, fill };
}

function heart(fill: (x: number, y: number, w: number, h: number, c: number[]) => void, ox: number, oy: number, cell: number, body: number[], hi: number[]) {
  HEART.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      fill(ox + x * cell, oy + y * cell, cell, cell, ch === 'H' ? hi : body);
    }),
  );
}

// App icon: cream rounded tile, pixel heart with outline.
{
  const S = 1024;
  const { rgba, fill } = canvas(S, null);
  const r = 180;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = Math.max(r - x, 0, x - (S - 1 - r));
      const dy = Math.max(r - y, 0, y - (S - 1 - r));
      if (dx * dx + dy * dy <= r * r) rgba.set([0xf7, 0xee, 0xe3, 0xff], (y * S + x) * 4);
    }
  const cell = 64;
  const ox = (S - 11 * cell) / 2;
  const oy = (S - 10 * cell) / 2 + 20;
  // outline: draw the heart offset in 4 directions in plum first
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) heart(fill, ox + dx * 24, oy + dy * 24, cell, [0x3a, 0x2a, 0x35, 0xff], [0x3a, 0x2a, 0x35, 0xff]);
  heart(fill, ox, oy, cell, [0xe8, 0x7a, 0x86, 0xff], [0xfb, 0xd3, 0xd6, 0xff]);
  writeFileSync('src-tauri/icons/source.png', encodePng(rgba, S, S));
}

// Tray icon: 32² black-on-transparent template (macOS tints it; Windows shows it as-is).
{
  const S = 32;
  const { rgba, fill } = canvas(S, null);
  heart(fill, 5, 6, 2, [0x22, 0x1c, 0x22, 0xff], [0x22, 0x1c, 0x22, 0xff]);
  writeFileSync('src-tauri/icons/tray.png', encodePng(rgba, S, S));
}
// Colour tray icon for Windows (the notification area does not tint template images).
{
  const S = 32;
  const { rgba, fill } = canvas(S, null);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) heart(fill, 5 + dx, 6 + dy, 2, [0x3a, 0x2a, 0x35, 0xff], [0x3a, 0x2a, 0x35, 0xff]);
  heart(fill, 5, 6, 2, [0xe8, 0x7a, 0x86, 0xff], [0xfb, 0xd3, 0xd6, 0xff]);
  writeFileSync('src-tauri/icons/tray-color.png', encodePng(rgba, S, S));
}
console.log('icons written');
