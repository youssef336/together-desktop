import { type Lines, pick } from './speech';

// What they say when they fight and make up. `{you}` is the other one's name.
// Every list is in English and Egyptian Arabic (domain/speech.ts).
// Kept silly on purpose: a fight here is a cartoon, never cruel, and it always ends in a hug.

export const SPARK: Lines = {
  en: [
    '{you}!! You ate my fries?!',
    'Did you just finish the series WITHOUT me?!',
    'Who left the cup on the table AGAIN?',
    "You said I look 'fine'?! FINE?!",
    'That was MY slipper, {you}!',
    'Stop stealing the blanket!',
    'You liked her photo?! 😤',
    'You forgot what day it is, didn’t you?!',
    'Why is my charger in YOUR bag?!',
    'You said "5 minutes away" an HOUR ago!',
  ],
  eg: [
    'يا {you}!! إنت كلت البطاطس بتاعتي؟!',
    'إنت كملت المسلسل من غيري؟!',
    'مين ساب الكوباية على الترابيزة تاني؟!',
    'قلتلي شكلي "عادي"؟! عادي؟!',
    'ده الشبشب بتاعي يا {you}!',
    'بطّل تشد البطانية كلها!',
    'إنت عامل لايك على صورتها؟! 😤',
    'إنت ناسي النهارده إيه، صح؟!',
    'الشاحن بتاعي بيعمل إيه في شنطتك؟!',
    'قلتلي "خمس دقايق وجاي" من ساعة!',
  ],
};

export const RETORT: Lines = {
  en: ['Excuse me?!', "Oh, it's ON.", 'Say that again!', 'YOU started it!', 'Wow. Just wow.', 'Ohhh you did NOT.'],
  eg: ['نعم يا أخويا؟!', 'آه كده بقى؟ ماشي.', 'قولها تاني كده!', 'إنت اللي بدأت!', 'لا ده إنت زودتها.', 'إنت متأكد من اللي بتقوله؟!'],
};

export const OUCH: Lines = {
  en: ['OW!', 'Hey!!', 'OUCH!', "That's it!", 'You’ll pay for that!', 'Not the face!'],
  eg: ['آآآه!', 'إيه ده!!', 'آي!', 'كده؟! ماشي!', 'هتدفع التمن!', 'مش في الوش!'],
};

export const TAUNT: Lines = {
  en: ['Missed me! 😜', 'Too slow!', 'Ha! Nope!', 'Is that all? 😏'],
  eg: ['مجتش فيا! 😜', 'بطيء أوي!', 'هاها! لأ!', 'هو ده آخرك؟ 😏'],
};

export const THROW_CALL: Lines = {
  en: ['Catch THIS!', 'Take that!', 'Incoming!', 'Heads up!'],
  eg: ['خد دي!', 'استلم!', 'حاسب!', 'جاتلك أهي!'],
};

export const CHASE_CALL: Lines = {
  en: ['Come HERE! 🩴', 'Don’t you run from me!', 'You can run but you can’t hide!'],
  eg: ['تعالى هنا! 🩴', 'متجريش مني!', 'هتروح مني فين؟!'],
};

export const FLEE_CALL: Lines = {
  en: ['Nooo! 😱', 'Help!!', "I'm sorry I'm sorry!"],
  eg: ['لأأأ! 😱', 'الحقوني!!', 'آسف آسف آسف!'],
};

/** Grawlix: cartoon cursing from inside the dust cloud (the same in every language). */
export const GRAWLIX: Lines = {
  en: ['#@$%!', '*&%#!!', '@#!*%', '!!$#&@'],
  eg: ['#@$%!', '*&%#!!', '@#!*%', '!!$#&@'],
};

export const SULK: Lines = {
  en: ['Hmph!', 'Not talking to you.', 'Whatever 😤', "I'm not looking at you.", '...', 'Fine. FINE.'],
  eg: ['هممف!', 'مش بكلمك.', 'براحتك 😤', 'مش هبصلك.', '...', 'خلاص. خلاص بقى.'],
};

export const SORRY: Lines = {
  en: ["I'm sorry... 🥺", 'Hey… I was wrong.', 'Can we stop fighting?', 'I brought you this 🌹'],
  eg: ['أنا آسف... 🥺', 'بص… أنا غلطان.', 'خلاص بقى، كفاية خناق؟', 'جبتلك دي 🌹'],
};

export const REFUSE: Lines = {
  en: ['Hmph.', 'No.', 'Go away.', '...still mad.', "I'm not listening 🙉"],
  eg: ['هممف.', 'لأ.', 'امشي.', '...لسه زعلان.', 'مش سامع 🙉'],
};

export const RETRY: Lines = {
  en: ['Pleeease? 🥺', "I'll buy you fries 🍟", 'You can pick the movie…', 'Look, a silly face! 🤪', "I'll do the dishes. For a WEEK."],
  eg: ['عشان خاطري؟ 🥺', 'هجيبلك بطاطس 🍟', 'إنت اللي تختار الفيلم…', 'بص الوش ده! 🤪', 'هغسل المواعين. أسبوع كامل.'],
};

export const SOFTEN: Lines = {
  en: ['...fine.', 'Okay. Come here.', "You're lucky I love you.", "Only because you're cute.", 'Ugh… I missed you.'],
  eg: ['...ماشي.', 'طب تعالى.', 'إنت محظوظ إني بحبك.', 'عشان إنت كيوت بس.', 'أوف… وحشتني.'],
};

export const MADE_UP: Lines = {
  en: ['I love you, silly ❤️', 'Never again? …until tomorrow 😂', 'Friends again? ❤️', 'Best couple ever ✨'],
  eg: ['بحبك يا مجنون ❤️', 'مش هنتخانق تاني؟ …لحد بكرة 😂', 'صافي يا لبن؟ ❤️', 'أحلى اتنين في الدنيا ✨'],
};

/** Picks a line in the language they speak now and fills in `{you}`. */
export function pickLine(lines: Lines, rnd: () => number, you = ''): string {
  return pick(lines, rnd).replaceAll('{you}', you);
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
