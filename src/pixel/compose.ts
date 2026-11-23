import type { Appearance } from '../domain/appearance';
import { drawGlasses, drawHat, drawJewelry } from './accessories';
import { drawArms, drawCup, drawHead, drawLegs, drawSkirt, drawTorso } from './body';
import { PixelBuffer } from './buffer';
import { drawFace } from './face';
import { drawHairBack, drawHairFront } from './hair';
import { layoutFor, SPRITE_H, SPRITE_W } from './layout';
import type { Pose } from './pose';

export const OUTLINE = '#3a2a35';

/**
 * Composes one frame of a character. Layer order matters:
 * back hair → legs → torso → skirt → arms → head → face → front hair → hat → glasses → jewelry → cup → outline.
 */
export function composeCharacter(a: Appearance, p: Pose): PixelBuffer {
  const buf = new PixelBuffer(SPRITE_W, SPRITE_H);
  const l = layoutFor(a, p);
  drawHairBack(buf, a, l);
  drawLegs(buf, a, l, p);
  drawTorso(buf, a, l);
  drawSkirt(buf, a, l);
  const cup = drawArms(buf, a, l, p);
  drawHead(buf, a, l);
  drawFace(buf, a, l, p);
  drawHairFront(buf, a, l);
  drawHat(buf, a, l);
  drawGlasses(buf, a, l);
  drawJewelry(buf, a, l);
  if (cup) drawCup(buf, cup);
  buf.outline(OUTLINE);
  return buf;
}
