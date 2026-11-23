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
import { applyMood, driftMood, MOOD_DEFAULT, MOOD_SAD, type MoodCause } from '../domain/mood';
import { think } from './behavior';
import type { Game } from './games/types';
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
  /** The mini game being played, if any (owned by GameController). */
  game: Game | null = null;
  onGameOver: () => void = () => {};
  /** Called on every render so DOM bubbles can follow their character. */
  onRender: () => void = () => {};
  private comfortAt = 30;
  private sides = new Map<string, 'a' | 'b'>();
  private moodSavedAt = 0;
  private moodDirty = false;

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
      speaker: this.sides.get(opener.id) ?? 'a',
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

  // ── Mood ───────────────────────────────────────────────────────────────
  moodOf(actor: Actor): number {
    return this.settings?.moods[actor.id] ?? MOOD_DEFAULT;
  }
  mood(actor: Actor, cause: MoodCause): void {
    const before = this.moodOf(actor);
    const after = applyMood(before, cause, actor.character.personality.shyness);
    this.settings.moods = { ...this.settings.moods, [actor.id]: after };
    this.moodDirty = true;
    if (before >= MOOD_SAD && after < MOOD_SAD) this.effect('cloud', actor.x, actor.y - this.px(38), 3);
    this.persistMoods(true);
  }
  private persistMoods(now = false): void {
    if (!this.moodDirty || (!now && this.time - this.moodSavedAt < 120)) return;
    this.moodDirty = false;
    this.moodSavedAt = this.time;
    void this.patchSettings({ moods: this.settings.moods });
  }

  // ── Data ───────────────────────────────────────────────────────────────
  async load(): Promise<void> {
    const [settings, couples, characters] = await Promise.all([store.getSettings(), store.listCouples(), store.listCharacters()]);
    this.settings = settings;
    this.couple = couples.find((c) => c.id === settings.activeCoupleId) ?? couples[0] ?? null;
    const byId = new Map(characters.map((c) => [c.id, c]));
    const pair = this.couple ? [byId.get(this.couple.characterAId), byId.get(this.couple.characterBId)] : [];
    // "Who's out": both, or only one of them.
    const visible = settings.show === 'a' ? pair.slice(0, 1) : settings.show === 'b' ? pair.slice(1, 2) : pair;
    const chars = visible.filter((c): c is Character => !!c);
    /** Couple index of each visible character (for dialogue openers). */
    this.sides = new Map(chars.map((c) => [c.id, c.id === this.couple?.characterBId ? 'b' : 'a']));
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

  private settingsQueue: Promise<void> = Promise.resolve();

  /**
   * Read-modify-write of the settings row. Writes are queued: a game end saves mood, high score
   * and position at once, and parallel writes would overwrite each other.
   */
  patchSettings(patch: Partial<WorldSettings>): Promise<void> {
    this.settingsQueue = this.settingsQueue
      .then(async () => {
        const fresh = await store.getSettings();
        this.settings = { ...fresh, ...patch };
        await store.saveSettings(this.settings);
        await send(EVENTS.dataChanged, { from: 'world' });
        this.publishStatus();
        this.kick();
      })
      .catch((e) => console.error('[world] settings write failed', e));
    return this.settingsQueue;
  }

  /** Who's out on the desktop. Reloads so the actors match. */
  async setShow(show: WorldSettings['show']): Promise<void> {
    if (this.runner) {
      this.runner.finish();
      this.runner = null;
    }
    await this.patchSettings({ show });
    await this.load();
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
    const spontaneous = MOMENTS.filter((m) => m.id !== 'comfort');
    const pick = spontaneous[Math.floor(this.rnd() * spontaneous.length)]!;
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
    if (this.game) this.updateGame(dt);
    else if (!this.paused) this.update(dt);
    this.renderer.render();
    this.onRender();
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
    if (this.game) return low ? 1 / 30 : 1 / 60;
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
    this.updateMoods(dt);
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

  private updateGame(dt: number): void {
    this.time += dt;
    for (const a of this.actors) {
      a.animator.update(dt);
      if (a.bubble) {
        a.bubble.ttl -= dt;
        if (a.bubble.ttl <= 0) a.bubble = null;
      }
    }
    this.game?.update(dt);
    if (this.particles.active) this.particles.update(dt, this.scale, this.rnd);
    this.renderer.dirty = true;
    if (this.game?.over) this.onGameOver();
  }

  private moodTick = 0;
  /** Drift, sad faces, and the partner coming to comfort a sad one. */
  private updateMoods(dt: number): void {
    this.moodTick += dt;
    if (this.moodTick >= 10) {
      const moods = { ...this.settings.moods };
      for (const a of this.actors) {
        const m = moods[a.id] ?? MOOD_DEFAULT;
        const next = driftMood(m, this.moodTick);
        if (next !== m) {
          moods[a.id] = next;
          this.moodDirty = true;
        }
      }
      this.settings.moods = moods;
      this.moodTick = 0;
      this.persistMoods();
    }
    for (const a of this.actors) {
      const sad = this.moodOf(a) < MOOD_SAD;
      if (a.mode !== 'free') continue;
      if (sad && a.animator.clip === 'idle') a.animator.play('sadIdle', { force: true, then: 'sadIdle' });
      else if (!sad && a.animator.clip === 'sadIdle') a.animator.play('idle', { force: true });
    }
    if (this.runner || this.actors.length < 2 || this.time < this.comfortAt) return;
    const sadOne = this.actors.find((a) => this.moodOf(a) < MOOD_SAD);
    const other = this.actors.find((a) => a !== sadOne);
    if (sadOne && other && this.actors.every((a) => a.mode === 'free') && this.moodOf(other) >= MOOD_SAD) {
      this.comfortAt = this.time + 120;
      this.startActivity('comfort', other.id, 'auto');
    }
  }

  publishStatus(): void {
    const status: WorldStatus = {
      activity: (this.runner?.def.id as ActivityId) ?? null,
      game: this.game?.id ?? null,
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
