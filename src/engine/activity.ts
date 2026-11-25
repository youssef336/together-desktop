import type { DialogueCategory } from '../domain/models';
import type { ActivityId } from '../domain/personality';
import type { Actor } from './actor';
import type { Throwable } from '../pixel/effects';
import type { ClipId } from './clips';

export type EffectKind =
  | 'heart' | 'hearts' | 'steam' | 'zzz' | 'note' | 'sparkle' | 'gift' | 'sweat' | 'cloud' | 'star'
  // Fights (engine/fight.ts)
  | 'pow' | 'anger' | 'dust' | 'feathers' | 'splat' | 'cream' | 'storm' | 'heartbreak' | 'dizzy' | 'rose' | 'love';

export interface Point {
  x: number;
  y: number;
}

/** How a thrown thing ends: bursts on the target, falls at its feet, or flies past and lands behind. */
export interface Toss {
  item: Throwable;
  from: Point;
  to: Point;
  seconds: number;
  /** Height of the arc in sprite px. */
  arc: number;
  land: 'splat' | 'drop' | 'past';
  /** Ground line (screen px) where dropped things come to rest. */
  floor: number;
}

/** The whole screen's colour for a moment: red while they fight, grey while they sulk, warm when they make up. */
export type ScreenTone = 'angry' | 'sulk' | 'love';

/** What an activity may ask of the world. Implemented by the world runtime (and by tests). */
export interface Stage {
  readonly scale: number;
  readonly bounds: { left: number; right: number; top: number; bottom: number };
  /** Sprite px → screen px. */
  px(n: number): number;
  say(actor: Actor, text: string): number;
  exchange(category: DialogueCategory, opener: Actor, listener: Actor, activity?: ActivityId): { first?: string; reply?: string };
  effect(kind: EffectKind, x: number, y: number, seconds?: number): void;
  rnd(): number;
  /** Optional: where an activity happens in the current scene (the bed, the table…). */
  spot?(activity: string): { x: number; y: number } | null;
  /** Optional: nudge a character's mood (the world implements it; tests may not). */
  mood?(actor: Actor, cause: 'comforted' | 'fought' | 'made-up'): void;
  /** Optional (fights): fly a thing through the air. Timing stays with the caller. */
  toss?(t: Toss): void;
  /** Optional: tint the whole screen for a while. */
  screen?(tone: ScreenTone, seconds: number): void;
  /** Optional: a short screen shake (strength in sprite px). */
  shake?(power: number, seconds?: number): void;
}

export interface Ctx {
  initiator: Actor;
  partner: Actor;
  stage: Stage;
  /** The running activity's id (set by the runner) — used to find its spot in a scene. */
  activity?: string;
}

/** One state of an activity's state machine. `update` returns true when the state is done. */
export interface Step {
  name: string;
  enter?(ctx: Ctx): void;
  update(ctx: Ctx, dt: number): boolean;
}

export type MomentId = 'wave-at' | 'gift' | 'glance' | 'comfort' | 'fight';

/** The partner's comfort lands: mood goes up. */
export const cheerUp = (): Step => ({
  name: 'cheer-up',
  update: ({ partner, stage }) => {
    stage.mood?.(partner, 'comforted');
    return true;
  },
});

export const wait = (sec: number, name = 'wait'): Step => {
  let t = 0;
  return { name, enter: () => (t = 0), update: (_c, dt) => (t += dt) >= sec };
};

/**
 * Initiator walks next to the partner (gap in sprite px); the partner turns to look.
 * In a scene with a spot for this activity (bed, table, sofa…) both walk there instead.
 */
