import type { World } from './runtime';

// Good morning / good night: once per day each, a few seconds after the world wakes up,
// and again if the app is left running across the boundary. Kept local to this device.

const KEY = 'together:greeted';

function greetedToday(kind: string): boolean {
  try {
    return localStorage.getItem(`${KEY}:${kind}`) === new Date().toDateString();
  } catch {
    return false;
  }
}

function markGreeted(kind: string): void {
  try {
    localStorage.setItem(`${KEY}:${kind}`, new Date().toDateString());
  } catch {
    /* private mode — greet again next time, harmless */
  }
}

export function scheduleDailyGreetings(w: World): void {
  const check = () => {
    if (w.paused || w.actors.length < 2 || w.runner) return;
    const h = new Date().getHours();
    const kind = h >= 6 && h < 11 ? 'morning' : h >= 22 || h < 2 ? 'night' : null;
    if (!kind || greetedToday(kind)) return;
    markGreeted(kind);
    const [a, b] = w.actors as [NonNullable<(typeof w.actors)[0]>, NonNullable<(typeof w.actors)[1]>];
    const opener = a.character.personality.initiative >= b.character.personality.initiative ? a : b;
    const other = opener === a ? b : a;
    opener.faceTowards(other);
    other.faceTowards(opener);
    const line = w.exchange(kind, opener, other);
    if (line.first) w.say(opener, line.first);
    if (line.reply) window.setTimeout(() => w.say(other, line.reply!), 2200);
    w.kick();
  };
  window.setTimeout(check, 6000);
  window.setInterval(check, 5 * 60 * 1000);
}
