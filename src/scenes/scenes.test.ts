import { describe, expect, it } from 'vitest';
import type { Painter } from './paint';
import { paintScene, SCENE_H, SCENE_W, SCENES, spotFor } from './scenes';

const counting = (): Painter & { calls: number; outside: number } => {
  const p = {
    calls: 0,
    outside: 0,
    rect(x: number, y: number, w: number, h: number) {
      p.calls++;
      if (x + w < -60 || y + h < -60 || x > SCENE_W + 60 || y > SCENE_H + 60) p.outside++;
    },
    px(x: number, y: number) {
      p.rect(x, y, 1, 1);
    },
  };
  return p;
};

describe('scenes', () => {
  it('every scene paints, with a footprint for every object, lights on and off', () => {
    for (const def of SCENES) {
      for (const light of [true, false]) {
        const g = counting();
        const feet = paintScene(g, def, 2.5, light);
        expect(feet).toHaveLength(def.objects.length);
        expect(g.calls).toBeGreaterThan(20);
        expect(g.outside).toBe(0);
      }
    }
  });

  it('activities find their place: coffee at a table, naps on a bed or towel, sitting on a seat', () => {
    expect(spotFor(SCENES.find((s) => s.id === 'coffee-shop')!, 'coffee')?.object).toBe('table');
    expect(spotFor(SCENES.find((s) => s.id === 'bedroom')!, 'sleep')?.object).toBe('bed');
    expect(spotFor(SCENES.find((s) => s.id === 'park')!, 'sit')?.object).toBe('bench');
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(8);
  });
});
