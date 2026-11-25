import {
  CHASE_CALL,
  FLEE_CALL,
  GRAWLIX,
  MADE_UP,
  pickApologizer,
  pickLine,
  pickRounds,
  REFUSE,
  RETORT,
  RETRY,
  type RoundKind,
  SOFTEN,
  SORRY,
  SPARK,
  SULK,
  TAUNT,
  THROW_CALL,
} from '../domain/fight';
import { L } from '../domain/speech';
import { THROWABLES, type Throwable } from '../pixel/effects';
import type { Ctx, Step } from './activity';
import { angry, apart, type Beat, clampX, dirTo, faceOf, handOf, headTop, hit, nameOf, scene } from './fight-script';

// A sudden fight, told as a little cartoon: a spark, two or three rounds (throwing things from
// across the room, fists, a dust-cloud brawl, a slipper chase, a pillow fight), a sulk with backs
// turned, one of them coming back to say sorry (the other stays cross for a while), and making up:
// a hug, the screen turns warm and hearts and stars rise from above them.

// ── The spark ─────────────────────────────────────────────────────────────
/** Out of nowhere: one stomps, shouts, the other turns round… and answers back. */
const spark = (): Step =>
  scene('fight:spark', (ctx) => {
    const { initiator: a, partner: b, stage: st } = ctx;
    return [
      {
        do: () => {
          a.stop();
          b.stop();
          a.faceTowards(b);
          a.animator.play('stomp', { force: true, then: 'angry' });
          st.effect('anger', headTop(a, st).x + st.px(6), headTop(a, st).y, 2.4);
          st.say(a, pickLine(SPARK, st.rnd, nameOf(b)));
          st.screen?.('angry', 120);
          st.hud?.({ kind: 'start' });
        },
      },
      { wait: 0.5, do: () => (b.faceTowards(a), b.animator.play('surprise', { force: true, then: 'angry' })) },
      { wait: 1.6, do: () => (st.say(b, pickLine(RETORT, st.rnd)), angry(a, b)) },
      { wait: 1.4 },
    ];
  });

// ── Rounds ────────────────────────────────────────────────────────────────
/** From across the room: they back off and throw whatever is at hand. Some hit, some get dodged. */
const throwRound = (first: 'initiator' | 'partner'): Step =>
  scene('fight:throw', (ctx, slides) => {
    const st = ctx.stage;
    const [p, q] = first === 'initiator' ? [ctx.initiator, ctx.partner] : [ctx.partner, ctx.initiator];
    const beats: Beat[] = [
      {
        do: () => {
          const [l, r] = apart(st, (p.x + q.x) / 2, st.px(110));
          const [pl, ql] = p.x <= q.x ? [l, r] : [r, l];
          p.walkTo(pl, p.y, { run: true, then: 'angry' });
          q.walkTo(ql, q.y, { run: true, then: 'angry' });
        },
        until: () => p.arrived && q.arrived,
        max: 6,
      },
      { do: () => (p.faceTowards(q), q.faceTowards(p), st.say(p, pickLine(THROW_CALL, st.rnd))) },
    ];
    const throws = 3 + Math.floor(st.rnd() * 3);
    const used: Throwable[] = [];
    for (let n = 0; n < throws; n++) {
      const [by, at] = n % 2 === 0 ? [p, q] : [q, p];
      let item = THROWABLES[Math.floor(st.rnd() * THROWABLES.length)]!;
      if (used.includes(item)) item = THROWABLES[(THROWABLES.indexOf(item) + 1 + n) % THROWABLES.length]!;
      // Malouka's signature move: her first throw is always the flying slipper.
      const signature = by.character.signature === 'malouka' && !used.includes('slipper') && n < 2;
      if (signature) item = 'slipper';
      used.push(item);
      const dodge = st.rnd() < 0.3;
      let flight = 0.7;
      beats.push(
        {
          wait: n === 0 ? 0.5 : 0.35,
          do: () => {
            by.animator.play('windup', { force: true, then: 'windup' });
            if (signature) st.say(by, L('FLYING SLIPPER! 🩴', 'الشبشب الطاير! 🩴'));
          },
        },
        {
          wait: 0.45,
          do: () => {
            by.faceTowards(at);
            by.animator.play('throw', { force: true, then: 'angry' });
            const from = handOf(by, st);
            const to = faceOf(at, st);
            flight = 0.45 + Math.abs(to.x - from.x) / st.px(260);
            const soft = item === 'tomato' || item === 'pie';
            st.toss?.({ item, from, to, seconds: flight, arc: 12 + st.rnd() * 14, land: dodge ? 'past' : soft ? 'splat' : 'drop', floor: at.y });
          },
        },
        { wait: () => Math.max(0.05, flight - 0.3), do: () => dodge && at.animator.play('duck', { force: true, then: 'angry' }) },
        {
          wait: 0.3,
          do: () => {
            if (dodge) {
              st.say(at, pickLine(TAUNT, st.rnd));
              return;
            }
            const f = faceOf(at, st);
            if (item === 'tomato') st.effect('splat', f.x, f.y + st.px(3), 1);
            else if (item === 'pie') st.effect('cream', f.x, f.y + st.px(3), 1);
            else if (item === 'pillow') st.effect('feathers', f.x, f.y, 1);
            hit(st, slides, by, at, item === 'book' || item === 'remote' ? 2 : 1, { line: st.rnd() < 0.6 });
          },
        },
      );
    }
    beats.push({ wait: 0.9 });
    return beats;
  });

