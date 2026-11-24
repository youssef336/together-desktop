import { isNaughty, line, mischiefOf, nextPrankIn, pickPrank, tugsToRelease } from '../domain/mischief';
import type { Actor } from '../engine/actor';
import { world as native } from '../platform/bridge';
import type { World } from './runtime';

type Phase =
  | 'chase' // sneaking up on the cursor
  | 'hold' // running around with it
  | 'rest' // stopped to taunt you (the cursor is yours for a moment… until they move again)
  | 'climb' // walking up to the tabs
  | 'warn' // "Bye bye, tab!" — click them now to stop it
  | 'closing'; // waiting for the OS

interface Prank {
  actor: Actor;
  kind: 'grab' | 'tab';
  phase: Phase;
  /** Seconds in the current phase. */
  t: number;
  /** Seconds since the prank started (hard cap below). */
  age: number;
  tugs: number;
  tugsNeeded: number;
  holdFor: number;
  dest: { x: number; y: number } | null;
  lastWarp: { x: number; y: number } | null;
  tauntAt: number;
}

const CHASE_GIVE_UP_S = 10;
/** They never keep your mouse longer than this, whatever happens. */
const HOLD_MAX_S = 12;
const PRANK_MAX_S = 25;
const WARN_S = 2.5;

/**
 * The mischief controller: one prank at a time, by whichever character has mischief on.
 * Safety: every prank has a hard time cap; pausing, hiding, a game or turning it off ends it at once;
 * clicking the character always wins in the end.
 */
export class Mischief {
  private prank: Prank | null = null;
  private nextAt = new Map<string, number>();
  /** Last cursor position from the Rust feed (world CSS px). */
  private cursor: { x: number; y: number; at: number } | null = null;

  constructor(private readonly w: World) {}

  get active(): boolean {
    return this.prank !== null;
  }

  /** True while the cursor is being held (the window captures every click). */
  get holding(): boolean {
    return this.prank?.phase === 'hold' || this.prank?.phase === 'rest';
  }

  /** Does anyone on screen have mischief on? (Then the cursor feed must run.) */
  get wanted(): boolean {
    return this.w.actors.some((a) => isNaughty(mischiefOf(this.w.settings, a.id)));
  }

  onCursor(x: number, y: number): void {
    this.cursor = { x, y, at: this.w.time };
  }

  /** Called from the world clock while not paused and no game is on. */
  update(dt: number): void {
    const w = this.w;
    if (this.prank) {
      this.step(this.prank, dt);
      return;
    }
    for (const a of w.actors) {
      const prefs = mischiefOf(w.settings, a.id);
      if (!isNaughty(prefs)) {
        this.nextAt.delete(a.id);
        continue;
      }
      const at = this.nextAt.get(a.id);
      if (at === undefined) {
        this.nextAt.set(a.id, w.time + nextPrankIn(prefs, w.rnd));
        continue;
      }
      if (w.time < at) continue;
      // Busy (an activity, being dragged, a menu)? Try again a bit later.
      if (!this.start(a)) this.nextAt.set(a.id, w.time + 20);
      return;
    }
  }

  /** Starts a prank now (the menu's "Do it now!" too). Returns false if they can't right now. */
  start(actor: Actor, kind?: 'grab' | 'tab'): boolean {
    const w = this.w;
    if (this.prank || w.game || w.paused || w.runner) return false;
    if (actor.mode !== 'free' || !w.actors.includes(actor)) return false;
    const prefs = mischiefOf(w.settings, actor.id);
    const pick = kind ?? pickPrank(prefs, w.rnd);
    if (!pick) return false;
    if (pick === 'grab' && !this.cursorKnown()) return false;
    actor.mode = 'mischief';
    actor.target = null;
    this.prank = {
      actor, kind: pick, phase: pick === 'grab' ? 'chase' : 'climb', t: 0, age: 0, tugs: 0,
      tugsNeeded: tugsToRelease(actor.character.personality.playfulness),
      holdFor: 6 + w.rnd() * 5, dest: null, lastWarp: null, tauntAt: 2.5,
    };
    if (pick === 'grab') w.say(actor, line('sneak', w.rnd));
    actor.animator.play('run', { force: true, speed: 1.1 });
    w.publishStatus();
    w.kick();
    return true;
  }

  /**
   * A click while a prank runs. `actor` is the character under the pointer (if any).
   * Returns true when mischief took the click.
   */
  pointerDown(actor: Actor | null): boolean {
    const p = this.prank;
    if (!p) return false;
    const w = this.w;
    if (this.holding) {
      // Every click is a tug; enough of them and they give up.
      p.tugs++;
      if (p.tugs >= p.tugsNeeded) {
        this.finish(line('caught', w.rnd));
        return true;
      }
      w.say(p.actor, line('tug', w.rnd));
      p.dest = this.randomSpot(); // dodge
      if (p.phase === 'rest') this.enter(p, 'hold');
      w.kick();
      return true;
    }
    if (actor !== p.actor) return false;
    if (p.phase === 'warn' || p.phase === 'climb') this.finish(line('tabCancel', w.rnd));
    else if (p.phase === 'chase') this.finish('Caught me! 🙈');
    return true;
  }

