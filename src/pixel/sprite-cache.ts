import type { Appearance } from '../domain/appearance';
import type { PixelBuffer } from './buffer';
import { composeCharacter } from './compose';
import { type Pose, poseKey } from './pose';

// Composed frames are cached as 1× canvases (28×40). Drawing scales them with smoothing off,
// so a frame is composed once per character/pose and then only blitted.

const MAX = 600;
const cache = new Map<string, HTMLCanvasElement>();
const appearanceKeys = new WeakMap<Appearance, string>();

function appearanceKey(a: Appearance): string {
  let k = appearanceKeys.get(a);
  if (!k) {
    k = JSON.stringify(a);
    appearanceKeys.set(a, k);
  }
  return k;
}

export function bufferToCanvas(buf: PixelBuffer): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = buf.width;
  c.height = buf.height;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(buf.width, buf.height);
  buf.cells.forEach((color, i) => {
    if (!color) return;
    const n = parseInt(color.slice(1, 7), 16);
    img.data[i * 4] = (n >> 16) & 255;
    img.data[i * 4 + 1] = (n >> 8) & 255;
    img.data[i * 4 + 2] = n & 255;
    img.data[i * 4 + 3] = 255;
  });
  ctx.putImageData(img, 0, 0);
  return c;
}

export function spriteFrame(a: Appearance, p: Pose): HTMLCanvasElement {
  const key = `${appearanceKey(a)}#${poseKey(p)}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit); // LRU touch
    return hit;
  }
  const c = bufferToCanvas(composeCharacter(a, p));
  cache.set(key, c);
  if (cache.size > MAX) cache.delete(cache.keys().next().value!);
  return c;
}