/** Up close: fists up, a punch, maybe a dodge, a counter-punch. */
const punchRound = (first: 'initiator' | 'partner'): Step =>
  scene('fight:punch', (ctx, slides) => {
    const st = ctx.stage;
    const [p, q] = first === 'initiator' ? [ctx.initiator, ctx.partner] : [ctx.partner, ctx.initiator];
    const beats: Beat[] = [
      {
        do: () => {
          const [l, r] = apart(st, (p.x + q.x) / 2, st.px(13));
          p.walkTo(p.x <= q.x ? l : r, p.y, { run: true, then: 'angry' });
          q.walkTo(p.x <= q.x ? r : l, q.y, { run: true, then: 'angry' });
        },
        until: () => p.arrived && q.arrived,
        max: 6,
      },
      { do: () => (p.faceTowards(q), q.faceTowards(p), angry(p, q)) },
    ];
    const swings = 2 + Math.floor(st.rnd() * 2);
    for (let n = 0; n < swings; n++) {
      const [by, at] = n % 2 === 0 ? [p, q] : [q, p];
      const dodge = n > 0 && st.rnd() < 0.3;
      beats.push(
        { wait: 0.6, do: () => (by.faceTowards(at), by.animator.play('punch', { force: true, then: 'angry' })) },
        {
          wait: 0.2,
          do: () => {
            if (dodge) {
              at.animator.play('duck', { force: true, then: 'angry' });
              st.effect('sweat', headTop(by, st).x, headTop(by, st).y, 1);
              st.say(at, pickLine(TAUNT, st.rnd));
            } else hit(st, slides, by, at, 2, { line: n === 0 || st.rnd() < 0.4 });
          },
        },
        // Step back in after a stumble.
        { wait: 0.5, do: () => at.walkTo(clampX(st, by.x + dirTo(by, at) * st.px(13)), at.y, { then: 'angry' }), until: () => at.arrived, max: 2 },
      );
    }
    beats.push({ wait: 0.6 });
    return beats;
  });

