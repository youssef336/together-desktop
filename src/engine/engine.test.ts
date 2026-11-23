import { describe, expect, it } from 'vitest';
import { BASE_APPEARANCE, randomizeAppearance } from '../domain/appearance';
import { fillTokens, pickExchange } from '../domain/dialogue';
import { createCharacter, createCouple, exportCharacter, importCharacter } from '../domain/factory';
import { PERSONALITY_PRESETS } from '../domain/personality';
import { BELLO, DEMO_B } from '../domain/templates';
import { composeCharacter } from '../pixel/compose';
import { pose } from '../pixel/pose';
import { ACTIVITIES } from './activities';
import { ActivityRunner, type Stage } from './activity';
import { Actor } from './actor';
import { Animator } from './animator';
import { ALL_CLIPS } from './clips';
import { CoupleScheduler } from './scheduler';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('pixel composer', () => {
  it('draws every clip frame of every template without throwing and with pixels inside the sprite', () => {
    for (const a of [BASE_APPEARANCE, BELLO, DEMO_B]) {
      for (const clip of ALL_CLIPS) {
        for (const f of clip.frames) {
          const box = composeCharacter(a, f.pose).bounds();
          expect(box).not.toBeNull();
          expect(box!.y).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('changes pixels when an appearance part changes (no cosmetic-only fields)', () => {
    const base = composeCharacter(BASE_APPEARANCE, pose({})).cells.join();
    const fields: Partial<typeof BASE_APPEARANCE>[] = [
      { faceShape: 'square' }, { eyeShape: 'wide' }, { eyeSize: 2 }, { eyebrows: 'thick' }, { nose: 'button' },
      { mouth: 'cat' }, { hairStyle: 'long' }, { hairColor: '#ff0000' }, { bodyShape: 'broad' }, { height: 'tall' },
      { top: 'hoodie' }, { bottom: 'skirt' }, { shoes: 'boots' }, { hat: 'crown' }, { glasses: 'sun' },
      { jewelry: 'both' }, { detail: 'freckles' }, { skin: '#7a4a2c' },
    ];
    for (const patch of fields) {
      expect(composeCharacter({ ...BASE_APPEARANCE, ...patch }, pose({})).cells.join(), JSON.stringify(patch)).not.toBe(base);
    }
  });

  it('randomizes one field without touching the others', () => {
    const next = randomizeAppearance(BASE_APPEARANCE, 'hairColor', () => 0.99);
    expect({ ...next, hairColor: BASE_APPEARANCE.hairColor }).toEqual(BASE_APPEARANCE);
  });
});

describe('animator', () => {
  it('returns to the fallback clip after a one-shot', () => {
    const a = new Animator();
    a.play('wave', { force: true });
    for (let i = 0; i < 40; i++) a.update(0.1);
    expect(a.clip).toBe('idle');
  });

  it('does not let a low-priority clip interrupt a running one-shot unless forced', () => {
    const a = new Animator();
    a.play('surprise', { force: true });
    expect(a.play('walk')).toBe(false);
    expect(a.play('walk', { force: true })).toBe(true);
  });
});

describe('dialogue', () => {
  it('prefers fresh lines and fills nicknames', () => {
    const recent = ['casual:0', 'casual:1', 'casual:2', 'casual:3', 'casual:4', 'casual:5'];
    const line = pickExchange('casual', { tone: 'calm', custom: [], disabled: [], recent, rnd: () => 0 });
    expect(line?.key).toBe('casual:6');
    expect(fillTokens('Hi {you}, it is {me}', 'A', 'B')).toBe('Hi B, it is A');
  });

  it('uses custom lines, respects the opener and disabled categories', () => {
    const custom = [{ id: 'x', category: 'romantic' as const, opener: 'b' as const, first: 'Only B says this' }];
    expect(pickExchange('romantic', { tone: 'sweet', custom, disabled: ['romantic'], recent: [], speaker: 'b' })?.first).toBe('Only B says this');
    expect(pickExchange('romantic', { tone: 'sweet', custom, disabled: ['romantic'], recent: [], speaker: 'a' })).toBeNull();
  });
});

describe('characters', () => {
  it('round-trips through export / import with a fresh id', () => {
    const c = createCharacter('Mina', DEMO_B);
    const back = importCharacter(exportCharacter(c));
    expect(back.id).not.toBe(c.id);
    expect(back.appearance).toEqual(c.appearance);
    expect(() => importCharacter('{"hello":1}')).toThrow();
  });
});

describe('scheduler', () => {
  it('never picks the same activity twice in a row and honours cooldowns', () => {
    const couple = createCouple('a', 'b');
    const s = new CoupleScheduler();
    const p = { ...PERSONALITY_PRESETS.Playful!, traits: [] };
    const rnd = seeded(3);
    let now = 0;
    let last: string | null = null;
    for (let i = 0; i < 50; i++) {
      now += 400;
      const id = s.choose({ couple, a: p, b: p, favoritesA: [], favoritesB: [], now, hour: 15, rnd });
      expect(id).not.toBeNull();
      expect(id).not.toBe(last);
      s.record(id!, now);
      last = id;
    }
    expect(s.choose({ couple: { ...couple, enabledActivities: [last as 'hug'] }, a: p, b: p, favoritesA: [], favoritesB: [], now: now + 1, hour: 15, rnd })).toBeNull();
  });

  it('stationary mode only allows talking', () => {
    const couple = { ...createCouple('a', 'b'), behavior: { mode: 'stationary' as const, interactionEverySec: 60 } };
    const p = { ...PERSONALITY_PRESETS.Calm!, traits: [] };
    const id = new CoupleScheduler().choose({ couple, a: p, b: p, favoritesA: [], favoritesB: [], now: 1000, hour: 12 });
    expect(id).toBe('talk');
  });
});

describe('activities', () => {
  const stage = (): Stage & { said: string[] } => {
    const said: string[] = [];
    return {
      said,
      scale: 3,
      bounds: { left: 40, right: 1400, top: 100, bottom: 900 },
      px: (n) => n * 3,
      say: (actor, text) => {
        said.push(`${actor.character.name}: ${text}`);
        actor.say(text, 2);
        return 2;
      },
      exchange: () => ({ first: 'Hello', reply: 'Hi' }),
      effect: () => {},
      rnd: seeded(9),
    };
  };

  for (const def of Object.values(ACTIVITIES)) {
    it(`${def.id} runs to completion and leaves both characters free`, () => {
      const a = new Actor(createCharacter('A', BELLO), 200, 900);
      const b = new Actor(createCharacter('B', DEMO_B), 900, 900);
      const st = stage();
      const run = new ActivityRunner(def, { initiator: a, partner: b, stage: st });
      run.start();
      let t = 0;
      let done = false;
      while (!done && t < 120) {
        a.move(1 / 30, 3);
        b.move(1 / 30, 3);
        a.animator.update(1 / 30);
        b.animator.update(1 / 30);
        done = run.update(1 / 30);
        t += 1 / 30;
      }
      run.finish();
      expect(done).toBe(true);
      expect(a.mode).toBe('free');
      expect(b.mode).toBe('free');
      if (def.id !== 'walk') expect(Math.abs(a.x - b.x)).toBeLessThan(3 * 30); // they actually met
      expect(st.said.length).toBeGreaterThan(0);
    });
  }
});