  /** Ends the prank at once (pause, hide, game, reload, turned off). */
  abort(): void {
    if (this.prank) this.finish(null);
  }

  private step(p: Prank, dt: number): void {
    const w = this.w;
    p.t += dt;
    p.age += dt;
    if (!w.actors.includes(p.actor) || !isNaughty(mischiefOf(w.settings, p.actor.id)) || p.age > PRANK_MAX_S) {
      this.finish(null);
      return;
    }
    w.renderer.dirty = true;
    switch (p.phase) {
      case 'chase': {
        const c = this.cursor;
        if (!c || p.t > CHASE_GIVE_UP_S || !this.onScreen(c)) {
          this.finish(line('escaped', w.rnd));
          return;
        }
        // Walk so that the hand (not the feet) ends up on the cursor.
        const facing: 1 | -1 = c.x >= p.actor.x ? 1 : -1;
        const feet = this.feetFor(c, facing);
        if (this.moveTowards(p.actor, feet, w.px(48) * this.pep(p.actor), dt)) {
          const hand = this.hand(p.actor);
          if (Math.hypot(hand.x - c.x, hand.y - c.y) < w.px(14)) this.grab(p);
        }
        return;
      }
      case 'hold': {
        if (p.t > p.holdFor || p.age > HOLD_MAX_S) {
          this.finish(line('bored', w.rnd));
          return;
        }
        if (!p.dest) p.dest = this.randomSpot();
        if (this.moveTowards(p.actor, p.dest, w.px(72) * this.pep(p.actor), dt)) {
          p.dest = null;
          // Now and then: stop, turn round and taunt — the mouse is free… until they run again.
          if (w.rnd() < 0.35) {
            this.enter(p, 'rest');
            p.actor.animator.play('cheer', { force: true, then: 'idle' });
            w.say(p.actor, line('taunt', w.rnd));
            return;
          }
        }
        this.warpToHand(p);
        if (p.t > p.tauntAt) {
          p.tauntAt = p.t + 3 + w.rnd() * 2;
          if (!p.actor.bubble) w.say(p.actor, line('taunt', w.rnd));
        }
        return;
      }
      case 'rest':
        if (p.t > 0.9) {
          this.enter(p, 'hold');
          p.actor.animator.play('run', { force: true, speed: 1.2 });
        }
        return;
      case 'climb': {
        if (!p.dest) {
          const { w: vw } = w.renderer.view;
          p.dest = { x: Math.max(w.px(20), Math.min(vw - w.px(20), p.actor.x + (w.rnd() - 0.5) * w.px(60))), y: w.px(48) };
        }
        if (this.moveTowards(p.actor, p.dest, w.px(44) * this.pep(p.actor), dt) || p.t > 8) {
          this.enter(p, 'warn');
          p.actor.animator.play('wave', { force: true, then: 'cheer' });
          w.say(p.actor, line('tabWarn', w.rnd));
        }
        return;
      }
      case 'warn':
        if (p.t > WARN_S) {
          this.enter(p, 'closing');
          void native.closeTab().then((r) => {
            if (this.prank !== p) return;
            if (r === 'closed') {
              p.actor.animator.play('happy', { force: true });
              w.effect('sparkle', p.actor.x, p.actor.y - w.px(36), 1.2);
              this.finish(line('tabClosed', w.rnd));
            } else this.finish(line(r === 'denied' ? 'tabDenied' : 'tabNone', w.rnd));
          });
        }
        return;
      case 'closing':
        if (p.t > 6) this.finish(null); // the OS never answered
        return;
    }
  }

  private grab(p: Prank): void {
    const w = this.w;
    this.enter(p, 'hold');
    p.actor.animator.play('run', { force: true, speed: 1.2 });
    w.say(p.actor, line('grab', w.rnd));
    w.effect('sparkle', this.hand(p.actor).x, this.hand(p.actor).y, 0.8);
    this.partnerReacts(p.actor);
    // While they hold it, the whole window takes the clicks: your clicks are tugs, not desktop clicks.
    void native.setCapture(true);
    this.warpToHand(p);
  }

