import { describe, expect, it } from 'vitest';
import { applyMood, driftMood, MOOD_DEFAULT, MOOD_SAD } from '../../domain/mood';
import { NEEDS_PARTNER, pickQuestion, QUESTIONS } from '../../domain/questions';
import { composeCharacter } from '../../pixel/compose';
import { pose } from '../../pixel/pose';
import { BASE_APPEARANCE } from '../../domain/appearance';
import { FallingField, GAME_SECONDS, scoreFor } from './falling';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('coffee catch field', () => {
  it('a player standing under every drop catches it; nobody catches nothing', () => {
    const f = new FallingField(1200, 3, seeded(4));
    let caught = 0;
    let missed = 0;
    for (let t = 0; t < 20; t += 1 / 60) {
      const target = f.drops[0]?.x ?? 600;
      for (const e of f.step(1 / 60, target, 400, 460, 600)) e.caught ? caught++ : missed++;
    }
    expect(caught).toBeGreaterThan(10);
    const g = new FallingField(1200, 3, seeded(4));
    let gCaught = 0;
    for (let t = 0; t < 20; t += 1 / 60) for (const e of g.step(1 / 60, -9999, 400, 460, 600)) if (e.caught) gCaught++;
    expect(gCaught).toBe(0);
  });

  it('gets harder over the round', () => {
    const f = new FallingField(1200, 3, seeded(2));
    expect(f.heat).toBe(0);
    for (let t = 0; t < GAME_SECONDS; t += 0.1) f.step(0.1, 0, 0, 0, 10_000);
    expect(f.heat).toBe(1);
  });

  it('scores: combo grows cups, hearts heal, broken mugs hurt', () => {
    expect(scoreFor('cup', 0, 3, 3).points).toBe(1);
    expect(scoreFor('cup', 10, 3, 3).points).toBe(3);
    expect(scoreFor('heart', 0, 2, 3)).toEqual({ points: 0, lives: 3 });
    expect(scoreFor('heart', 0, 3, 3)).toEqual({ points: 3, lives: 3 });
    expect(scoreFor('mug', 4, 3, 3).lives).toBe(2);
  });
});

describe('mood', () => {
  it('a hurtful answer makes them sad, comfort brings them back, time heals', () => {
    let m = MOOD_DEFAULT;
    m = applyMood(m, 'answer-hurt', 80);
    m = applyMood(m, 'answer-hurt', 80);
    expect(m).toBeLessThan(MOOD_SAD);
    expect(applyMood(m, 'comforted')).toBeGreaterThan(m);
    expect(driftMood(m, 40 * 100)).toBe(MOOD_DEFAULT);
    expect(applyMood(100, 'game-record')).toBe(100);
  });
});

describe('questions', () => {
  it('solo mode never asks partner questions', () => {
    for (let i = 0; i < 200; i++) {
      const q = pickQuestion({ custom: [], solo: true, recent: [], rnd: seeded(i + 1) });
      expect(NEEDS_PARTNER.has(q.id)).toBe(false);
    }
  });
  it('custom questions join the pool and every built-in has options', () => {
    const q = pickQuestion({ custom: [{ id: 'x', text: 'Eat?', yes: 'Good', no: 'Go eat', noHurts: true }], solo: false, recent: QUESTIONS.map((q) => q.id), rnd: () => 0 });
    expect(q.text).toBe('Eat?');
    for (const b of QUESTIONS) expect(b.options.length).toBeGreaterThanOrEqual(2);
  });
});

describe('sad face', () => {
  it('differs from the neutral face', () => {
    const a = composeCharacter(BASE_APPEARANCE, pose({})).cells.join();
    const b = composeCharacter(BASE_APPEARANCE, pose({ eyes: 'sad', mouth: 'sad' })).cells.join();
    expect(a).not.toBe(b);
  });
});
