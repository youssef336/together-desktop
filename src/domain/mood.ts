// Mood: a small, honest memory of how each character feels about you right now.
// It moves with your answers, games and how you treat them, drifts back to calm over time,
// and changes behaviour: a sad character pouts, walks slower and the partner comes to comfort them.

export const MOOD_DEFAULT = 70;
export const MOOD_SAD = 35;
export const MOOD_HAPPY = 82;

export type MoodCause =
  | 'answer-kind'
  | 'answer-hurt'
  | 'answer-neutral'
  | 'game-played'
  | 'game-record'
  | 'game-lost'
  | 'comforted'
  | 'dragged-a-lot'
  | 'poked'
  | 'ignored';

const DELTA: Record<MoodCause, number> = {
  'answer-kind': 12,
  'answer-hurt': -22,
  'answer-neutral': 2,
  'game-played': 8,
  'game-record': 15,
  'game-lost': -4,
  comforted: 18,
  'dragged-a-lot': -8,
  poked: 1,
  ignored: -3,
};

export function clampMood(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Shy characters feel things a bit more; it is still a nudge, never a punishment loop. */
export function applyMood(current: number, cause: MoodCause, shyness = 50): number {
  const d = DELTA[cause];
  const k = d < 0 ? 0.8 + shyness / 250 : 1;
  return clampMood(current + d * k);
}

/** Drift toward calm: about 1 point per 40 seconds. */
export function driftMood(current: number, seconds: number): number {
  const step = seconds / 40;
  if (current < MOOD_DEFAULT) return clampMood(Math.min(MOOD_DEFAULT, current + step));
  if (current > MOOD_DEFAULT) return clampMood(Math.max(MOOD_DEFAULT, current - step * 0.5));
  return current;
}

export function moodLabel(m: number): { emoji: string; label: string } {
  if (m < 20) return { emoji: '😢', label: 'Heartbroken' };
  if (m < MOOD_SAD) return { emoji: '🥺', label: 'Upset' };
  if (m < 55) return { emoji: '😐', label: 'Meh' };
  if (m < MOOD_HAPPY) return { emoji: '🙂', label: 'Good' };
  return { emoji: '🥰', label: 'So happy' };
}