export const meet = (gap: number, opts: { run?: boolean } = {}): Step => {
  let t = 0;
  let both = false;
  return {
    name: 'meet',
    enter: (ctx) => {
      const { initiator: i, partner: p, stage } = ctx;
      t = 0;
      const spot = ctx.activity ? stage.spot?.(ctx.activity) : null;
      if (spot) {
        both = true;
        const half = stage.px(gap) / 2;
        const [left, right] = i.x <= p.x ? [i, p] : [p, i];
        left.walkTo(spot.x - half, spot.y, { run: opts.run });
        right.walkTo(spot.x + half, spot.y, { run: opts.run });
        return;
      }
      both = false;
      const side = i.x <= p.x ? -1 : 1;
      let tx = p.x + side * stage.px(gap);
      // Keep both on screen: if there is no room on that side, use the other one.
      if (tx < stage.bounds.left || tx > stage.bounds.right) tx = p.x - side * stage.px(gap);
      p.stop('idle');
      p.faceTowards(i);
      i.walkTo(tx, p.y, { run: opts.run });
    },
    update: ({ initiator: i, partner: p }, dt) => {
      t += dt;
      if (!both) p.faceTowards(i);
      if (t > 25) {
        i.stop(); // safety valve — never hang an activity
        p.stop();
      }
      return both ? i.arrived && p.arrived : i.arrived;
    },
  };
};

export const faceEachOther = (): Step => ({
  name: 'face',
  update: ({ initiator: i, partner: p }) => {
    i.faceTowards(p);
    p.faceTowards(i);
    return true;
  },
});

/** Both play clips for `sec` seconds (null = keep current). */
export const play = (a: ClipId | null, b: ClipId | null, sec: number, name = 'play'): Step => {
  let t = 0;
  return {
    name,
    enter: ({ initiator, partner }) => {
      t = 0;
      if (a) initiator.animator.play(a, { force: true, then: a });
      if (b) partner.animator.play(b, { force: true, then: b });
    },
    update: (_c, dt) => (t += dt) >= sec,
  };
};

/** A two-line exchange; each speaker talks while their bubble is up. */
export const exchange = (category: DialogueCategory, opts: { activity?: ActivityId; animate?: boolean; swap?: boolean } = {}): Step => {
  let t = 0;
  let firstFor = 0;
  let replyFor = 0;
  let phase: 0 | 1 | 2 = 0;
  return {
    name: `talk:${opts.activity ?? category}`,
    enter: (ctx) => {
      t = 0;
      phase = 0;
      const [opener, listener] = opts.swap ? [ctx.partner, ctx.initiator] : [ctx.initiator, ctx.partner];
      const line = ctx.stage.exchange(category, opener, listener, opts.activity);
      firstFor = line.first ? ctx.stage.say(opener, line.first) * 0.55 : 0;
      replyFor = line.reply ? 1 : 0;
      if (opts.animate && line.first) opener.animator.play('talk', { force: true, then: 'idle' });
      pending.set(ctx, { reply: line.reply, opener, listener });
    },
    update: (ctx, dt) => {
      t += dt;
      const p = pending.get(ctx);
      if (phase === 0 && t >= firstFor) {
        phase = 1;
        if (p?.reply) {
          replyFor = ctx.stage.say(p.listener, p.reply) * 0.6;
          if (opts.animate) {
            p.opener.animator.play('idle', { force: true });
            p.listener.animator.play('talk', { force: true, then: 'idle' });
          }
        } else replyFor = 0;
        t = 0;
      }
      if (phase === 1 && t >= replyFor) {
        phase = 2;
        if (opts.animate) p?.listener.animator.play('idle', { force: true });
        pending.delete(ctx);
        return true;
      }
      return false;
    },
  };
};
const pending = new WeakMap<Ctx, { reply?: string; opener: Actor; listener: Actor }>();

export const say = (who: 'initiator' | 'partner', text: string): Step => ({
  name: 'say',
  update: (ctx) => {
    ctx.stage.say(who === 'initiator' ? ctx.initiator : ctx.partner, text);
    return true;
  },
});

export const effect = (kind: EffectKind, where: 'between' | 'initiator' | 'partner' | 'both', seconds = 2.5): Step => ({
  name: `fx:${kind}`,
  update: ({ initiator: i, partner: p, stage }) => {
    const head = (a: Actor) => a.y - stage.px(36);
    if (where === 'between') stage.effect(kind, (i.x + p.x) / 2, Math.min(head(i), head(p)) - stage.px(2), seconds);
    if (where === 'initiator' || where === 'both') stage.effect(kind, i.x, head(i), seconds);
    if (where === 'partner' || where === 'both') stage.effect(kind, p.x, head(p), seconds);
    return true;
  },
});

