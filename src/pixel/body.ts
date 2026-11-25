import type { Appearance } from '../domain/appearance';
import { type PixelBuffer, shade } from './buffer';
import { GROUND, HEAD_INSETS, HEAD_L, HEAD_R, type Layout, mirrorX } from './layout';
import type { ArmPose, Pose } from './pose';

type Rect = readonly [x: number, y: number, w: number, h: number];

const SLEEVE_ROWS = { tee: 2, hoodie: 5, sweater: 5, shirt: 5, dress: 1, tank: 0 } as const;
export const CUP = '#fbf6ee';
export const COFFEE = '#6b4226';

export function drawHead(buf: PixelBuffer, a: Appearance, l: Layout): void {
  const insets = HEAD_INSETS[a.faceShape];
  const side = shade(a.skin, -0.1);
  insets.forEach((inset, row) => {
    const y = l.hy + row;
    buf.span(HEAD_L + inset, HEAD_R - inset, y, a.skin);
    buf.px(HEAD_R - inset, y, side);
  });
}

export function drawLegs(buf: PixelBuffer, a: Appearance, l: Layout, p: Pose): void {
  const lift = { stand: [0, 0], sit: [0, 0], stepA: [1, 0], stepB: [0, 1] }[p.legs];
  const legs = [l.legA, l.legB] as const;
  legs.forEach(([x0, x1], i) => {
    const up = lift[i] ?? 0;
    const bottomRow = GROUND - 1 - up;
    for (let y = l.ly; y <= bottomRow; y++) {
      const k = y - l.ly;
      let c = a.skin;
      if (a.bottom === 'pants' && a.top !== 'dress') c = a.bottomColor;
      if (a.bottom === 'shorts' && a.top !== 'dress' && k < 3) c = a.bottomColor;
      buf.span(x0, x1, y, c);
      if (c !== a.skin) buf.px(i === 0 ? x1 : x0, y, shade(c, -0.12));
    }
    drawShoe(buf, a, i === 0 ? x0 - 1 : x0, i === 0 ? x1 : x1 + 1, GROUND - up);
  });
}

function drawShoe(buf: PixelBuffer, a: Appearance, x0: number, x1: number, y: number): void {
  switch (a.shoes) {
    case 'none':
      buf.span(x0 + 1, x1 - 1, y, a.skin);
      return;
    case 'boots':
      buf.span(x0, x1, y, a.shoeColor);
      buf.span(x0 + 1, x1, y - 1, a.shoeColor);
      buf.px(x0 + 1, y - 2, shade(a.shoeColor, -0.15));
      return;
    case 'slippers':
      buf.span(x0, x1, y, shade(a.shoeColor, 0.25));
      return;
    case 'sneakers':
      buf.span(x0, x1, y, a.shoeColor);
      buf.px(x0, y, shade(a.shoeColor, -0.2));
      buf.px(x1, y, shade(a.shoeColor, -0.2));
  }
}

export function drawTorso(buf: PixelBuffer, a: Appearance, l: Layout): void {
  const c = a.topColor;
  const dark = shade(c, -0.14);
  for (let y = l.ty; y < l.ty + 8; y++) {
    buf.span(l.torsoL, l.torsoR, y, c);
    buf.px(l.torsoR, y, dark);
  }
  buf.span(l.torsoL, l.torsoR, l.ty + 7, shade(c, -0.08));
  const mid = 13;
  switch (a.top) {
    case 'tee':
      buf.span(mid, mid + 1, l.ty, a.skin);
      break;
    case 'tank':
      buf.span(mid - 1, mid + 2, l.ty, a.skin);
      buf.span(mid, mid + 1, l.ty + 1, a.skin);
      break;
    case 'hoodie':
      buf.px(l.torsoL, l.ty - 1, c);
      buf.px(l.torsoR, l.ty - 1, dark);
      buf.points([[mid - 1, l.ty + 1], [mid - 1, l.ty + 2], [mid + 2, l.ty + 1], [mid + 2, l.ty + 2]], '#fbf6ee');
      buf.span(l.torsoL + 2, l.torsoR - 2, l.ty + 5, dark);
      break;
    case 'sweater':
      buf.span(l.torsoL, l.torsoR, l.ty + 3, shade(c, 0.2));
      buf.span(mid, mid + 1, l.ty, shade(c, -0.2));
      break;
    case 'shirt':
      buf.points([[mid - 2, l.ty], [mid - 1, l.ty], [mid + 2, l.ty], [mid + 3, l.ty]], '#fbf6ee');
      buf.span(mid, mid + 1, l.ty, a.skin);
      buf.points([[mid, l.ty + 2], [mid, l.ty + 4], [mid, l.ty + 6]], dark);
      break;
    case 'dress':
      buf.span(mid - 1, mid + 2, l.ty, a.skin);
      buf.span(l.torsoL, l.torsoR, l.ty + 5, dark);
      break;
  }
}

