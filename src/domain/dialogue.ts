import type { DialogueCategory, DialogueLine } from './models';
import type { DialogueTone } from './personality';

// Built-in lines. `{you}` = the listener's nickname, `{me}` = the speaker's.
// Users add their own lines per couple; built-in categories can be switched off.

interface BuiltIn {
  first: string;
  reply?: string;
  tones?: DialogueTone[];
}

const B = (first: string, reply?: string, tones?: DialogueTone[]): BuiltIn => ({ first, reply, tones });

export const BUILT_IN: Record<DialogueCategory, BuiltIn[]> = {
  casual: [
    B('Hey, come here.', 'What happened? ❤️'),
    B('Are you busy?', 'Not anymore.'),
    B('What are you thinking about?', 'You, obviously.', ['sweet', 'shy']),
    B('This desktop is getting messy.', 'We live here, we can judge.', ['funny', 'chaotic']),
    B("Look, they're working hard.", "Let's be quiet... for a bit.", ['calm', 'supportive']),
    B('I had the weirdest dream.', 'Was I in it?'),
    B('Do you want to do something?', 'Something with you, yes.'),
  ],
  romantic: [
    B('I like being here with you.', 'Me too. A lot.'),
    B('{you}...', 'Yes? ❤️'),
    B('You look cute today.', 'Only today? 😤', ['playful', 'funny']),
    B('Stay close, okay?', "I'm not going anywhere."),
    B('Thank you for being you.', 'Stop, I\'ll cry 🥺', ['sweet', 'shy']),
  ],
  funny: [
    B('I could totally beat you at anything.', 'Rock paper scissors. Now.'),
    B('Is that mouse following us?', 'Act natural.'),
    B('I am 100% a professional desktop resident.', 'You fell off the taskbar twice.'),
    B("Let's pretend to be icons.", '...I\'m the recycle bin.'),
  ],
  teasing: [
    B('You walk funny.', 'You LOVE how I walk.'),
    B('Bet you can\'t catch me!', 'Watch me.'),
    B('Did you just trip?', 'It was a dance move.'),
  ],
  supportive: [
    B('You\'re doing great today.', 'We both are.'),
    B('Take a little break?', 'Only if you take one too.'),
    B('Whatever happens, I\'m here.', '❤️'),
  ],
  activity: [],
  thought: [
    B('Hmm... snacks?'),
    B('I wonder what\'s behind that window.'),
    B('Should I go say hi to {you}?'),
    B('So many icons...'),
    B('Today feels cozy.'),
  ],
  reaction: [
    B('Hehe!'),
    B('Hi hi!'),
    B('Boop?'),
    B('Oh! You found me.'),
    B('❤️'),
    B('Hey there!'),
  ],
  greeting: [B('Hi {you}!', 'Hiii ❤️'), B('There you are!', 'Missed me?')],
  morning: [B('Good morning, {you} ☀️', 'Five more minutes...'), B('Coffee first?', 'Coffee first.')],
  night: [B("It's late... sleepy?", 'A little. Stay with me?'), B('Good night, {you} 🌙', 'Sweet dreams ❤️')],
  special: [B('Happy anniversary ❤️', 'Best days, with you.')],
};

export const ACTIVITY_LINES: Record<string, BuiltIn[]> = {
  coffee: [B("Let's get coffee.", "Okay, but you're paying."), B('One sugar or two?', 'Just you.'), B('Mmm... perfect.', 'Best coffee, best company.')],
  hug: [B('Come here ❤️'), B('Hug time!'), B('I needed that.')],
  dance: [B('Dance with me!', 'Only if you lead.'), B('Spin!', 'Wheee!')],
  walk: [B("Let's go for a walk.", 'Hold my hand?'), B('Nice view from here.', 'You\'re the view.', ['sweet', 'playful'])],
  sit: [B('Come sit with me.', 'Coming ❤️'), B('This is nice.', 'Mm-hm.')],
  sleep: [B('I\'m so sleepy...', 'Nap together?'), B('Zzz...')],
  play: [B('Rock, paper, scissors!', 'You\'re going down!'), B('Again!', 'Best of three!')],
  talk: [B('Tell me about your day.', 'It got better just now.'), B('Can I tell you something?', 'Always.')],
};

export interface PickedLine {
  first: string;
  reply?: string;
  key: string;
}

/** Picks an exchange for a category, honouring tone, custom lines, disabled categories and recent history. */
export function pickExchange(
  category: DialogueCategory,
  opts: {
    tone: DialogueTone;
    custom: DialogueLine[];
    disabled: DialogueCategory[];
    recent: string[];
    activity?: string;
    /** Which side of the couple speaks first; custom lines pinned to the other side are skipped. */
    speaker?: 'a' | 'b';
    rnd?: () => number;
  },
): PickedLine | null {
  const rnd = opts.rnd ?? Math.random;
  const pool: PickedLine[] = [];
  const builtIn = opts.activity ? (ACTIVITY_LINES[opts.activity] ?? []) : BUILT_IN[category];
  if (!opts.disabled.includes(category)) {
    builtIn.forEach((b, i) => {
      const fits = !b.tones || b.tones.includes(opts.tone);
      const entry = { first: b.first, reply: b.reply, key: `${opts.activity ?? category}:${i}` };
      pool.push(entry);
      if (fits && b.tones) pool.push(entry); // tone-matched lines are twice as likely
    });
  }
  for (const c of opts.custom) {
    if (c.category !== category) continue;
    if (opts.speaker && c.opener !== 'any' && c.opener !== opts.speaker) continue;
    const entry = { first: c.first, reply: c.reply, key: `custom:${c.id}` };
    pool.push(entry, entry); // the user's own lines are preferred
  }
  if (pool.length === 0) return null;
  const fresh = pool.filter((p) => !opts.recent.includes(p.key));
  const from = fresh.length > 0 ? fresh : pool;
  return from[Math.floor(rnd() * from.length)] ?? null;
}

export function fillTokens(text: string, me: string, you: string): string {
  return text.replaceAll('{me}', me).replaceAll('{you}', you);
}