  private finish(say: string | null): void {
    const p = this.prank;
    if (!p) return;
    const w = this.w;
    this.prank = null;
    if (p.phase === 'hold' || p.phase === 'rest') void native.setCapture(false);
    const a = p.actor;
    if (a.mode === 'mischief') a.mode = 'free';
    a.target = null;
    if (say && (p.phase === 'hold' || p.phase === 'rest') && p.tugs >= p.tugsNeeded) {
      // You won it back: the partner is relieved.
      const partner = w.actors.find((o) => o !== a);
      if (partner && partner.mode === 'free') {
        partner.target = null;
        partner.animator.play('happy', { force: true });
        w.effect('heart', partner.x, partner.y - w.px(36), 1.4);
      }
    }
    if (say) {
      w.say(a, say);
      a.animator.play(p.phase === 'hold' || p.phase === 'rest' ? 'pout' : 'happy', { force: true, then: 'idle' });
    } else a.animator.play('idle', { force: true });
    // Back home: into the scene / desktop bounds if the prank took them elsewhere.
    const { left, right, top, bottom } = w.bounds;
    const hx = Math.max(left, Math.min(right, a.x));
    const hy = Math.max(top, Math.min(bottom, a.y));
    if (Math.hypot(hx - a.x, hy - a.y) > 1) a.walkTo(hx, hy);
    a.nextThinkAt = w.time + 6;
    this.nextAt.set(a.id, w.time + nextPrankIn(mischiefOf(w.settings, a.id), w.rnd));
    w.publishStatus();
    w.renderer.dirty = true;
    w.kick();
  }

  /**
   * The partner notices: a kind one runs after the thief to scold them, a playful one cheers them on.
   * When you get your mouse back, the scolding partner is relieved (hearts).
   */
  private partnerReacts(thief: Actor): void {
    const w = this.w;
    const partner = w.actors.find((a) => a !== thief);
    if (!partner || partner.mode !== 'free' || w.runner) return;
    const name = thief.character.nickname || thief.character.name;
    const accomplice = partner.character.personality.playfulness > partner.character.personality.affection + 15;
    partner.faceTowards(thief);
    if (accomplice) {
      partner.animator.play('cheer', { force: true, then: 'idle' });
      w.say(partner, line('partnerProud', w.rnd).replace('{thief}', name));
      return;
    }
    partner.animator.play('surprise', { force: true });
    w.say(partner, line('partnerScold', w.rnd).replace('{thief}', name));
    window.setTimeout(() => {
      if (this.prank?.actor !== thief || partner.mode !== 'free') return;
      partner.walkTo(thief.x - partner.facing * w.px(18), thief.y, { run: true, then: 'pout' });
      partner.nextThinkAt = w.time + 8;
      w.kick();
    }, 700);
  }

  // ── helpers ────────────────────────────────────────────────────────────
  private enter(p: Prank, phase: Phase): void {
    p.phase = phase;
    p.t = 0;
  }

  private cursorKnown(): boolean {
    return !!this.cursor && this.onScreen(this.cursor);
  }

  private onScreen(c: { x: number; y: number }): boolean {
    const { w, h } = this.w.renderer.view;
    return c.x >= 0 && c.y >= 0 && c.x <= w && c.y <= h;
  }

  /** Energetic characters are quicker thieves. */
  private pep(a: Actor): number {
    return 0.8 + a.character.personality.energy / 250;
  }

  /** Where the cursor sits: in the front hand, at chest height. */
  private hand(a: Actor): { x: number; y: number } {
    return { x: a.x + a.facing * this.w.px(9), y: a.y - this.w.px(17) };
  }

  private feetFor(c: { x: number; y: number }, facing: 1 | -1): { x: number; y: number } {
    return this.clampFeet({ x: c.x - facing * this.w.px(9), y: c.y + this.w.px(17) });
  }

  private clampFeet(p: { x: number; y: number }): { x: number; y: number } {
    const w = this.w;
    const { w: vw, h: vh } = w.renderer.view;
    return { x: Math.max(w.px(12), Math.min(vw - w.px(12), p.x)), y: Math.max(w.px(42), Math.min(vh - 2, p.y)) };
  }

  private randomSpot(): { x: number; y: number } {
    const w = this.w;
    const { w: vw, h: vh } = w.renderer.view;
    return this.clampFeet({ x: w.px(20) + w.rnd() * (vw - w.px(40)), y: w.px(60) + w.rnd() * (vh - w.px(60)) });
  }

  /** Moves straight at `speed` px/s. Returns true on arrival. */
  private moveTowards(a: Actor, to: { x: number; y: number }, speed: number, dt: number): boolean {
    const dx = to.x - a.x;
    const dy = to.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (Math.abs(dx) > 1) a.facing = dx > 0 ? 1 : -1;
    const step = speed * dt;
    if (dist <= step) {
      a.x = to.x;
      a.y = to.y;
      return true;
    }
    a.x += (dx / dist) * step;
    a.y += (dy / dist) * step;
    return false;
  }

  private warpToHand(p: Prank): void {
    const h = this.hand(p.actor);
    const x = Math.round(h.x);
    const y = Math.round(h.y);
    if (p.lastWarp && Math.abs(p.lastWarp.x - x) < 1 && Math.abs(p.lastWarp.y - y) < 1) return;
    p.lastWarp = { x, y };
    void native.moveCursor(x, y);
  }
}
