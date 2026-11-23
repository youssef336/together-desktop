// Renders a PNG sheet of characters × poses without a browser: `pnpm sheet [out.png]`.
// Used to eyeball the procedural pixel art and to produce docs/sprites.png.
import { writeFileSync } from 'node:fs';
import { BASE_APPEARANCE, randomizeAppearance, type Appearance } from '../src/domain/appearance';
import { composeCharacter } from '../src/pixel/compose';
import { SPRITE_H, SPRITE_W } from '../src/pixel/layout';
import { pose, type Pose } from '../src/pixel/pose';
import { encodePng } from './png';
import { DEMO_A, DEMO_B } from '../src/domain/templates';

const SCALE = 4;
const POSES: Pose[] = [
  pose({}),
  pose({ bob: 1 }),
  pose({ legs: 'stepA', arms: 'swingA' }),
  pose({ legs: 'stepB', arms: 'swingB' }),
  pose({ arms: 'wave1', mouth: 'open' }),
  pose({ arms: 'up', eyes: 'happy', mouth: 'smile' }),
  pose({ arms: 'hug', eyes: 'closed', blush: true }),
  pose({ arms: 'cup' }),
  pose({ arms: 'cupUp', eyes: 'closed' }),
  pose({ legs: 'sit', eyes: 'closed' }),
  pose({ eyes: 'wide', mouth: 'open' }),
];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const chars: Appearance[] = [DEMO_A, DEMO_B, BASE_APPEARANCE];
for (let i = 0; i < 5; i++) chars.push(randomizeAppearance(BASE_APPEARANCE, undefined, rnd));

const W = POSES.length * SPRITE_W * SCALE;
const H = chars.length * SPRITE_H * SCALE;
const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) rgba.set([0xf7, 0xf0, 0xe8, 0xff], i * 4);

chars.forEach((a, row) => {
  POSES.forEach((p, col) => {
    const buf = composeCharacter(a, p);
    for (let y = 0; y < SPRITE_H; y++) {
      for (let x = 0; x < SPRITE_W; x++) {
        const c = buf.get(x, y);
        if (!c) continue;
        const n = parseInt(c.slice(1), 16);
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            const px = col * SPRITE_W * SCALE + x * SCALE + dx;
            const py = row * SPRITE_H * SCALE + y * SCALE + dy;
            rgba.set([(n >> 16) & 255, (n >> 8) & 255, n & 255, 255], (py * W + px) * 4);
          }
        }
      }
    }
  });
});

const out = process.argv[2] ?? 'docs/sprites.png';
writeFileSync(out, encodePng(rgba, W, H));
console.log(`wrote ${out} (${W}×${H})`);