/** Both walk side by side to a new spot, then stop. */
export const walkTogether = (distance: number): Step => {
  let t = 0;
  return {
    name: 'walk-together',
    enter: ({ initiator: i, partner: p, stage }) => {
      t = 0;
      const { left, right } = stage.bounds;
      const mid = (i.x + p.x) / 2;
      const span = stage.px(distance);
      const dir = mid + span > right ? -1 : mid - span < left ? 1 : stage.rnd() < 0.5 ? -1 : 1;
      const dest = Math.max(left + stage.px(20), Math.min(right - stage.px(20), mid + dir * span));
      const gap = stage.px(9);
      const [lead, follow] = dir > 0 ? (i.x > p.x ? [i, p] : [p, i]) : i.x < p.x ? [i, p] : [p, i];
      lead.walkTo(dest + dir * gap, lead.y, { then: 'idle' });
      follow.walkTo(dest - dir * gap, lead.y, { then: 'idle' });
    },
    update: ({ initiator: i, partner: p }, dt) => {
      t += dt;
      if (t > 30) {
        i.stop();
        p.stop();
      }
      return i.arrived && p.arrived;
    },
  };
};

/** Rock paper scissors: count in, reveal, then the winner cheers and the loser pouts. */
export const rockPaperScissors = (): Step => {
  let t = 0;
  let phase: 'shake' | 'reveal' | 'result' = 'shake';
  let a = 0;
  let b = 0;
  return {
    name: 'rps',
    enter: ({ initiator: i, partner: p, stage }) => {
      t = 0;
      phase = 'shake';
      a = Math.floor(stage.rnd() * 3);
      b = Math.floor(stage.rnd() * 3);
      i.animator.play('dance', { force: true, then: 'idle' });
      p.animator.play('dance', { force: true, then: 'idle' });
    },
    update: ({ initiator: i, partner: p, stage }, dt) => {
      t += dt;
      if (phase === 'shake' && t > 1.6) {
        const hands = ['✊', '✋', '✌️'];
        i.stop();
        p.stop();
        stage.say(i, hands[a]!);
        stage.say(p, hands[b]!);
        phase = 'reveal';
        t = 0;
      } else if (phase === 'reveal' && t > 1.4) {
        const result = (a - b + 3) % 3; // 0 tie, 1 initiator wins, 2 partner wins
        if (result === 0) {
          stage.say(p, 'Tie?! Again!');
          i.animator.play('surprise', { force: true });
          p.animator.play('surprise', { force: true });
        } else {
          const [win, lose] = result === 1 ? [i, p] : [p, i];
          win.animator.play('cheer', { force: true });
          lose.animator.play('surprise', { force: true });
          stage.say(win, 'I win! 🎉');
        }
        phase = 'result';
        t = 0;
      }
      return phase === 'result' && t > 2.2;
    },
  };
};

export interface ActivityDef {
  id: ActivityId | MomentId;
  label: string;
  emoji: string;
  description: string;
  /** Seconds before the scheduler may pick it again. */
  cooldown: number;
  build(ctx: Ctx): Step[];
}

/** Runs an activity's steps in order. Cancelling returns both characters to free behaviour. */
export class ActivityRunner {
  private index = -1;
  constructor(
    readonly def: ActivityDef,
    readonly ctx: Ctx,
    private readonly steps: Step[] = def.build(ctx),
  ) {
    ctx.activity = def.id;
  }

  get stepName(): string {
    return this.steps[this.index]?.name ?? 'start';
  }

  start(): void {
    this.ctx.initiator.mode = 'activity';
    this.ctx.partner.mode = 'activity';
    this.advance();
  }

  /** Returns true when the activity has finished. */
  update(dt: number): boolean {
    const step = this.steps[this.index];
    if (!step) return true;
    if (step.update(this.ctx, dt)) this.advance();
    return this.index >= this.steps.length;
  }

  private advance(): void {
    this.index++;
    const next = this.steps[this.index];
    if (next) next.enter?.(this.ctx);
    else this.finish();
  }

  finish(): void {
    for (const a of [this.ctx.initiator, this.ctx.partner]) {
      a.hidden = false;
      if (a.mode === 'activity') a.mode = 'free';
      if (a.mode !== 'dragged') a.stop('idle');
    }
    this.index = this.steps.length;
  }
}
