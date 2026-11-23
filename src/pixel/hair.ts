import type { Appearance } from '../domain/appearance';
import { type PixelBuffer, shade } from './buffer';
import type { Layout } from './layout';

const EXTRA = { short: 0, medium: 3, long: 7 } as const;

/** Hair drawn behind the head and body (long hair, tails, buns). */
export function drawHairBack(buf: PixelBuffer, a: Appearance, l: Layout): void {
  const c = a.hairColor;
  const d = shade(c, -0.18);
  const y = l.hy;
  const ext = EXTRA[a.hairLength];
  switch (a.hairStyle) {
    case 'bob':
      for (let r = 0; r < 10 + Math.min(ext, 3); r++) buf.span(7, 20, y + r, r >= 9 ? d : c);
      break;
    case 'long':
      for (let r = 0; r < 11 + ext; r++) {
        const grow = r > 10 ? 1 : 0;
        buf.span(7 - grow, 20 + grow, y + r, r >= 10 + ext ? d : c);
      }
      break;
    case 'ponytail':
      for (let r = 2; r < 9 + ext; r++) buf.span(20, r > 6 + ext ? 21 : 22, y + r, r > 4 ? d : c);
      break;
    case 'twin-tails':
      for (let r = 2; r < 9 + ext; r++) {
        const taper = r > 6 + ext ? 1 : 0;
        buf.span(4 + taper, 6, y + r, c);
        buf.span(21, 23 - taper, y + r, d);
      }
      break;
    case 'bun':
      buf.span(11, 16, y - 4, c);
      buf.span(10, 17, y - 3, c);
      buf.span(10, 17, y - 2, d);
      buf.span(10, 17, y - 1, c);
      break;
    case 'curly':
      for (let r = -1; r < 7 + ext; r++) {
        const bump = (r & 1) === 0 ? 0 : 1;
        buf.span(6 + bump, 21 - bump, y + r, r > 5 ? d : c);
      }
      break;
    default:
      break;
  }
}

/** Hair drawn over the head: crown and bangs. */
export function drawHairFront(buf: PixelBuffer, a: Appearance, l: Layout): void {
  const c = a.hairColor;
  const d = shade(c, -0.18);
  const hi = shade(c, 0.2);
  const y = l.hy;
  const ext = EXTRA[a.hairLength];
  const crown = () => {
    buf.span(9, 18, y - 1, c);
    buf.span(8, 19, y, c);
    buf.span(8, 19, y + 1, c);
    buf.span(10, 11, y, hi);
  };
  switch (a.hairStyle) {
    case 'bald':
      buf.px(10, y + 1, shade(a.skin, 0.25));
      return;
    case 'buzz':
      buf.span(10, 17, y - 1, shade(c, 0.12));
      buf.span(8, 19, y, shade(c, 0.12));
      buf.points([[8, 1], [19, 1]], shade(c, 0.12), 0, y);
      return;
    case 'short':
      crown();
      buf.span(8, 11, y + 2, c);
      buf.span(16, 19, y + 2, c);
      buf.px(13, y + 2, c);
      buf.points([[8, 3], [8, 4], [19, 3], [19, 4]], d, 0, y);
      return;
    case 'messy':
      crown();
      buf.points([[9, -2], [12, -2], [13, -3], [16, -2], [19, -1], [7, 0]], c, 0, y);
      buf.points([[8, 2], [9, 2], [10, 2], [12, 2], [14, 2], [15, 2], [17, 2], [18, 2], [19, 2], [10, 3], [15, 3]], c, 0, y);
      buf.points([[8, 3], [19, 3]], d, 0, y);
      return;
    case 'side-part':
      crown();
      buf.span(8, 13, y + 2, c);
      buf.span(8, 11, y + 3, c);
      buf.px(8, y + 4, d);
      buf.span(18, 19, y + 2, c);
      buf.px(15, y - 1, d);
      return;
    case 'bob':
    case 'bun':
      crown();
      buf.span(8, 19, y + 2, c);
      if (a.hairStyle === 'bob') {
        for (let r = 3; r < 9; r++) {
          buf.px(8, y + r, c);
          buf.px(19, y + r, d);
        }
      }
      return;
    case 'long':
      crown();
      buf.span(8, 12, y + 2, c);
      buf.span(17, 19, y + 2, c);
      for (let r = 3; r < 9 + Math.min(ext, 4); r++) {
        buf.px(7, y + r, c);
        buf.px(8, y + r, r < 9 ? c : d);
        buf.px(19, y + r, r < 9 ? c : d);
        buf.px(20, y + r, d);
      }
      return;
    case 'ponytail':
    case 'twin-tails':
      crown();
      buf.span(8, 10, y + 2, c);
      buf.span(15, 19, y + 2, c);
      buf.px(8, y + 3, d);
      buf.px(19, y + 3, d);
      if (a.hairStyle === 'ponytail') buf.px(20, y + 2, a.hatColor);
      else {
        buf.px(6, y + 2, a.hatColor);
        buf.px(21, y + 2, a.hatColor);
      }
      return;
    case 'curly':
      for (let x = 9; x <= 18; x += 2) buf.px(x, y - 2, c);
      buf.span(8, 19, y - 1, c);
      buf.span(7, 20, y, c);
      buf.span(7, 20, y + 1, c);
      buf.points([[8, 2], [9, 2], [11, 2], [12, 2], [15, 2], [16, 2], [18, 2], [19, 2]], c, 0, y);
      buf.points([[10, 0], [14, 1], [17, -1]], hi, 0, y);
      for (let r = 2; r < 7; r++) {
        buf.px(6, y + r, c);
        buf.px(7, y + r, d);
        buf.px(20, y + r, d);
        buf.px(21, y + r, c);
      }
      return;
  }
}
