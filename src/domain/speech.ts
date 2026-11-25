// The language the characters speak in their bubbles: English or Egyptian Arabic.
// One setting for the whole world (Settings → They speak, or right-click → 🗣). The rest of the
// app's interface stays English. Every built-in line exists in both; the user's own lines are
// shown as written.

export const SPEECH_LANGS = ['en', 'eg'] as const;
export type SpeechLang = (typeof SPEECH_LANGS)[number];
export const SPEECH_LABEL: Record<SpeechLang, string> = { en: 'English', eg: 'مصري' };

let current: SpeechLang = 'eg';

export function setSpeechLang(lang: SpeechLang | undefined): void {
  current = lang === 'en' ? 'en' : 'eg';
}

export function speechLang(): SpeechLang {
  return current;
}

/** A line in both languages; returns the one they speak now. */
export function L(en: string, eg: string): string {
  return current === 'eg' ? eg : en;
}

/** A list of lines in both languages. */
export interface Lines {
  en: readonly string[];
  eg: readonly string[];
}

export function pick(lines: Lines, rnd: () => number = Math.random): string {
  const list = lines[current];
  return list[Math.floor(rnd() * list.length)]!;
}