/** Skirts and the lower part of a dress, drawn over the legs. */
export function drawSkirt(buf: PixelBuffer, a: Appearance, l: Layout): void {
  const isDress = a.top === 'dress';
  if (!isDress && a.bottom !== 'skirt') return;
  const c = isDress ? a.topColor : a.bottomColor;
  const rows = Math.min(isDress ? 4 : 3, l.legLen);
  for (let k = 0; k < rows; k++) {
    const grow = 1 + Math.floor(k / 2);
    buf.span(l.torsoL - grow, l.torsoR + grow, l.ly + k, k === rows - 1 ? shade(c, -0.12) : c);
  }
}

function rightArm(pose: ArmPose, l: Layout, side: 'a' | 'b'): Rect[] {
  const rx = l.torsoR + 1;
  const t = l.ty;
  const down = (dy: number): Rect[] => Array.from({ length: 7 }, (_, i) => [rx, t + 1 + i + dy, 2, 1]);
  switch (pose) {
    case 'swingA':
      return down(side === 'a' ? -1 : 0);
    case 'swingB':
      return down(side === 'a' ? 0 : -1);
    case 'wave1':
      return Array.from({ length: 7 }, (_, i) => [rx + (i > 1 ? 1 : 0), t + 1 - i, 2, 1]);
    case 'wave2':
      return Array.from({ length: 7 }, (_, i) => [rx + (i > 1 ? 1 : 0) + (i > 4 ? 1 : 0), t + 1 - i, 2, 1]);
    case 'up':
      return Array.from({ length: 7 }, (_, i) => [rx + (i > 2 ? 1 : 0), t + 1 - i, 2, 1]);
    case 'hug':
      return Array.from({ length: 7 }, (_, i) => [rx + i, t + 2, 1, 2]);
    case 'reach':
      return Array.from({ length: 7 }, (_, i) => [rx + Math.floor(i / 3), t + 1 + i, 2, 1]);
    case 'cup':
      return [[rx, t + 1, 2, 1], [rx, t + 2, 2, 1], [rx, t + 3, 2, 1], [rx, t + 4, 2, 1], [rx - 1, t + 5, 2, 1], [rx - 2, t + 4, 2, 1], [rx - 3, t + 4, 2, 1]];
    case 'cupUp':
      return [[rx, t + 1, 2, 1], [rx, t, 2, 1], [rx, t - 1, 2, 1], [rx - 1, t - 2, 2, 1], [rx - 2, t - 2, 2, 1], [rx - 3, t - 3, 2, 1], [rx - 4, t - 3, 2, 1]];
    case 'punch':
      // Straight out at the partner, fist at the end.
      return [...Array.from({ length: 6 }, (_, i): Rect => [rx + i, t + 2, 1, 2]), [rx + 6, t + 1, 2, 3]];
    case 'windup':
      // Cocked up beside the head, the hand (and whatever it throws) above it.
      return [[rx, t + 1, 2, 1], [rx + 1, t, 2, 1], [rx + 2, t - 1, 2, 1], [rx + 2, t - 2, 2, 1], [rx + 2, t - 3, 2, 1], [rx + 2, t - 4, 2, 1], [rx + 2, t - 6, 3, 2]];
    case 'throw':
      // Follow-through: forward and a little up.
      return Array.from({ length: 7 }, (_, i): Rect => [rx + i, t + 1 - Math.floor(i / 2), 1, 2]);
    case 'guard':
      // Elbow down, forearm up, fist by the chin.
      return [[rx, t + 1, 2, 1], [rx, t + 2, 2, 1], [rx, t + 3, 3, 1], [rx + 2, t + 1, 2, 2], [rx + 2, t - 1, 2, 2], [rx + 2, t - 3, 2, 2]];
    case 'cross':
    case 'down':
      return down(0);
  }
}