/** The cartoon brawl: they vanish into a dust cloud; fists, stars and a flying sock come out of it. */
const brawlRound = (): Step =>
  scene('fight:brawl', (ctx, slides) => {
    const { initiator: a, partner: b, stage: st } = ctx;
    let mid = (a.x + b.x) / 2;
    const beats: Beat[] = [
      {
        do: () => {
          mid = apart(st, mid, st.px(10)).reduce((s, x) => s + x, 0) / 2;
          a.walkTo(mid - dirTo(a, b) * st.px(5), a.y, { run: true, then: 'angry' });
          b.walkTo(mid + dirTo(a, b) * st.px(5), b.y, { run: true, then: 'angry' });
          st.say(a, L('RAAAH!', 'آآآآه!'));
        },
        until: () => a.arrived && b.arrived,
        max: 6,
      },
      {
        do: () => {
          a.hidden = true;
          b.hidden = true;
          st.effect('dust', mid, a.y - st.px(10), 3.2);
          st.shake?.(2, 3);
        },
      },
    ];
    for (let n = 0; n < 9; n++) {
      beats.push({
        wait: 0.33,
        do: () => {
          const x = mid + (st.rnd() - 0.5) * st.px(34);
          const y = a.y - st.px(8 + st.rnd() * 26);
          const r = st.rnd();
          if (r < 0.45) st.effect('pow', x, y, 0.4);
          else if (r < 0.65) st.effect('star', x, y, 0.3);
          else st.effect('anger', x, y, 0.5);
          if (n === 2) st.say(a, pickLine(GRAWLIX, st.rnd));
          if (n === 4) st.say(b, pickLine(GRAWLIX, st.rnd));
          if (n === 5 || n === 7) {
            const item = (['sock', 'slipper', 'banana'] as const)[Math.floor(st.rnd() * 3)]!;
            const side = st.rnd() < 0.5 ? -1 : 1;
            st.toss?.({ item, from: { x: mid, y }, to: { x: clampX(st, mid + side * st.px(60)), y: a.y - st.px(20) }, seconds: 0.6, arc: 22, land: 'past', floor: a.y });
          }
        },
      });
    }
    beats.push(
      {
        wait: 0.4,
        do: () => {
          a.hidden = false;
          b.hidden = false;
          for (const [who, side] of [[a, -1], [b, 1]] as const) {
            who.stop('dizzy');
            slides.push(who, clampX(st, mid + side * dirTo(a, b) * st.px(12)), 0.3);
          }
        },
      },
      { wait: 0.35, do: () => [a, b].forEach((who) => st.effect('dizzy', who.x, headTop(who, st).y + st.px(9), 1)) },
      { wait: 2.6, do: () => angry(a, b) },
      { wait: 0.6 },
    );
    return beats;
  });

/** The slipper chase: one grabs a slipper and chases the other back and forth, then lands it. */
const chaseRound = (first: 'initiator' | 'partner'): Step =>
  scene('fight:chase', (ctx, slides) => {
    const st = ctx.stage;
    const [by, run] = first === 'initiator' ? [ctx.initiator, ctx.partner] : [ctx.partner, ctx.initiator];
    const lap = (towards: 1 | -1) => {
      const mid = (by.x + run.x) / 2;
      const dest = clampX(st, mid + towards * st.px(85));
      return {
        do: () => {
          run.walkTo(dest, run.y, { run: true, then: 'flee' });
          run.animator.play('flee', { force: true, then: 'flee' });
          by.walkTo(clampX(st, dest - towards * st.px(16)), by.y, { run: true, then: 'chase' });
          by.animator.play('chase', { force: true, then: 'chase' });
        },
        until: () => run.arrived,
        max: 7,
      } satisfies Beat;
    };
    const away = dirTo(by, run);
    const left = run.x - st.bounds.left;
    const right = st.bounds.right - run.x;
    const firstWay: 1 | -1 = Math.abs(away === 1 ? right : left) > st.px(60) ? away : away === 1 ? -1 : 1;
    return [
      { do: () => (by.animator.play('windup', { force: true, then: 'windup' }), st.say(by, pickLine(CHASE_CALL, st.rnd))) },
      { wait: 0.8, do: () => (run.faceTowards(by), run.animator.play('surprise', { force: true }), st.say(run, pickLine(FLEE_CALL, st.rnd))) },
      { wait: 0.5, ...lap(firstWay) },
      lap(firstWay === 1 ? -1 : 1),
      // Caught: the slipper lands.
      { do: () => by.walkTo(clampX(st, run.x + dirTo(run, by) * st.px(12)), by.y, { run: true, then: 'chase' }), until: () => by.arrived, max: 3 },
      { do: () => (by.faceTowards(run), by.animator.play('throw', { force: true, then: 'angry' })) },
      { wait: 0.12, do: () => hit(st, slides, by, run, 2, { line: true }) },
      { wait: 1.2 },
    ];
  });

/** Pillow fight: close swings and feathers everywhere. */
const pillowRound = (): Step =>
  scene('fight:pillow', (ctx, slides) => {
    const { initiator: a, partner: b, stage: st } = ctx;
    const beats: Beat[] = [
      {
        do: () => {
          const [l, r] = apart(st, (a.x + b.x) / 2, st.px(15));
          a.walkTo(a.x <= b.x ? l : r, a.y, { run: true, then: 'windup' });
          b.walkTo(a.x <= b.x ? r : l, b.y, { run: true, then: 'windup' });
          st.say(b, L('PILLOW FIGHT!!', 'حرب مخدات!!'));
        },
        until: () => a.arrived && b.arrived,
        max: 6,
      },
    ];
    for (let n = 0; n < 5; n++) {
      const [by, at] = n % 2 === 0 ? [a, b] : [b, a];
      beats.push(
        { wait: 0.35, do: () => (by.faceTowards(at), by.animator.play('windup', { force: true, then: 'windup' })) },
        {
          wait: 0.25,
          do: () => {
            by.animator.play('throw', { force: true, then: 'windup' });
            const f = faceOf(at, st);
            st.effect('feathers', f.x, f.y, 1);
            hit(st, slides, by, at, 1, { line: n === 3 });
          },
        },
      );
    }
    beats.push({ wait: 0.3, do: () => st.effect('feathers', (a.x + b.x) / 2, a.y - st.px(30), 1) }, { wait: 1 });
    return beats;
  });

