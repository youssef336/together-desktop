import type { Appearance } from '../domain/appearance';
import { type PixelBuffer, shade } from './buffer';
import type { Layout } from './layout';

const GOLD = '#f2c94c';
const GEM = '#d95763';
const FRAME = '#3a2a35';
const LENS = '#2f2b3a';

export function drawHat(buf: PixelBuffer, a: Appearance, l: Layout): void {
  const c = a.hatColor;
  const y = l.hy;
  switch (a.hat) {
    case 'beanie':
      buf.span(9, 18, y - 2, c);
      buf.span(8, 19, y - 1, c);
      buf.span(7, 20, y, c);
      buf.span(7, 20, y + 1, shade(c, -0.18));
      buf.span(13, 14, y - 3, shade(c, 0.35));
      break;
    case 'cap':
      buf.span(9, 18, y - 2, c);
      buf.span(8, 19, y - 1, c);
      buf.span(8, 19, y, c);
      buf.span(7, 20, y + 1, shade(c, -0.22));
      buf.px(13, y - 1, '#fbf6ee');
      break;
    case 'bow':
      buf.points([[15, -1], [15, 0], [15, 1], [16, 0], [18, -1], [18, 0], [18, 1], [16, -1], [17, 1]], c, 0, y);
      buf.px(17, y, shade(c, -0.25));
      break;
    case 'flower':
      buf.points([[16, 0], [18, 0], [17, -1], [17, 1]], c, 0, y);
      buf.px(17, y, GOLD);
      break;
    case 'crown':
      buf.span(9, 18, y - 1, GOLD);
      buf.points([[9, -2], [9, -3], [13, -2], [14, -2], [13, -3], [14, -3], [18, -2], [18, -3], [11, -2], [16, -2]], GOLD, 0, y);
      buf.span(13, 14, y - 1, GEM);
      break;
    case 'none':
      break;
  }
}

export function drawGlasses(buf: PixelBuffer, a: Appearance, l: Layout): void {
  if (a.glasses === 'none') return;
  const top = l.hy + 3;
  for (const x0 of [9, 15]) {
    if (a.glasses === 'sun') buf.rect(x0, top + 1, 4, 2, LENS);
    buf.span(x0 + (a.glasses === 'round' ? 1 : 0), x0 + 3 - (a.glasses === 'round' ? 1 : 0), top, FRAME);
    buf.span(x0 + (a.glasses === 'round' ? 1 : 0), x0 + 3 - (a.glasses === 'round' ? 1 : 0), top + 3, FRAME);
    buf.px(x0, top + 1, FRAME);
    buf.px(x0, top + 2, FRAME);
    buf.px(x0 + 3, top + 1, FRAME);
    buf.px(x0 + 3, top + 2, FRAME);
    if (a.glasses === 'sun') buf.px(x0 + 1, top + 1, '#8c8aa0');
  }
  buf.span(13, 14, top + 1, FRAME);
}

export function drawJewelry(buf: PixelBuffer, a: Appearance, l: Layout): void {
  const c = a.jewelryColor;
  if (a.jewelry === 'earrings' || a.jewelry === 'both') {
    buf.px(7, l.hy + 6, c);
    buf.px(20, l.hy + 6, c);
  }
  if (a.jewelry === 'necklace' || a.jewelry === 'both') {
    buf.points([[12, 0], [15, 0], [13, 1], [14, 1]], c, 0, l.ty);
  }
}
