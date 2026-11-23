import type { BehaviorMode, Couple } from '../domain/models';
import { type ActivityId, type Personality, weightedPick } from '../domain/personality';
import { ACTIVITIES } from './activities';

// Decides when the couple does something together and what.
// Inputs: personalities, favourites, behaviour mode, cooldowns, recent history and time of day.

const MODE_PACE: Record<BehaviorMode, number> = {
  stationary: 1.6,
  relaxed: 1.3,
  active: 0.8,
  playful: 0.85,
  couple: 0.7,
};

function personalityWeight(id: ActivityId, a: Personality, b: Personality, hour: number): number {
  const avg = (k: keyof Omit<Personality, 'traits' | 'dialogueTone'>) => (a[k] + b[k]) / 2;
  const night = hour >= 22 || hour < 6;
  const morning = hour >= 6 && hour < 11;
  switch (id) {
    case 'hug':
      return 4 + avg('affection') / 10;
    case 'dance':
      return 2 + (avg('playfulness') + avg('energy')) / 25;
    case 'coffee':
      return 5 + (morning ? 6 : 0);
    case 'walk':
      return 3 + avg('energy') / 15;
    case 'sit':
      return 3 + (100 - avg('energy')) / 15;
    case 'sleep':
      return night ? 9 : 0.6 + (100 - avg('energy')) / 60;
    case 'play':
      return 2 + avg('playfulness') / 12;
    case 'talk':
      return 4 + avg('chattiness') / 12;
  }
}

export interface SchedulerInput {
  couple: Couple;
  a: Personality;
  b: Personality;
  favoritesA: ActivityId[];
  favoritesB: ActivityId[];
  now: number; // seconds
  hour: number;
  rnd?: () => number;
}

export class CoupleScheduler {
  private lastRun = new Map<ActivityId, number>();
  private history: ActivityId[] = [];
  nextAt = 0;

  /** Seconds until the next autonomous activity. */
  plan(input: Pick<SchedulerInput, 'couple' | 'now' | 'rnd'>): void {
    const rnd = input.rnd ?? Math.random;
    const base = input.couple.behavior.interactionEverySec * MODE_PACE[input.couple.behavior.mode];
    this.nextAt = input.now + base * (0.7 + rnd() * 0.6);
  }

  record(id: ActivityId, now: number): void {
    this.lastRun.set(id, now);
    this.history = [id, ...this.history].slice(0, 4);
  }

  /** Picks the next activity, or null if nothing is allowed right now. */
  choose(input: SchedulerInput): ActivityId | null {
    const { couple, now } = input;
    const allowed = couple.enabledActivities.filter((id) => {
      if (couple.behavior.mode === 'stationary' && id !== 'talk') return false;
      const last = this.lastRun.get(id);
      return last === undefined || now - last >= ACTIVITIES[id].cooldown;
    });
    if (allowed.length === 0) return null;
    const weights = {} as Record<ActivityId, number>;
    for (const id of allowed) {
      let w = personalityWeight(id, input.a, input.b, input.hour);
      if (couple.favoriteActivities.includes(id)) w *= 2;
      if (input.favoritesA.includes(id)) w *= 1.4;
      if (input.favoritesB.includes(id)) w *= 1.4;
      if (couple.behavior.mode === 'playful' && (id === 'play' || id === 'dance')) w *= 1.8;
      if (couple.behavior.mode === 'couple' && (id === 'hug' || id === 'sit' || id === 'walk')) w *= 1.6;
      if (this.history[0] === id) w *= 0.05; // never the same thing twice in a row
      else if (this.history.includes(id)) w *= 0.5;
      weights[id] = w;
    }
    return weightedPick(weights, input.rnd);
  }

  /** Who starts it: initiative decides, with a little luck. */
  static pickInitiator(a: Personality, b: Personality, rnd: () => number = Math.random): 'a' | 'b' {
    const wa = 10 + a.initiative;
    const wb = 10 + b.initiative;
    return rnd() * (wa + wb) < wa ? 'a' : 'b';
  }
}