/** Arms crossed over the chest (a sulk): both shoulders, then two forearms across the torso. */
function drawCrossedArms(buf: PixelBuffer, a: Appearance, l: Layout): void {
  const t = l.ty;
  const rx = l.torsoR + 1;
  const lx = mirrorX(rx, 2);
  const sleeve = a.top === 'tank' ? a.skin : a.topColor;
  const longSleeve = SLEEVE_ROWS[a.top] >= 5;
  for (let y = t + 1; y <= t + 4; y++) {
    buf.rect(rx, y, 2, 1, y < t + 1 + SLEEVE_ROWS[a.top] ? a.topColor : a.skin);
    buf.rect(lx, y, 2, 1, y < t + 1 + SLEEVE_ROWS[a.top] ? a.topColor : a.skin);
  }
  // Upper forearm (right arm) crosses to the left; the lower one (left arm) to the right.
  buf.rect(l.torsoL + 1, t + 3, rx - l.torsoL - 1, 2, longSleeve ? sleeve : a.skin);
  buf.rect(l.torsoL, t + 3, 2, 2, a.skin);
  buf.rect(lx + 2, t + 5, l.torsoR - lx - 2, 2, longSleeve ? shade(sleeve, -0.1) : shade(a.skin, -0.06));
  buf.rect(l.torsoR - 1, t + 5, 2, 2, a.skin);
}

function paintArm(buf: PixelBuffer, a: Appearance, rects: Rect[]): void {
  const sleeve = Math.min(SLEEVE_ROWS[a.top], rects.length - 2);
  rects.forEach(([x, y, w, h], i) => {
    const c = i < sleeve ? a.topColor : a.skin;
    buf.rect(x, y, w, h, c);
  });
}

/** Arm poses describe the right arm (the one facing the partner); the left follows. */
export function drawArms(buf: PixelBuffer, a: Appearance, l: Layout, p: Pose): CupSpot | null {
  if (p.arms === 'cross') {
    drawCrossedArms(buf, a, l);
    return null;
  }
  const right = rightArm(p.arms, l, 'a');
  let left: Rect[];
  const mirror = (rects: Rect[]) => rects.map(([x, y, w, h]) => [mirrorX(x, w), y, w, h] as Rect);
  if (p.arms === 'punch' || p.arms === 'guard') {
    // The other fist stays up by the face.
    left = mirror(rightArm('guard', l, 'b'));
  } else if (p.arms === 'hug') {
    left = Array.from({ length: 7 }, (_, i) => [l.torsoL - 2 + i * 2, l.ty + 4, 2, 2] as Rect);
  } else if (p.arms === 'up' || p.arms === 'swingA' || p.arms === 'swingB' || p.arms === 'reach') {
    left = rightArm(p.arms === 'reach' ? 'down' : p.arms, l, 'b').map(([x, y, w, h]) => [mirrorX(x, w), y, w, h] as Rect);
  } else {
    left = rightArm('down', l, 'b').map(([x, y, w, h]) => [mirrorX(x, w), y, w, h] as Rect);
  }
  paintArm(buf, a, left);
  paintArm(buf, a, right);
  if (p.arms === 'cup' || p.arms === 'cupUp') {
    const hand = right[right.length - 1]!;
    return { x: hand[0] - 2, y: hand[1] - 2 };
  }
  return null;
}

export interface CupSpot {
  x: number;
  y: number;
}

export function drawCup(buf: PixelBuffer, at: CupSpot): void {
  buf.rect(at.x, at.y, 3, 3, CUP);
  buf.span(at.x, at.x + 2, at.y, COFFEE);
  buf.px(at.x - 1, at.y + 1, CUP);
}
