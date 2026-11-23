// Personality drives behaviour, not just words: it weights wandering, speed, how often a character
// starts an activity, which click reactions it picks and which dialogue tone it prefers.

export interface Personality {
  /** 0..100 — how much it moves around and how fast. */
  energy: number;
  /** 0..100 — teasing, jumping, games. */
  playfulness: number;
  /** 0..100 — hugs, hearts, sitting close. */
  affection: number;
  /** 0..100 — blushes, hesitates, needs the partner to start things. */
  shyness: number;
  /** 0..100 — how often a speech bubble appears. */
  chattiness: number;
  /** 0..100 — how often this character starts a couple activity. */
  initiative: number;
  /** Free-text traits the user types (e.g. "loves rainy days"). Shown in the profile; used by AI later. */
  traits: string[];
  dialogueTone: DialogueTone;
}

export const DIALOGUE_TONES = ['sweet', 'playful', 'calm', 'funny', 'shy', 'chaotic', 'supportive'] as const;
export type DialogueTone = (typeof DIALOGUE_TONES)[number];

export const PERSONALITY_PRESETS: Record<string, Omit<Personality, 'traits'>> = {
  Playful: { energy: 75, playfulness: 85, affection: 60, shyness: 20, chattiness: 65, initiative: 75, dialogueTone: 'playful' },
  Calm: { energy: 30, playfulness: 35, affection: 70, shyness: 40, chattiness: 40, initiative: 35, dialogueTone: 'calm' },
  Affectionate: { energy: 50, playfulness: 50, affection: 90, shyness: 30, chattiness: 60, initiative: 60, dialogueTone: 'sweet' },
  Shy: { energy: 35, playfulness: 40, affection: 70, shyness: 85, chattiness: 30, initiative: 25, dialogueTone: 'shy' },
  Chaotic: { energy: 90, playfulness: 90, affection: 55, shyness: 10, chattiness: 80, initiative: 85, dialogueTone: 'chaotic' },
  Funny: { energy: 60, playfulness: 75, affection: 55, shyness: 20, chattiness: 75, initiative: 60, dialogueTone: 'funny' },
  Supportive: { energy: 45, playfulness: 45, affection: 80, shyness: 25, chattiness: 55, initiative: 50, dialogueTone: 'supportive' },
};

export const DEFAULT_PERSONALITY: Personality = { ...PERSONALITY_PRESETS.Calm!, traits: [] };

export const ACTIVITY_IDS = ['coffee', 'hug', 'dance', 'walk', 'sit', 'sleep', 'play', 'talk'] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

export interface Preferences {
  favoriteActivities: ActivityId[];
  favoriteThings: string[];
}

export type ClickReaction = 'wave' | 'jump' | 'heart' | 'talk' | 'surprise' | 'blush';

/** Weighted click reactions — the personality decides the mix. */
export function clickReactionWeights(p: Personality): Record<ClickReaction, number> {
  return {
    wave: 20 + p.chattiness * 0.1,
    jump: 5 + p.energy * 0.3 + p.playfulness * 0.2,
    heart: 5 + p.affection * 0.4,
    talk: 5 + p.chattiness * 0.4,
    surprise: 5 + p.playfulness * 0.2,
    blush: 2 + p.shyness * 0.5,
  };
}

export function weightedPick<K extends string>(weights: Record<K, number>, rnd: () => number = Math.random): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let r = rnd() * total;
  for (const [k, w] of entries) {
    r -= Math.max(0, w);
    if (r <= 0) return k;
  }
  return entries[entries.length - 1]![0];
}

/** Walking speed in logical pixels per second. */
export function walkSpeed(p: Personality): number {
  return 18 + p.energy * 0.22;
}
