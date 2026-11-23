// Renders every scene (with the demo couple standing in it) to a PNG: `pnpm scenes [out.png]`.
import { writeFileSync } from 'node:fs';
import { composeCharacter } from '../src/pixel/compose';
import { SPRITE_H, SPRITE_W } from '../src/pixel/layout';
import { pose } from '../src/pixel/pose';
import { BELLO, DEMO_B } from '../src/domain/templates';
import type { Painter } from '../src/scenes/paint';
import { FLOOR_Y, paintScene, SCENE_H, SCENE_W, SCENES } from '../src/scenes/scenes';
import { encodePng } from './png';

const S = 3;
const COLS = 2;
const PAD = 8;
const rows = Math.ceil(SCENES.length / COLS);
const W = COLS * (SCENE_W + PAD) * S + PAD * S;
const H = rows * (SCENE_H + PAD) * S + PAD * S;
const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) rgba.set([0xfb, 0xf5, 0xee, 0xff], i * 4);

function blend(x: number, y: number, hex: string) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const n = parseInt(hex.slice(1, 7), 16);
  const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  const i = (y * W + x) * 4;
  for (const [k, v] of [[0, (n >> 16) & 255], [1, (n >> 8) & 255], [2, n & 255]] as const) rgba[i + k] = Math.round(rgba[i + k]! * (1 - a) + v * a);
}

SCENES.forEach((def, idx) => {
  const ox = (PAD + (idx % COLS) * (SCENE_W + PAD)) * S;
  const oy = (PAD + Math.floor(idx / COLS) * (SCENE_H + PAD)) * S;
  const g: Painter = {
    rect(x, y, w, h, c) {
      for (let j = Math.round(y); j < Math.round(y + h); j++)
        for (let i = Math.round(x); i < Math.round(x + w); i++)
          if (i >= 0 && j >= 0 && i < SCENE_W && j < SCENE_H) for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) blend(ox + i * S + dx, oy + j * S + dy, c);
    },
    px(x, y, c) {
      this.rect(x, y, 1, 1, c);
    },
  };
  paintScene(g, def, 1.3, true);
  [BELLO, DEMO_B].forEach((a, k) => {
    const buf = composeCharacter(a, pose({ look: k === 0 ? 1 : -1 }));
    const cx = 60 + k * 22;
    for (let y = 0; y < SPRITE_H; y++)
      for (let x = 0; x < SPRITE_W; x++) {
        const c = buf.get(k === 1 ? SPRITE_W - 1 - x : x, y);
        if (c) g.rect(cx - SPRITE_W / 2 + x, FLOOR_Y - 39 + y, 1, 1, c);
      }
  });
});
const out = process.argv[2] ?? 'docs/scenes.png';
writeFileSync(out, encodePng(rgba, W, H));
console.log(`wrote ${out}`);