const ROUND: Record<RoundKind, (first: 'initiator' | 'partner') => Step> = {
  throw: throwRound,
  punch: punchRound,
  brawl: () => brawlRound(),
  chase: chaseRound,
  pillow: () => pillowRound(),
};

// ── After the fight ───────────────────────────────────────────────────────
/** Backs turned, arms crossed, a storm cloud over each head. They glance… and look away. */
const sulk = (): Step =>
  scene('fight:sulk', (ctx) => {
    const { initiator: a, partner: b, stage: st } = ctx;
    const turnAway = () => {
      a.facing = dirTo(b, a);
      b.facing = dirTo(a, b);
    };
    const storms = () => [a, b].forEach((who) => st.effect('storm', who.x, headTop(who, st).y - st.px(2), 1));
    return [
      {
        do: () => {
          a.hidden = false;
          b.hidden = false;
          const [l, r] = apart(st, (a.x + b.x) / 2, st.px(70));
          a.walkTo(a.x <= b.x ? l : r, a.y, { then: 'sulk' });
          b.walkTo(a.x <= b.x ? r : l, b.y, { then: 'sulk' });
          st.mood?.(a, 'fought');
          st.mood?.(b, 'fought');
          st.hud?.({ kind: 'ko', text: 'K.O.!', sub: L('Nobody wins…', 'محدش كسب…') });
          st.flash?.();
        },
        until: () => a.arrived && b.arrived,
        max: 7,
      },
      {
        do: () => {
          turnAway();
          a.stop('sulk');
          b.stop('sulk');
          st.screen?.('sulk', 120);
          st.effect('heartbreak', (a.x + b.x) / 2, Math.min(a.y, b.y) - st.px(40), 1);
          storms();
          st.say(a, L('Hmph!', 'هممف!'));
        },
      },
      { wait: 1.3, do: () => st.say(b, L('Hmph!!', 'هممف!!')) },
      { wait: 2.6, do: () => st.say(st.rnd() < 0.5 ? a : b, pickLine(SULK, st.rnd)) },
      // Both peek at the same time, get caught, and snap back.
      { wait: 2.2, do: () => (a.faceTowards(b), b.faceTowards(a), a.stop('surprise'), b.stop('surprise')) },
      { wait: 0.7, do: () => (turnAway(), a.stop('sulk'), b.stop('sulk'), storms(), st.say(b, '!!')) },
      { wait: 2.8 },
    ];
  });

/**
 * One comes back to say sorry: hesitates on the way, offers a rose. The other stays cross for a
 * while (refuses, peeks, refuses again), then gives in. A hug, the screen turns warm, and hearts
 * and stars rise from above them.
 */
