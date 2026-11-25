import type { ActivityId } from '../domain/personality';
import { L, pick } from '../domain/speech';
import {
  type ActivityDef,
  effect,
  exchange,
  faceEachOther,
  meet,
  play,
  cheerUp,
  rockPaperScissors,
  say,
  walkTogether,
  wait,
} from './activity';
import { buildFight } from './fight';

// Each activity is a small state machine built from steps — never a bag of random animation calls.

export const ACTIVITIES: Record<ActivityId, ActivityDef> = {
  coffee: {
    id: 'coffee', label: 'Coffee together', emoji: '☕', cooldown: 240,
    description: 'They meet, cups appear, they chat and sip.',
    build: () => [
      meet(17),
      faceEachOther(),
      exchange('activity', { activity: 'coffee', animate: true }),
      play('drink', 'drink', 0.1),
      effect('steam', 'both', 5),
      wait(5),
      exchange('activity', { activity: 'coffee', swap: true }),
      play('drink', 'drink', 3),
      play('happy', 'happy', 1.2),
    ],
  },
  hug: {
    id: 'hug', label: 'Hug', emoji: '🤗', cooldown: 180,
    description: 'One walks over, the other turns, a warm hug and hearts.',
    build: ({ stage }) => [
      meet(11, { run: stage.rnd() < 0.3 }),
      faceEachOther(),
      play(null, 'happy', 0.6),
      play('hug', 'hug', 0.1),
      effect('hearts', 'between', 3),
      wait(3.2),
      exchange('activity', { activity: 'hug' }),
      play('blush', 'happy', 1.4),
    ],
  },
  dance: {
    id: 'dance', label: 'Dance', emoji: '💃', cooldown: 300,
    description: 'A little synchronised dance with music notes.',
    build: () => [
      meet(22),
      faceEachOther(),
      exchange('activity', { activity: 'dance' }),
      play('dance', 'dance', 0.1),
      effect('note', 'both', 6),
      wait(6),
      play('cheer', 'cheer', 1),
    ],
  },
  walk: {
    id: 'walk', label: 'Walk together', emoji: '🚶', cooldown: 200,
    description: 'Side by side across the desktop, stopping to talk.',
    build: () => [
      meet(12),
      exchange('activity', { activity: 'walk' }),
      walkTogether(90),
      faceEachOther(),
      exchange('casual'),
      walkTogether(60),
      play('happy', 'happy', 1),
    ],
  },
  sit: {
    id: 'sit', label: 'Sit together', emoji: '🪑', cooldown: 240,
    description: 'They sit close, look at each other and talk.',
    build: () => [
      meet(14),
      exchange('activity', { activity: 'sit' }),
      play('sit', 'sit', 4),
      exchange('romantic'),
      play('sit', 'sit', 5),
      effect('heart', 'between', 2),
      wait(2),
    ],
  },
  sleep: {
    id: 'sleep', label: 'Nap together', emoji: '😴', cooldown: 600,
    description: 'A cozy nap side by side, Zzz included.',
    build: () => [
      meet(24),
      exchange('activity', { activity: 'sleep' }),
      play('sleep', 'sleep', 0.1),
      effect('zzz', 'both', 12),
      wait(12),
      play('surprise', 'happy', 1),
    ],
  },
  play: {
    id: 'play', label: 'Rock paper scissors', emoji: '✊', cooldown: 200,
    description: 'A quick game — the winner cheers, the loser pouts.',
    build: () => [meet(18), faceEachOther(), exchange('activity', { activity: 'play' }), rockPaperScissors()],
  },
  talk: {
    id: 'talk', label: 'Talk', emoji: '💬', cooldown: 90,
    description: 'They stop and have a little conversation.',
    build: ({ stage }) => [
      meet(20),
      faceEachOther(),
      exchange('activity', { activity: 'talk', animate: true }),
      exchange(stage.rnd() < 0.5 ? 'casual' : 'romantic', { animate: true, swap: true }),
    ],
  },
};

/** Small spontaneous moments between activities. */
export const MOMENTS: ActivityDef[] = [
  {
    id: 'wave-at', label: 'Wave', emoji: '👋', cooldown: 120, description: 'A wave across the desktop.',
    build: () => [faceEachOther(), play('wave', null, 0.2), exchange('greeting'), wait(1)],
  },
  {
    id: 'gift', label: 'Gift', emoji: '🎁', cooldown: 900, description: 'A surprise gift.',
    build: () => [
      meet(13),
      faceEachOther(),
      effect('gift', 'between', 2.6),
      say('initiator', () => L('For you 🎁', 'دي عشانك 🎁')),
      play(null, 'surprise', 1),
      say('partner', () => L('For me?!', 'ليا أنا؟!')),
      play('happy', 'happy', 1.4),
      effect('heart', 'partner', 1.5),
    ],
  },
  {
    id: 'glance', label: 'Glance', emoji: '💗', cooldown: 150, description: 'They catch each other looking.',
    build: () => [faceEachOther(), play('blush', 'happy', 1.4), effect('heart', 'between', 1.6), wait(1)],
  },
  {
    // Not random: the world starts it when one of them is sad. The initiator comforts the partner.
    id: 'comfort', label: 'Comfort', emoji: '🫂', cooldown: 120, description: 'When one is sad, the other comes over to make it better.',
    build: ({ stage }) => [
      meet(11),
      faceEachOther(),
      say('initiator', () => pick({ en: ["Hey... I'm here.", 'Come here, you.', "Don't be sad ❤️", 'Who made you sad? 😠'], eg: ['أنا هنا...', 'تعالى هنا.', 'متزعلش ❤️', 'مين زعلك؟ 😠'] }, stage.rnd)),
      wait(1.6),
      play('hug', 'hug', 0.1),
      effect('hearts', 'between', 3),
      wait(3),
      cheerUp(),
      play('happy', 'blush', 1.4),
      say('partner', () => L('Thank you... ❤️', 'شكرًا... ❤️')),
      wait(1.2),
    ],
  },
  {
    // Rare and sudden. Always ends with making up (engine/fight.ts).
    id: 'fight', label: 'Fight & make up', emoji: '😤', cooldown: 1200,
    description: 'Out of nowhere they fight — things fly across the room — sulk, and one comes back to say sorry.',
    build: buildFight,
  },
];
