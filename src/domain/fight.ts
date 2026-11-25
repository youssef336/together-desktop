// What they say when they fight and make up. `{you}` is the other one's name.
// Kept silly on purpose: a fight here is a cartoon, never cruel, and it always ends in a hug.

export const SPARK = [
  '{you}!! You ate my fries?!',
  'Did you just finish the series WITHOUT me?!',
  'Who left the cup on the table AGAIN?',
  "You said I look 'fine'?! FINE?!",
  'That was MY slipper, {you}!',
  'Stop stealing the blanket!',
  'You liked her photo?! 😤',
  'You forgot what day it is, didn’t you?!',
  'Why is my charger in YOUR bag?!',
  'You told me you were "5 minutes away" an HOUR ago!',
] as const;

export const RETORT = ['Excuse me?!', "Oh, it's ON.", 'Say that again!', 'YOU started it!', 'Wow. Just wow.', 'Ohhh you did NOT.'] as const;

export const OUCH = ['OW!', 'Hey!!', 'OUCH!', "That's it!", 'You’ll pay for that!', 'Not the face!'] as const;

export const TAUNT = ['Missed me! 😜', 'Too slow!', 'Ha! Nope!', 'Is that all? 😏'] as const;

export const THROW_CALL = ['Catch THIS!', 'Take that!', 'Incoming!', 'Heads up!'] as const;

export const CHASE_CALL = ['Come HERE! 🩴', 'Don’t you run from me!', 'You can run but you can’t hide!'] as const;

export const FLEE_CALL = ['Nooo! 😱', 'Help!!', "I'm sorry I'm sorry!"] as const;

/** Grawlix: cartoon cursing from inside the dust cloud. */
export const GRAWLIX = ['#@$%!', '*&%#!!', '@#!*%', '!!$#&@'] as const;

export const SULK = ['Hmph!', 'Not talking to you.', 'Whatever 😤', "I'm not looking at you.", '...', 'Fine. FINE.'] as const;

export const SORRY = ["I'm sorry... 🥺", 'Hey… I was wrong.', 'Can we stop fighting?', 'I brought you this 🌹'] as const;

export const REFUSE = ['Hmph.', 'No.', 'Go away.', '...still mad.', "I'm not listening 🙉"] as const;

export const RETRY = ['Pleeease? 🥺', "I'll buy you fries 🍟", 'You can pick the movie…', 'Look, a silly face! 🤪', "I'll do the dishes. For a WEEK."] as const;

export const SOFTEN = ['...fine.', 'Okay. Come here.', "You're lucky I love you.", "Only because you're cute.", 'Ugh… I missed you.'] as const;

export const MADE_UP = ['I love you, silly ❤️', 'Never again? …until tomorrow 😂', 'Friends again? ❤️', 'Best couple ever ✨'] as const;

export function pickLine(lines: readonly string[], rnd: () => number, you = ''): string {
  return lines[Math.floor(rnd() * lines.length)]!.replaceAll('{you}', you);
}

export const ROUND_KINDS = ['throw', 'punch', 'brawl', 'chase', 'pillow'] as const;
export type RoundKind = (typeof ROUND_KINDS)[number];

/**
 * Two or three different rounds per fight. There is always a throwing round
 * (they throw things at each other from across the room); the rest are random.
 */
export function pickRounds(rnd: () => number): RoundKind[] {
  const others = ROUND_KINDS.filter((k) => k !== 'throw').map((k) => ({ k, r: rnd() }));
  others.sort((a, b) => a.r - b.r);
  const extra = others.slice(0, rnd() < 0.55 ? 2 : 1).map((o) => o.k);
  const at = Math.floor(rnd() * (extra.length + 1));
  return [...extra.slice(0, at), 'throw', ...extra.slice(at)];
}

/** Who says sorry first: the more affectionate one, with a little luck. */
export function pickApologizer(a: { affection: number; initiative: number }, b: { affection: number; initiative: number }, rnd: () => number): 'a' | 'b' {
  const wa = 10 + a.affection + a.initiative / 2;
  const wb = 10 + b.affection + b.initiative / 2;
  return rnd() * (wa + wb) < wa ? 'a' : 'b';
}
