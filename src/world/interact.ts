import { newId } from '../domain/models';
import { L, type Lines, pick } from '../domain/speech';
import { isNameLocked } from '../domain/templates';
import { pickQuestion, type Question } from '../domain/questions';
import type { Actor } from '../engine/actor';
import { store } from '../data/store';
import { EVENTS, send, world as native } from '../platform/bridge';
import type { ChoiceBubble } from './choice';
import type { GameController } from './games/controller';
import type { World } from './runtime';

const IGNORED: Lines = { en: ['...okay, never mind. 😔', 'Hello? 👀', "I'll ask later..."], eg: ['...خلاص، ولا يهمك. 😔', 'ألو؟ 👀', 'هسأل بعدين...'] };
const SOLO_CLIP = { coffee: 'cheer', hug: 'blush', dance: 'dance', sleep: 'sit', walk: 'happy', talk: 'talk' } as const;

/**
 * They ask you something; you answer in the bubble. The answer changes what they say,
 * how they move, how they feel — and a "yes" can lead straight into an activity or a game.
 */
export class Interactions {
  private recent: string[] = [];
  private lastAskAt = -999;

  constructor(
    private readonly w: World,
    private readonly choice: ChoiceBubble,
    private readonly games: GameController,
  ) {}

  /** Click → question, sometimes (setting + cooldown), instead of a plain reaction. */
  shouldAsk(): boolean {
    const chance = (this.w.settings.questionChance ?? 35) / 100;
    return !this.choice.open && this.w.time - this.lastAskAt > 25 && this.w.rnd() < chance;
  }

  async ask(actor: Actor, question?: Question): Promise<void> {
    const w = this.w;
    if (this.choice.open || w.game) return;
    this.lastAskAt = w.time;
    const solo = w.actors.length < 2;
    const q = question ?? pickQuestion({ custom: w.couple?.questions ?? [], solo, recent: this.recent, rnd: w.rnd });
    this.recent = [q.id, ...this.recent].slice(0, 5);
    if (w.runner && [w.runner.ctx.initiator, w.runner.ctx.partner].includes(actor)) {
      w.runner.finish();
      w.runner = null;
    }
    actor.target = null;
    actor.mode = 'activity';
    actor.animator.play('talk', { force: true, then: 'idle' });
    void native.focus();
    const answer = await this.choice.ask(actor, q.text, q.options.map((o, i) => ({ label: o.label, value: String(i) })));
    if (actor.mode === 'activity') actor.mode = 'free';
    actor.nextThinkAt = w.time + 5;
    if (answer === null) {
      w.say(actor, pick(IGNORED, w.rnd));
      actor.animator.play('think', { force: true });
      w.mood(actor, 'ignored');
      w.kick();
      return;
    }
    const option = q.options[Number(answer)]!;
    const r = option.reaction;
    actor.animator.play(r.clip, { force: true });
    w.say(actor, r.say);
    if (r.effect === 'hearts') w.effect('hearts', actor.x, actor.y - w.px(38), 1.8);
    if (r.effect === 'cloud') w.effect('cloud', actor.x, actor.y - w.px(40), 3);
    if (r.effect === 'sparkle') w.effect('sparkle', actor.x, actor.y - w.px(30), 1);
    if (r.effect === 'sweat') w.effect('sweat', actor.x + w.px(8) * actor.facing, actor.y - w.px(34), 1);
    w.mood(actor, r.mood);
    void store.logEvent({ id: newId(), type: 'answer', timestamp: Date.now(), characterIds: [actor.id], dialogue: `${q.text} → ${option.label}` });

    const f = r.follow;
    const partner = w.actors.find((a) => a !== actor) ?? null;
    if (f) {
      window.setTimeout(() => {
        if (w.game) return;
        if (f.kind === 'game') this.games.start(f.id, actor.id);
        else if (f.kind === 'activity') {
          if (partner) w.startActivity(f.id, actor.id);
          else actor.animator.play(SOLO_CLIP[f.id], { force: true });
        } else if (f.kind === 'partner-hug' && partner && partner.mode === 'free') {
          w.say(partner, L('Hey! Be nice 😠', 'إيه ده! اتلم 😠'));
          window.setTimeout(() => w.startActivity('comfort', partner.id, 'auto'), 1400);
        }
      }, 1600);
    }
    w.kick();
  }

  /** Rename from the desktop: a bubble with a text field. */
  async rename(actor: Actor): Promise<void> {
    const c = actor.character;
    if (isNameLocked(c)) return; // Bello and Malouka keep their names
    const name = await this.choice.askText(actor, L('What should I be called?', 'تحب تسميني إيه؟'), c.name);
    if (!name || name === c.name) return;
    const updated = { ...c, name, updatedAt: Date.now() };
    actor.character = updated;
    await store.saveCharacter(updated);
    await send(EVENTS.dataChanged, { from: 'world' });
    actor.animator.play('happy', { force: true });
    this.w.say(actor, L(`${name}! I love it ❤️`, `${name}! حلو أوي ❤️`));
    this.w.kick();
  }
}
