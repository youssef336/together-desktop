import type { CustomQuestion } from './models';
import type { MoodCause } from './mood';
import { L, speechLang } from './speech';

// Questions a character asks when you click them. Each answer has a reaction:
// what they say, how they move, how it touches their mood, and sometimes a follow-up
// (an activity or a game) so a "yes" actually leads somewhere.

export type Follow =
  | { kind: 'activity'; id: 'coffee' | 'hug' | 'dance' | 'sleep' | 'walk' | 'talk' }
  | { kind: 'game'; id: 'coffee-catch' | 'heart-pop' | 'copy-me' | 'rps' }
  | { kind: 'partner-hug' };

export interface Reaction {
  say: string;
  clip: 'happy' | 'cheer' | 'blush' | 'pout' | 'surprise' | 'jump' | 'wave';
  mood: MoodCause;
  effect?: 'hearts' | 'cloud' | 'sparkle' | 'sweat';
  follow?: Follow;
}

export interface Question {
  id: string;
  text: string;
  options: { label: string; reaction: Reaction }[];
}

const yesNo = (id: string, text: string, yes: Reaction, no: Reaction): Question => ({
  id,
  text,
  options: [
    { label: id.startsWith('custom:') ? L('Yes', 'آه') : 'Yes', reaction: yes },
    { label: id.startsWith('custom:') ? L('No', 'لأ') : 'No', reaction: no },
  ],
});

export const QUESTIONS: Question[] = [
  yesNo('love', 'Do you love me? 🥺',
    { say: 'I knew it!! ❤️', clip: 'cheer', mood: 'answer-kind', effect: 'hearts' },
    { say: '...oh. 💔', clip: 'pout', mood: 'answer-hurt', effect: 'cloud', follow: { kind: 'partner-hug' } }),
  yesNo('coffee', 'Coffee break? ☕',
    { say: 'Yay, coffee date!', clip: 'jump', mood: 'answer-kind', follow: { kind: 'activity', id: 'coffee' } },
    { say: 'Okay... later then.', clip: 'pout', mood: 'answer-neutral' }),
  yesNo('play', 'Play a game with me? 🎮',
    { say: "Let's go!", clip: 'cheer', mood: 'answer-kind', follow: { kind: 'game', id: 'coffee-catch' } },
    { say: 'Boooring. 😤', clip: 'pout', mood: 'answer-neutral' }),
  yesNo('busy', 'Are you busy?',
    { say: "I'll be quiet. Fighting! 💪", clip: 'wave', mood: 'answer-neutral' },
    { say: 'Then stay with us a bit!', clip: 'happy', mood: 'answer-kind', follow: { kind: 'activity', id: 'dance' } }),
  yesNo('cute', 'Am I cute today?',
    { say: 'Hehe, I know 😳', clip: 'blush', mood: 'answer-kind', effect: 'hearts' },
    { say: 'Rude!! 😤', clip: 'pout', mood: 'answer-hurt', effect: 'cloud' }),
  yesNo('nap', 'Can we take a nap?',
    { say: 'Best idea ever... 😴', clip: 'happy', mood: 'answer-kind', follow: { kind: 'activity', id: 'sleep' } },
    { say: "Fine, I'm awake. Mostly.", clip: 'pout', mood: 'answer-neutral' }),
  yesNo('water', 'Did you drink water today?',
    { say: 'Proud of you! 💧', clip: 'cheer', mood: 'answer-kind', effect: 'sparkle' },
    { say: 'Go drink some. Now. 😠', clip: 'surprise', mood: 'answer-neutral', effect: 'sweat' }),
  yesNo('miss', 'Did you miss me?',
    { say: 'I missed you more ❤️', clip: 'blush', mood: 'answer-kind', effect: 'hearts' },
    { say: "Hmph. I didn't miss you either. (I did.)", clip: 'pout', mood: 'answer-hurt' }),
  {
    id: 'rps',
    text: 'Rock, paper, scissors with me?',
    options: [
      { label: 'Sure!', reaction: { say: 'Ready...', clip: 'happy', mood: 'answer-kind', follow: { kind: 'game', id: 'rps' } } },
      { label: 'Not now', reaction: { say: 'Scared? 😏', clip: 'wave', mood: 'answer-neutral' } },
    ],
  },
  {
    id: 'hug',
    text: 'Should I go hug them?',
    options: [
      { label: 'Go!', reaction: { say: 'On my way ❤️', clip: 'jump', mood: 'answer-kind', follow: { kind: 'activity', id: 'hug' } } },
      { label: 'Not yet', reaction: { say: '...shy now. 😳', clip: 'blush', mood: 'answer-neutral' } },
    ],
  },
];

