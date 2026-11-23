import { fillTokens, pickExchange } from '../domain/dialogue';
import type { Character, Couple, DialogueCategory, WorldSettings } from '../domain/models';
import { newId } from '../domain/models';
import type { ActivityId } from '../domain/personality';
import { ACTIVITIES, MOMENTS } from '../engine/activities';
import { type ActivityDef, ActivityRunner, type EffectKind, type Stage } from '../engine/activity';
import { Actor } from '../engine/actor';
import { CoupleScheduler } from '../engine/scheduler';
import { store } from '../data/store';
import { EVENTS, send, world as native, type WorldStatus } from '../platform/bridge';
import { think } from './behavior';
import { Particles } from './particles';
import { Renderer } from './renderer';

/**
 * The desktop world: owns the actors, the activity runner, the scheduler and the clock.
 * Implements `Stage` so activities can talk, move and spawn effects without knowing about canvases.
 */
export class World implements Stage {
  settings!: WorldSettings;
  couple: Couple | null = null;
  actors: Actor[] = [];
  runner: ActivityRunner | null = null;
  readonly scheduler = new CoupleScheduler();
  readonly particles = new Particles();
  readonly renderer: Renderer;
  time = 0;
  private momentAt = 40;
  private last = performance.now();
  private timer: number | undefined;
  private recentLines: string[] = [];
  private lastStatus = '';
  rnd = Math.random;
  /** Hover handler, installed by the input layer. */
  onCursor: (x: number, y: number) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas, this);
  }

  // ── Stage ──────────────────────────────────────────────────────────────
  get scale(): number {
    return this.settings?.scale ?? 3;
  }
  px(n: number): number {
    return n * this.scale;
  }
  get bounds() {
    const { w, h } = this.renderer.view;
    return { left: this.px(14), right: w - this.px(14), top: this.px(42), bottom: h - 2 };
  }
  say(actor: Actor, text: string): number {
    actor.say(text, this.settings.bubbleSeconds);
    this.renderer.dirty = true;
    return actor.bubble?.ttl ?? 0;
  }
  exchange(category: DialogueCategory, opener: Actor, listener: Actor, activity?: ActivityId) {
    const line = pickExchange(category, {
      tone: opener.character.personality.dialogueTone,
      custom: this.couple?.dialogue.customLines ?? [],
      disabled: this.couple?.dialogue.disabledCategories ?? [],
      recent: this.recentLines,
      activity,
      speaker: opener === this.actors[0] ? 'a' : 'b',
    });
    if (!line) return {};
    this.recentLines = [line.key, ...this.recentLines].slice(0, 12);
    const o = opener.character.nickname || opener.character.name;
    const l = listener.character.nickname || listener.character.name;
    return { first: fillTokens(line.first, o, l), reply: line.reply ? fillTokens(line.reply, l, o) : undefined };
  }
  effect(kind: EffectKind, x: number, y: number, seconds = 2.5): void {
    this.particles.emit(kind, x, y, seconds);
  }

  // ── Data ───────────────────────────────────────────────────────────────
  async load(): Promise<void> {
    const [settings, couples, characters] = await Promise.all([store.getSettings(), store.listCouples(), store.listCharacters()]);
    this.settings = settings;
    this.couple = couples.find((c) => c.id === settings.activeCoupleId) ?? couples[0] ?? null;
    const byId = new Map(characters.map((c) => [c.id, c]));
    const chars = this.couple
      ? [byId.get(this.couple.characterAId), byId.get(this.couple.characterBId)].filter((c): c is Character => !!c)
      : [];
    const previous = new Map(this.actors.map((a) => [a.id, a]));
    const { w, h } = this.renderer.view;
    this.actors = chars.map((c, i) => {
      const keep = previous.get(c.id);
      if (keep) {
        keep.character = c;
        return keep;
      }
      const saved = settings.positions[c.id];
      const x = saved ? saved.fx * w : w / 2 + (i === 0 ? -1 : 1) * this.px(22);
      const y = saved ? saved.fy * h : h - 4;
      const actor = new Actor(c, x, y);
      actor.facing = i === 0 ? 1 : -1;
      actor.nextThinkAt = this.time + 4 + i * 3;
      return actor;
    });
    this.clampAll();
    if (this.couple) this.scheduler.plan({ couple: this.couple, now: this.time });
    void native.setCursorFeed(settings.mouseReactions && !settings.paused);
    // The world window starts hidden; show it once there is someone to show.
    if (!settings.hidden && this.actors.length > 0) void native.show();
    else if (this.actors.length === 0) void native.hide();
    this.renderer.dirty = true;
    this.publishStatus();
    this.kick();
  }

  async patchSettings(patch: Partial<WorldSettings>): Promise<void> {
    const fresh = await store.getSettings();
    this.settings = { ...fresh, ...patch };
    await store.saveSettings(this.settings);
    await send(EVENTS.dataChanged, { from: 'world' });
    this.publishStatus();
    this.kick();
  }

  savePosition(actor: Actor): void {
    const { w, h } = this.renderer.view;
    const positions = { ...this.settings.positions, [actor.id]: { fx: actor.x / w, fy: actor.y / h } };
    void this.patchSettings({ positions });
  }

  clampAll(): void {
    const { left, right, top, bottom } = this.bounds;
    for (const a of this.actors) {
      a.x = Math.max(left, Math.min(right, a.x));
      a.y = Math.max(top, Math.min(bottom, a.y));
    }
  }

  // ── Activities ─────────────────────────────────────────────────────────
  startActivity(id: ActivityId | string, initiatorId?: string, source: 'user' | 'auto' = 'user'): boolean {
    if (this.actors.length < 2) return false;
    const def: ActivityDef | undefined = (ACTIVITIES as Record<string, ActivityDef>)[id] ?? MOMENTS.find((m) => m.id === id);
    if (!def) return false;
    if (this.actors.some((a) => a.mode === 'dragged')) return false;
    this.runner?.finish();
    const [a, b] = this.actors as [Actor, Actor];
    let initiator = initiatorId === b.id ? b : initiatorId === a.id ? a : null;
    if (!initiator) {
      initiator = CoupleScheduler.pickInitiator(a.character.personality, b.character.personality, this.rnd) === 'a' ? a : b;
    }
    const partner = initiator === a ? b : a;
    this.runner = new ActivityRunner(def, { initiator, partner, stage: this });
    this.runner.start();
    if (def.id in ACTIVITIES) {
      this.scheduler.record(def.id as ActivityId, this.time);
      void store.logEvent({
        id: newId(), type: 'activity', timestamp: Date.now(), characterIds: [initiator.id, partner.id],
        activity: def.id as ActivityId, dialogue: source,
      });
    }
    if (source === 'user' && this.settings.paused) void this.patchSettings({ paused: false });
    this.publishStatus();
    this.kick();
    return true;
  }

  private autoActivity(): void {
    if (!this.couple || this.actors.length < 2) return;
    const [a, b] = this.actors as [Actor, Actor];
    const id = this.scheduler.choose({
      couple: this.couple,
      a: a.character.personality,
      b: b.character.personality,
      favoritesA: a.character.preferences.favoriteActivities,
      favoritesB: b.character.preferences.favoriteActivities,
      now: this.time,
      hour: new Date().getHours(),
      rnd: this.rnd,
    });
    this.scheduler.plan({ couple: this.couple, now: this.time, rnd: this.rnd });
    if (id) this.startActivity(id, undefined, 'auto');
  }

  private moment(): void {
    if (!this.couple || this.actors.length < 2) return;
    const affection = (this.actors[0]!.character.personality.affection + this.actors[1]!.character.personality.affection) / 2;
    this.momentAt = this.time + (70 + this.rnd() * 90) * (1.4 - affection / 200);
    if (this.couple.behavior.mode === 'stationary') return;
    const pick = MOMENTS[Math.floor(this.rnd() * MOMENTS.length)]!;
    if (pick.id === 'gift' && this.rnd() > 0.25) return; // gifts are rare
    this.startActivity(pick.id, undefined, 'auto');
  }

  // ── Clock ──────────────────────────────────────────────────────────────
  get paused(): boolean {
    return !!this.settings?.paused || !!this.settings?.hidden;
  }

  /** Re-arms the loop immediately (after input or a state change). */
  kick(): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.loop, 0);
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) this.update(dt);
    this.renderer.render();
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.loop, this.nextDelay() * 1000);
  };

  private busy(): boolean {
    return (
      this.actors.some((a) => !a.arrived || a.mode === 'dragged') ||
      this.particles.active ||
      (this.runner !== null && this.runner.stepName.startsWith('walk'))
    );
  }

  private nextDelay(): number {
    const low = this.settings?.lowPerformance;
    if (this.paused) return 1;
    if (this.busy()) return low ? 1 / 15 : 1 / 30;
    const next = Math.min(...this.actors.map((a) => a.animator.nextChangeIn()), 0.5);
    return Math.max(low ? 1 / 6 : 1 / 12, next);
  }

  private update(dt: number): void {
    this.time += dt;
    const s = this.scale;
    for (const a of this.actors) {
      if (a.move(dt, s)) this.renderer.dirty = true;
      if (a.animator.update(dt)) this.renderer.dirty = true;
      if (a.bubble) {
        a.bubble.ttl -= dt;
        if (a.bubble.ttl <= 0) a.bubble = null;
        this.renderer.dirty = true;
      }
    }
    if (this.runner) {
      if (this.runner.update(dt)) {
        this.runner.finish();
        this.runner = null;
        this.publishStatus();
      }
    } else if (this.couple && this.actors.length === 2 && this.actors.every((a) => a.mode === 'free')) {
      if (this.time >= this.scheduler.nextAt) this.autoActivity();
      else if (this.time >= this.momentAt) this.moment();
    }
    const mode = this.couple?.behavior.mode ?? 'relaxed';
    for (const a of this.actors) {
      if (a.mode !== 'free' || !a.arrived || this.time < a.nextThinkAt) continue;
      think(a, this.actors.find((o) => o !== a) ?? null, this, mode, this.time);
      this.renderer.dirty = true;
    }
    if (this.particles.active) {
      this.particles.update(dt, s, this.rnd);
      this.renderer.dirty = true;
    }
  }

  publishStatus(): void {
    const status: WorldStatus = {
      activity: (this.runner?.def.id as ActivityId) ?? null,
      step: this.runner?.stepName ?? '',
      paused: !!this.settings?.paused,
      visible: !this.settings?.hidden,
    };
    const json = JSON.stringify(status);
    if (json === this.lastStatus) return;
    this.lastStatus = json;
    void send(EVENTS.status, status);
  }
}