const makeUp = (): Step =>
  scene('fight:make-up', (ctx) => {
    const st = ctx.stage;
    const side = pickApologizer(ctx.initiator.character.personality, ctx.partner.character.personality, st.rnd);
    const [sorry, proud] = side === 'a' ? [ctx.initiator, ctx.partner] : [ctx.partner, ctx.initiator];
    const tries = 1 + (st.rnd() < 0.5 ? 1 : 0);
    const beats: Beat[] = [
      // Halfway… stops… turns back… then really goes.
      {
        do: () => sorry.walkTo(sorry.x + (proud.x - sorry.x) * 0.4, sorry.y, { then: 'think' }),
        until: () => sorry.arrived,
        max: 6,
      },
      { wait: 1.1, do: () => (sorry.facing = dirTo(proud, sorry)) },
      { wait: 0.9, do: () => (sorry.faceTowards(proud), st.say(sorry, '...')) },
      {
        wait: 0.6,
        do: () => sorry.walkTo(clampX(st, proud.x - dirTo(sorry, proud) * st.px(13)), proud.y, { then: 'pout' }),
        until: () => sorry.arrived,
        max: 6,
      },
      {
        do: () => {
          sorry.faceTowards(proud);
          sorry.animator.play('pout', { force: true, then: 'idle' });
          st.say(sorry, pickLine(SORRY, st.rnd));
          const h = handOf(sorry, st);
          st.effect('rose', h.x, h.y + st.px(4), 1);
        },
      },
      { wait: 1.8, do: () => (st.say(proud, pickLine(REFUSE, st.rnd)), st.effect('anger', headTop(proud, st).x, headTop(proud, st).y, 0.8)) },
    ];
    for (let n = 0; n < tries; n++) {
      beats.push(
        {
          wait: 1.6,
          do: () => {
            st.say(sorry, pickLine(RETRY, st.rnd));
            sorry.animator.play(n === 0 ? 'dance' : 'blush', { force: true, then: 'idle' });
          },
        },
        // A peek over the shoulder… not yet.
        { wait: 1.6, do: () => (proud.faceTowards(sorry), proud.animator.play('sulk', { force: true, then: 'sulk' }), st.say(proud, '...')) },
        { wait: 1.2, do: () => (proud.facing = dirTo(sorry, proud)) },
      );
    }
    beats.push(
      { wait: 1.4, do: () => (sorry.animator.play('pout', { force: true, then: 'pout' }), st.say(sorry, '🥺')) },
      {
        wait: 1.6,
        do: () => {
          proud.faceTowards(sorry);
          proud.animator.play('blush', { force: true, then: 'idle' });
          st.say(proud, pickLine(SOFTEN, st.rnd));
        },
      },
      {
        wait: 1.5,
        do: () => {
          proud.walkTo(clampX(st, sorry.x + dirTo(sorry, proud) * st.px(11)), proud.y, { then: 'hug' });
          sorry.animator.play('hug', { force: true, then: 'hug' });
        },
        until: () => proud.arrived,
        max: 3,
      },
      {
        do: () => {
          sorry.faceTowards(proud);
          proud.faceTowards(sorry);
          proud.animator.play('hug', { force: true, then: 'hug' });
          st.screen?.('love', 7);
          const top = Math.min(headTop(sorry, st).y, headTop(proud, st).y) - st.px(4);
          st.effect('love', (sorry.x + proud.x) / 2, top, 4.5);
          st.effect('hearts', (sorry.x + proud.x) / 2, top + st.px(6), 3);
          st.mood?.(sorry, 'made-up');
          st.mood?.(proud, 'made-up');
          const [l, r] = sorry.x <= proud.x ? [sorry, proud] : [proud, sorry];
          st.hud?.({ kind: 'love', text: `${nameOf(l)} ♥ ${nameOf(r)}`, sub: L('Made up ❤️', 'صافي يا لبن ❤️') });
        },
      },
      { wait: 3.4, do: () => st.say(st.rnd() < 0.5 ? sorry : proud, pickLine(MADE_UP, st.rnd)) },
      {
        wait: 1.2,
        do: () => {
          sorry.animator.play('cheer', { force: true, then: 'happy' });
          proud.animator.play('cheer', { force: true, then: 'happy' });
          st.effect('star', sorry.x, headTop(sorry, st).y, 1.2);
          st.effect('star', proud.x, headTop(proud, st).y, 1.2);
        },
      },
      { wait: 2.2 },
    );
    return beats;
  });

/** "ROUND 2 … FIGHT!" — they square up while the banner is on. */
const announce = (n: number, last: boolean): Step =>
  scene('fight:announce', (ctx) => {
    const { initiator: a, partner: b, stage: st } = ctx;
    return [
      {
        do: () => {
          a.faceTowards(b);
          b.faceTowards(a);
          angry(a, b);
          st.hud?.({
            kind: 'round',
            title: last ? L('FINAL ROUND', 'الجولة الأخيرة') : L(`ROUND ${n}`, `الجولة ${'١٢٣٤'[n - 1] ?? n}`),
            go: L('FIGHT!', 'يلا!'),
          });
        },
      },
      { wait: 1.9 },
    ];
  });

/** The whole fight, from the spark to the hug. */
export function buildFight(ctx: Ctx): Step[] {
  const rounds = pickRounds(ctx.stage.rnd);
  return [
    spark(),
    ...rounds.flatMap((k, i) => [announce(i + 1, i === rounds.length - 1), ROUND[k](i % 2 === 0 ? 'initiator' : 'partner')]),
    sulk(),
    makeUp(),
  ];
}
