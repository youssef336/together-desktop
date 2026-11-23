import type { Appearance } from '../domain/appearance';
import type { Frame } from '../engine/clips';
import { SPRITE_H, SPRITE_W } from './layout';
import type { Pose } from './pose';
import { spriteFrame } from './sprite-cache';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Feet are at sprite row 38 → the anchor sits at the bottom of that row. */
const FEET = 39;

/**
 * Draws a character with its feet at (x, y) in canvas units. `s` = pixel scale.
 * Returns the box it covered, for dirty-rect clearing and hit-testing.
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  a: Appearance,
  frame: Frame,
  x: number,
  y: number,
  s: number,
  facing: 1 | -1,
  overrides: Partial<Pose> = {},
): Box {
  const img = spriteFrame(a, { ...frame.pose, ...overrides, look: overrides.look ?? frame.pose.look });
  const lift = (frame.lift ?? 0) * s;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (frame.lie) {
    // Lying down: rotate around the feet so the head points away from the facing side.
    ctx.translate(Math.round(x), Math.round(y - 7 * s));
    ctx.rotate((facing === 1 ? -1 : 1) * (Math.PI / 2));
    ctx.drawImage(img, Math.round(-(SPRITE_W / 2) * s), Math.round(-FEET * s + 9 * s), SPRITE_W * s, SPRITE_H * s);
    ctx.restore();
    const w = SPRITE_H * s;
    return { x: x - (facing === 1 ? w - 9 * s : 9 * s), y: y - 16 * s, w, h: 17 * s };
  }
  ctx.translate(Math.round(x), Math.round(y - lift));
  if (facing === -1) ctx.scale(-1, 1);
  ctx.drawImage(img, Math.round(-(SPRITE_W / 2) * s), Math.round(-FEET * s), SPRITE_W * s, SPRITE_H * s);
  ctx.restore();
  return { x: x - (SPRITE_W / 2) * s, y: y - lift - FEET * s, w: SPRITE_W * s, h: SPRITE_H * s };
}

/** Tighter box around the body, used for clicks. */
export function bodyBox(x: number, y: number, s: number, lie = false): Box {
  if (lie) return { x: x - 20 * s, y: y - 14 * s, w: 40 * s, h: 14 * s };
  return { x: x - 8 * s, y: y - 30 * s, w: 16 * s, h: 30 * s };
}
