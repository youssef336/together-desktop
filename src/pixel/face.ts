import type { Appearance } from '../domain/appearance';
import { type PixelBuffer, shade } from './buffer';
import type { Layout } from './layout';
import type { Pose } from './pose';

const WHITE = '#fbf6ee';
const MOUTH = '#7a3045';
const MOUTH_IN = '#a8465a';
const BLUSH = '#f4a3a3';
const LINE = '#3a2a35';

/** Left eye starts at x 10, right eye at x 16 (each 2 px wide). */
const EYE_X = [10, 16] as const;

export function drawFace(buf: PixelBuffer, a: Appearance, l: Layout, p: Pose): void {
  const y = l.hy;
  drawDetails(buf, a, y, p);
  drawEyes(buf, a, y, p);
  if (p.eyes === 'sad') drawSadBrows(buf, a, y);
  else drawBrows(buf, a, y);
  drawNose(buf, a, y);
  drawMouth(buf, a, y, p);
}

function drawEyes(buf: PixelBuffer, a: Appearance, hy: number, p: Pose): void {
  const big = a.eyeSize === 2;
  for (const [i, ex] of EYE_X.entries()) {
    const x = ex + p.look;
    if (p.eyes === 'closed') {
      buf.span(x, x + 1, hy + 5, LINE);
      continue;
    }
    if (p.eyes === 'happy') {
      const base = i === 0 ? ex - 1 : ex;
      buf.points([[0, 5], [1, 4], [2, 5]], LINE, base, hy);
      continue;
    }
    if (p.eyes === 'wide') {
      buf.rect(x, hy + 3, 2, 3, WHITE);
      buf.rect(x + (p.look > 0 ? 1 : 0), hy + 4, 1, 2, a.eyeColor);
      continue;
    }
    switch (a.eyeShape) {
      case 'dot':
        buf.rect(x, hy + 4, big ? 2 : 1, 2, a.eyeColor);
        break;
      case 'round':
        buf.rect(x, big ? hy + 3 : hy + 4, 2, big ? 3 : 2, a.eyeColor);
        buf.px(x, big ? hy + 3 : hy + 4, WHITE);
        break;
      case 'wide':
        buf.rect(x - (i === 0 ? 1 : 0), hy + 4, 3, 2, WHITE);
        buf.rect(ex + (i === 0 ? 0 : 1) + p.look, hy + 4, 1, big ? 2 : 1, a.eyeColor);
        if (big) buf.px(ex + (i === 0 ? 0 : 1) + p.look, hy + 3, a.eyeColor);
        break;
      case 'sleepy':
        buf.span(x, x + 1, hy + 4, shade(a.skin, -0.25));
        buf.span(x, x + 1, hy + 5, a.eyeColor);
        break;
      case 'sparkle':
        buf.rect(x, big ? hy + 3 : hy + 4, 2, big ? 3 : 2, a.eyeColor);
        buf.px(x, big ? hy + 3 : hy + 4, WHITE);
        buf.px(x + 1, hy + 5, shade(a.eyeColor, 0.45));
        break;
    }
  }
}

function drawBrows(buf: PixelBuffer, a: Appearance, hy: number): void {
  if (a.eyebrows === 'none') return;
  const row = a.eyeSize === 2 ? hy + 2 : hy + 3;
  const c = shade(a.hairColor, -0.15);
  for (const [i, ex] of EYE_X.entries()) {
    if (a.eyebrows === 'thin') buf.span(ex, ex + 1, row, c);
    if (a.eyebrows === 'thick') {
      buf.span(ex - (i === 0 ? 1 : 0), ex + 1 + (i === 1 ? 1 : 0), row, c);
    }
    if (a.eyebrows === 'arched') {
      buf.px(i === 0 ? ex : ex + 1, row - 1, c);
      buf.px(i === 0 ? ex + 1 : ex, row, c);
      buf.px(i === 0 ? ex - 1 : ex + 2, row, c);
    }
  }
}

/** Worried brows (inner ends up) — used by the sad face whatever the brow style. */
function drawSadBrows(buf: PixelBuffer, a: Appearance, hy: number): void {
  const row = a.eyeSize === 2 ? hy + 2 : hy + 3;
  const c = shade(a.hairColor, -0.15);
  buf.points([[10, 0], [11, -1], [17, 0], [16, -1]], c, 0, row);
}

function drawNose(buf: PixelBuffer, a: Appearance, hy: number): void {
  const c = shade(a.skin, -0.2);
  if (a.nose === 'dot') buf.px(13, hy + 6, c);
  if (a.nose === 'button') {
    buf.span(13, 14, hy + 6, shade(a.skin, 0.15));
    buf.px(14, hy + 6, c);
  }
}

function drawMouth(buf: PixelBuffer, a: Appearance, hy: number, p: Pose): void {
  const y = hy + 7;
  if (p.mouth === 'sad') {
    buf.points([[12, 1], [13, 0], [14, 0], [15, 1]], MOUTH, 0, y);
    return;
  }
  if (p.mouth === 'open') {
    buf.rect(13, y, 2, 2, MOUTH_IN);
    buf.span(13, 14, y, MOUTH);
    return;
  }
  const style = p.mouth === 'smile' ? 'grin' : a.mouth;
  switch (style) {
    case 'smile':
      buf.points([[12, 0], [13, 1], [14, 1], [15, 0]], MOUTH, 0, y);
      break;
    case 'grin':
      buf.span(12, 15, y, MOUTH);
      buf.span(13, 14, y + 1, MOUTH_IN);
      break;
    case 'small':
      buf.span(13, 14, y + 1, MOUTH);
      break;
    case 'cat':
      buf.points([[11, 0], [12, 1], [13, 0], [14, 0], [15, 1], [16, 0]], MOUTH, 0, y);
      break;
    case 'neutral':
      buf.span(12, 15, y + 1, MOUTH);
      break;
  }
}

function drawDetails(buf: PixelBuffer, a: Appearance, hy: number, p: Pose): void {
  const y = hy + 6;
  const blush = p.blush || a.detail === 'blush' || a.detail === 'blush-freckles';
  if (blush) {
    buf.span(9, 10, y, BLUSH);
    buf.span(17, 18, y, BLUSH);
  }
  const dots = shade(a.skin, -0.28);
  if (a.detail === 'freckles') buf.points([[9, 0], [11, 0], [16, 0], [18, 0]], dots, 0, y);
  if (a.detail === 'blush-freckles') buf.points([[10, 1], [17, 1]], dots, 0, y);
  if (a.detail === 'mole') buf.px(17, y + 1, dots);
}
