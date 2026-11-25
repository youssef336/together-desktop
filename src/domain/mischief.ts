// Mischief: an opt-in, per-character "teasing" mode. When it is on, now and then the character
// sneaks up on your mouse, grabs the cursor and runs off with it (and won't give it back until you
// catch them), or climbs up and closes your browser tab. Off for everyone by default.

import type { WorldSettings } from './models';
import { speechLang } from './speech';

export type MischiefPace = 'rare' | 'sometimes' | 'often';

export interface MischiefPrefs {
  /** Sneak up, grab the cursor and run away with it. */
  grab: boolean;
  /** Close the front browser tab (only when a browser is the front app). */
  tab: boolean;
  pace: MischiefPace;
}

export const MISCHIEF_OFF: MischiefPrefs = { grab: false, tab: false, pace: 'sometimes' };

export const PACE_LABEL: Record<MischiefPace, string> = {
  rare: 'Rarely (~20 min)',
  sometimes: 'Sometimes (~8 min)',
  often: 'Often (~3 min)',
};

/** Average minutes between two pranks of one character. */
const PACE_MINUTES: Record<MischiefPace, number> = { rare: 20, sometimes: 8, often: 3 };

export function mischiefOf(settings: Pick<WorldSettings, 'mischief'> | undefined, characterId: string): MischiefPrefs {
  return { ...MISCHIEF_OFF, ...(settings?.mischief?.[characterId] ?? {}) };
}

export function isNaughty(p: MischiefPrefs): boolean {
  return p.grab || p.tab;
}

/** Seconds until the next prank: the pace's average with ±40 % jitter, never under a minute. */
export function nextPrankIn(p: MischiefPrefs, rnd: () => number = Math.random): number {
  const avg = PACE_MINUTES[p.pace] * 60;
  return Math.max(60, avg * (0.6 + rnd() * 0.8));
}

/** Which prank to play. `null` = nothing enabled. */
export function pickPrank(p: MischiefPrefs, rnd: () => number = Math.random): 'grab' | 'tab' | null {
  if (p.grab && p.tab) return rnd() < 0.7 ? 'grab' : 'tab';
  if (p.grab) return 'grab';
  if (p.tab) return 'tab';
  return null;
}

/** Clicks it takes to get the mouse back: 2 for a calm character, up to 4 for a very playful one. */
export function tugsToRelease(playfulness: number): number {
  return 2 + Math.round(Math.max(0, Math.min(100, playfulness)) / 50);
}

export const MISCHIEF_LINES = {
  sneak: ['Hehe… 😈', 'Ooh, a mouse 👀', 'Don’t move…', '*tiptoe* 🤫'],
  grab: ['Got it! 😈', 'Mine now! 🖱️', 'Hehehe 😝', 'Catch me if you can!'],
  tug: ['Nope! 😝', 'Mine!!', 'Not giving it back 😜', 'Too slow!', 'Hehe, no~'],
  taunt: ['Looking for this? 🖱️', 'Wheee! 🏃', 'Come get it!', 'Lalala~ 🎶'],
  caught: ['Fiiine, take it 😒', 'Okay okay, you win 🙈', 'Hmph. Here 😤'],
  bored: ['Boring, take it back 🙄', 'Here, I’m done 😌'],
  escaped: ['You’re too fast! 😤', 'Hmph, next time…'],
  tabWarn: ['Bye bye, tab! 👋😈', 'This tab? Gone. 😈', 'Watch this… 😏'],
  tabCancel: ['Okay okay… 😇', 'Fine, I’ll leave it 🙄'],
  tabClosed: ['Oops 😜', 'Hehe, it’s gone! 😈', 'Back to me now 💕'],
  tabNone: ['No tab to steal… 🙄', 'Hmm, nothing to close 🤔'],
  partnerScold: ['Hey! Give it back! 😠', 'That\u2019s not yours! 😤', 'Stop it, {thief}! 😅'],
  partnerProud: ['Hehe, that\u2019s my partner 😏', 'Run, {thief}, run! 🏃'],
  tabDenied: ['I can’t reach your tabs 🥺 (allow me in System Settings)'],
} as const;

export const MISCHIEF_LINES_EG: Record<keyof typeof MISCHIEF_LINES, readonly string[]> = {
  sneak: ['هيهي… 😈', 'أوه، ماوس 👀', 'متتحركش…', '*على طراطيف صوابعي* 🤫'],
  grab: ['مسكته! 😈', 'بقى بتاعي! 🖱️', 'هيهيهي 😝', 'امسكني لو تقدر!'],
  tug: ['لأ! 😝', 'بتاعي!!', 'مش هرجعه 😜', 'بطيء أوي!', 'هيهي، لأ~'],
  taunt: ['بتدور على ده؟ 🖱️', 'وييي! 🏃', 'تعالى خده!', 'لالالا~ 🎶'],
  caught: ['خلاص خده 😒', 'ماشي ماشي، كسبت 🙈', 'هممف. اتفضل 😤'],
  bored: ['زهقت، خده 🙄', 'اتفضل، خلصت 😌'],
  escaped: ['إنت سريع أوي! 😤', 'هممف، المرة الجاية…'],
  tabWarn: ['باي باي يا تاب! 👋😈', 'التاب ده؟ راح. 😈', 'بص بقى… 😏'],
  tabCancel: ['ماشي ماشي… 😇', 'خلاص، هسيبه 🙄'],
  tabClosed: ['أوبس 😜', 'هيهي، راح! 😈', 'رجعتلي بقى 💕'],
  tabNone: ['مفيش تاب أسرقه… 🙄', 'هممم، مفيش حاجة أقفلها 🤔'],
  partnerScold: ['رجّعه! 😠', 'ده مش بتاعك! 😤', 'بطّل يا {thief}! 😅'],
  partnerProud: ['هيهي، ده حبيبي 😏', 'اجري يا {thief}، اجري! 🏃'],
  tabDenied: ['مش طايل التابات 🥺 (اسمحلي من System Settings)'],
};

export function line(kind: keyof typeof MISCHIEF_LINES, rnd: () => number = Math.random): string {
  const list = speechLang() === 'eg' ? MISCHIEF_LINES_EG[kind] : MISCHIEF_LINES[kind];
  return list[Math.floor(rnd() * list.length)]!;
}
