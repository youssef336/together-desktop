import type { Appearance } from '../domain/appearance';
import type { Pose } from './pose';

/** Logical sprite size. The world and editor scale it by an integer factor. */
export const SPRITE_W = 28;
export const SPRITE_H = 40;
/** Row of the feet; row 39 is left for the outline. */
export const GROUND = 38;
/** Head spans x 8..19 (12 px); the sprite is symmetric around x = 13.5. */
export const HEAD_L = 8;
export const HEAD_R = 19;

const LEG_LENGTH = { short: 5, medium: 7, tall: 9 } as const;
const TORSO = { slim: [10, 17], regular: [9, 18], broad: [8, 19] } as const;
const LEGS = {
  slim: [[11, 12], [15, 16]],
  regular: [[10, 12], [15, 17]],
  broad: [[10, 12], [15, 17]],
} as const;

export interface Layout {
  /** Leg length for this frame (shortened when breathing or sitting). */
  legLen: number;
  /** First leg row. */
  ly: number;
  /** First torso row. */
  ty: number;
  /** First head row. */
  hy: number;
  torsoL: number;
  torsoR: number;
  legA: readonly [number, number];
  legB: readonly [number, number];
}

export function layoutFor(a: Appearance, p: Pose): Layout {
  const full = LEG_LENGTH[a.height];
  const legLen = p.legs === 'sit' ? 3 : full - p.bob;
  const ly = GROUND - legLen;
  const ty = ly - 8;
  const hy = ty - 10;
  const [torsoL, torsoR] = TORSO[a.bodyShape];
  const [legA, legB] = LEGS[a.bodyShape];
  return { legLen, ly, ty, hy, torsoL, torsoR, legA, legB };
}

/** Mirror an x coordinate across the sprite centre. */
export function mirrorX(x: number, w = 1): number {
  return SPRITE_W - 1 - x - (w - 1);
}

/** Per-row horizontal inset of the head, top to bottom (10 rows). */
export const HEAD_INSETS = {
  round: [3, 1, 1, 0, 0, 0, 0, 0, 1, 3],
  oval: [3, 2, 1, 0, 0, 0, 0, 1, 2, 3],
  square: [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  heart: [2, 0, 0, 0, 0, 0, 0, 1, 2, 4],
} as const;
