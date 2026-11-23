import { describe, expect, it } from 'vitest';
import { SCENE_H, SCENE_W } from '../scenes/scenes';
import { type Corner, SceneLayer } from './scene-layer';

const view = { w: 1728, h: 1080 };

function layerAt(x: number, y: number, scale: number): SceneLayer {
  const l = new SceneLayer();
  l.def = { id: 'park', objects: [] } as never;
  l.scale = scale;
  l.rect = { x, y, w: Math.round(SCENE_W * scale), h: Math.round(SCENE_H * scale) };
  return l;
}

describe('scene corners', () => {
  const corners: Corner[] = ['nw', 'ne', 'sw', 'se'];

  it('finds every corner and nothing in the middle', () => {
    const l = layerAt(400, 500, 3);
    const r = l.rect;
    expect(l.handleAt(r.x + 2, r.y + 2)).toBe('nw');
    expect(l.handleAt(r.x + r.w - 2, r.y + 2)).toBe('ne');
    expect(l.handleAt(r.x + 2, r.y + r.h - 2)).toBe('sw');
    expect(l.handleAt(r.x + r.w - 2, r.y + r.h - 2)).toBe('se');
    expect(l.handleAt(r.x + r.w / 2, r.y + r.h / 2)).toBeNull();
  });

  it.each(corners)('resizing from %s keeps the opposite corner fixed', (c) => {
    const l = layerAt(400, 500, 3);
    const r = { ...l.rect };
    const west = c === 'nw' || c === 'sw';
    const north = c === 'nw' || c === 'ne';
    const anchor = { x: west ? r.x + r.w : r.x, y: north ? r.y + r.h : r.y };
    l.resizeTo(4, view, c, anchor);
    expect(l.scale).toBe(4);
    const opp = { x: west ? l.rect.x + l.rect.w : l.rect.x, y: north ? l.rect.y + l.rect.h : l.rect.y };
    expect(opp.x).toBeCloseTo(anchor.x, 0);
    expect(opp.y).toBeCloseTo(anchor.y, 0);
  });
});