/** The built-in questions in Egyptian Arabic: the question, then each answer's label and reply, in order. */
const QUESTIONS_EG: Record<string, { text: string; options: [label: string, say: string][] }> = {
  love: { text: 'بتحبني؟ 🥺', options: [['آه', 'كنت عارف!! ❤️'], ['لأ', '...أه. 💔']] },
  coffee: { text: 'بريك قهوة؟ ☕', options: [['آه', 'ييي، ديت قهوة!'], ['لأ', 'طيب... بعدين.']] },
  play: { text: 'تلعب معايا؟ 🎮', options: [['آه', 'يلا بينا!'], ['لأ', 'مملل. 😤']] },
  busy: { text: 'إنت مشغول؟', options: [['آه', 'هسكت. شد حيلك! 💪'], ['لأ', 'خلاص اقعد معانا شوية!']] },
  cute: { text: 'أنا كيوت النهارده؟', options: [['آه', 'هيهي، عارف 😳'], ['لأ', 'قليل الذوق!! 😤']] },
  nap: { text: 'ننام شوية؟', options: [['آه', 'أحلى فكرة... 😴'], ['لأ', 'ماشي، أنا صاحي. تقريبًا.']] },
  water: { text: 'شربت مية النهارده؟', options: [['آه', 'فخور بيك! 💧'], ['لأ', 'قوم اشرب. حالًا. 😠']] },
  miss: { text: 'وحشتك؟', options: [['آه', 'إنت وحشتني أكتر ❤️'], ['لأ', 'هممف. وإنت كمان موحشتنيش. (وحشتني.)']] },
  rps: { text: 'حجرة ورقة مقص معايا؟', options: [['أكيد!', 'جاهز...'], ['مش دلوقتي', 'خايف؟ 😏']] },
  hug: { text: 'أروح أحضنه؟', options: [['روح!', 'جاي ❤️'], ['لسه', '...اتكسفت. 😳']] },
};

/** The question in the language they speak now (custom questions are shown as written). */
export function localize(q: Question): Question {
  const eg = speechLang() === 'eg' ? QUESTIONS_EG[q.id] : undefined;
  if (!eg) return q;
  return {
    ...q,
    text: eg.text,
    options: q.options.map((o, i) => {
      const [label, say] = eg.options[i] ?? [o.label, o.reaction.say];
      return { label, reaction: { ...o.reaction, say } };
    }),
  };
}

/** Questions that need the partner on screen. */
export const NEEDS_PARTNER = new Set(['hug', 'coffee', 'nap']);

export function customToQuestion(q: CustomQuestion): Question {
  return yesNo(
    `custom:${q.id}`,
    q.text,
    { say: q.yes || '❤️', clip: 'happy', mood: 'answer-kind', effect: 'hearts' },
    q.noHurts
      ? { say: q.no || L('...okay. 💔', '...ماشي. 💔'), clip: 'pout', mood: 'answer-hurt', effect: 'cloud', follow: { kind: 'partner-hug' } }
      : { say: q.no || L('Okay!', 'ماشي!'), clip: 'wave', mood: 'answer-neutral' },
  );
}

export function pickQuestion(opts: { custom: CustomQuestion[]; solo: boolean; recent: string[]; rnd?: () => number }): Question {
  const rnd = opts.rnd ?? Math.random;
  const pool = [
    ...QUESTIONS.filter((q) => !(opts.solo && NEEDS_PARTNER.has(q.id))),
    ...opts.custom.flatMap((q) => [customToQuestion(q), customToQuestion(q)]),
  ];
  const fresh = pool.filter((q) => !opts.recent.includes(q.id));
  const from = fresh.length > 0 ? fresh : pool;
  return localize(from[Math.floor(rnd() * from.length)]!);
}
