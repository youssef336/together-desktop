// What they say when they fight and make up. `{you}` is the other one's name.
// Kept silly on purpose: a fight here is a cartoon, never cruel, and it always ends in a hug.

export const SPARK = [
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
] as const;

export const RETORT = ['نعم يا أخويا؟!', 'آه كده بقى؟ ماشي.', 'قولها تاني كده!', 'إنت اللي بدأت!', 'لا ده إنت زودتها.', 'إنت متأكد من اللي بتقوله؟!'] as const;

export const OUCH = ['آآآه!', 'إيه ده!!', 'آي!', 'كده؟! ماشي!', 'هتدفع التمن!', 'مش في الوش!'] as const;

export const TAUNT = ['مجتش فيا! 😜', 'بطيء أوي!', 'هاها! لأ!', 'هو ده آخرك؟ 😏'] as const;

export const THROW_CALL = ['خد دي!', 'استلم!', 'حاسب!', 'جاتلك أهي!'] as const;

export const CHASE_CALL = ['تعالى هنا! 🩴', 'متجريش مني!', 'هتروح مني فين؟!'] as const;

export const FLEE_CALL = ['لأأأ! 😱', 'الحقوني!!', 'آسف آسف آسف!'] as const;

/** Grawlix: cartoon cursing from inside the dust cloud. */
export const GRAWLIX = ['#@$%!', '*&%#!!', '@#!*%', '!!$#&@'] as const;

export const SULK = ['هممف!', 'مش بكلمك.', 'براحتك 😤', 'مش هبصلك.', '...', 'خلاص. خلاص بقى.'] as const;

export const SORRY = ['أنا آسف... 🥺', 'بص… أنا غلطان.', 'خلاص بقى، كفاية خناق؟', 'جبتلك دي 🌹'] as const;

export const REFUSE = ['هممف.', 'لأ.', 'امشي.', '...لسه زعلان.', 'مش سامع 🙉'] as const;

export const RETRY = ['عشان خاطري؟ 🥺', 'هجيبلك بطاطس 🍟', 'إنت اللي تختار الفيلم…', 'بص الوش ده! 🤪', 'هغسل المواعين. أسبوع كامل.'] as const;

export const SOFTEN = ['...ماشي.', 'طب تعالى.', 'إنت محظوظ إني بحبك.', 'عشان إنت كيوت بس.', 'أوف… وحشتني.'] as const;

export const MADE_UP = ['بحبك يا مجنون ❤️', 'مش هنتخانق تاني؟ …لحد بكرة 😂', 'صافي يا لبن؟ ❤️', 'أحلى اتنين في الدنيا ✨'] as const;

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
