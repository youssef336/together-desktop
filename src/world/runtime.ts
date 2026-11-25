import { fillTokens, pickExchange } from '../domain/dialogue';
import { L, pick, setSpeechLang } from '../domain/speech';
import type { Character, Couple, DialogueCategory, WorldSettings } from '../domain/models';
import { newId } from '../domain/models';
import type { ActivityId } from '../domain/personality';
import { ACTIVITIES, MOMENTS } from '../engine/activities';
import { type ActivityDef, ActivityRunner, type EffectKind, type HudEvent, type ScreenTone, type Stage, type Toss } from '../engine/activity';
import { FightHud } from './fight-hud';
import { Actor } from '../engine/actor';
import { CoupleScheduler } from '../engine/scheduler';
import { store } from '../data/store';
import { EVENTS, send, world as native, type WorldStatus } from '../platform/bridge';
import { applyMood, driftMood, MOOD_DEFAULT, MOOD_SAD, type MoodCause } from '../domain/mood';
import { think } from './behavior';
import type { Game } from './games/types';
import { Mischief } from './mischief';
import { Particles } from './particles';
import { Projectiles } from './projectiles';
import { ScreenFx } from './screen-fx';
import { Renderer } from './renderer';
import { SceneLayer } from './scene-layer';
import type { Placed } from '../scenes/scenes';

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
  /** Things thrown in a fight, and the screen's colour / shake (engine/fight.ts). */
  readonly projectiles = new Projectiles();
  readonly screenFx = new ScreenFx();
  readonly fightHud = new FightHud();
  /** Slow motion: world speed and how many real seconds it lasts. */
  private timeScale = 1;
  private slowLeft = 0;
  readonly scene = new SceneLayer();
  /** Opt-in pranks: grabbing the mouse, closing a tab (see world/mischief.ts). */
  readonly mischief: Mischief = new Mischief(this);
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
  private lastFightAt: number | undefined;
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
    // In a scene they live on its floor; games always use the whole screen.
    if (this.scene.active && !this.game) return this.scene.bounds();
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
  spot(activity: string): { x: number; y: number } | null {
    return this.game ? null : this.scene.spot(activity as ActivityId);
  }
  effect(kind: EffectKind, x: number, y: number, seconds = 2.5): void {
    this.particles.emit(kind, x, y, seconds);
  }
  toss(t: Toss): void {
    this.projectiles.toss(t);
  }
  screen(tone: ScreenTone, seconds: number): void {
    this.screenFx.set(tone, seconds);
  }
  shake(power: number, seconds = 0.25): void {
    if (!this.settings.lowPerformance) this.screenFx.shake(power, seconds);
  }
  flash(): void {
    if (!this.settings.lowPerformance) this.screenFx.flash();
  }
  slowmo(scale: number, seconds: number): void {
    this.timeScale = scale;
    this.slowLeft = seconds;
  }
  hud(e: HudEvent): void {
    this.fightHud.on(e, this.actors);
  }

  /** A fight that was cut short (drag, game, another activity) must not leave the screen red or grey. */
  private settleFightFx(): void {
    const tone = this.screenFx.current;
    const fighting = this.runner?.def.id === 'fight';
    if ((!fighting || this.paused) && (tone === 'angry' || tone === 'sulk')) this.screenFx.clear();
    // A cut-short fight takes its health bars with it (the "made up" banner may finish on its own).
    if (!fighting && this.fightHud.active && tone !== 'love') this.fightHud.clear();
    if (!fighting) this.timeScale = 1;
    if (this.game && this.projectiles.active) this.projectiles.clear();
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
    setSpeechLang(settings.speech);
    const sceneChanged = this.scene.configure(settings, this.renderer.view);
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
    if (this.scene.active && sceneChanged) {
      // Moving into a scene: stand them side by side in the middle of the floor.
      const { left, right } = this.scene.bounds();
      this.actors.forEach((a, i) => {
        a.target = null;
        a.x = left + (right - left) * (this.actors.length === 1 ? 0.5 : i === 0 ? 0.42 : 0.58);
        a.facing = i === 0 ? 1 : -1;
      });
    }
    this.clampAll();
    if (this.couple) this.scheduler.plan({ couple: this.couple, now: this.time });
    this.syncCursorFeed();
    // The world window starts hidden; show it once there is someone to show.
    if (!settings.hidden && this.actors.length > 0) void native.show();
    else if (this.actors.length === 0) void native.hide();
    this.renderer.dirty = true;
    this.publishStatus();
    this.kick();
  }

  /** The cursor feed runs for hover reactions, and for mischief (they need to find your mouse). */
  syncCursorFeed(): void {
    void native.setCursorFeed((this.settings.mouseReactions || this.mischief.wanted) && !this.settings.paused);
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
        setSpeechLang(this.settings.speech);
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
    const { w, h } = this.renderer.view;
    for (const a of this.actors) {
      if (a.mode === 'dragged' || a.mode === 'mischief') {
        // Picked up (or off on a prank): anywhere on screen; the scene floor takes them back on drop.
        a.x = Math.max(this.px(10), Math.min(w - this.px(10), a.x));
        a.y = Math.max(this.px(40), Math.min(h - 2, a.y));
        continue;
      }
      a.x = Math.max(left, Math.min(right, a.x));
      a.y = Math.max(top, Math.min(bottom, a.y));
    }
  }

  // ── Activities ─────────────────────────────────────────────────────────
  startActivity(id: ActivityId | string, initiatorId?: string, source: 'user' | 'auto' = 'user'): boolean {
    if (this.actors.length < 2) return false;
    const def: ActivityDef | undefined = (ACTIVITIES as Record<string, ActivityDef>)[id] ?? MOMENTS.find((m) => m.id === id);
    if (!def) return false;
    this.mischief.abort();
    if (this.actors.some((a) => a.mode === 'dragged')) return false;
    this.runner?.finish();
    const [a, b] = this.actors as [Actor, Actor];
    let initiator = initiatorId === b.id ? b : initiatorId === a.id ? a : null;
    if (!initiator) {
      initiator = CoupleScheduler.pickInitiator(a.character.personality, b.character.personality, this.rnd) === 'a' ? a : b;
    }
    const partner = initiator === a ? b : a;
    if (def.id === 'fight') this.lastFightAt = this.time;
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
    if (pick.id === 'fight') {
      // Rarer still, and never when one of them is already sad, or on cooldown.
      if (this.rnd() > 0.3 || this.actors.some((a) => this.moodOf(a) < MOOD_SAD)) return;
      if (this.time - (this.lastFightAt ?? -Infinity) < pick.cooldown) return;
    }
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
    if ((this.game || this.paused) && this.mischief.active) this.mischief.abort();
    this.settleFightFx();
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
      this.projectiles.active ||
      this.screenFx.active ||
      this.fightHud.active ||
      this.mischief.active ||
      (this.runner !== null && this.runner.stepName.startsWith('walk'))
    );
  }

  private nextDelay(): number {
    const low = this.settings?.lowPerformance;
    if (this.game) return low ? 1 / 30 : 1 / 60;
    if (this.paused) return 1;
    if (this.busy()) return low ? 1 / 15 : 1 / 30;
    const sceneTick = this.scene.active && this.scene.animated ? (low ? 0.25 : 0.125) : 0.5;
    const next = Math.min(...this.actors.map((a) => a.animator.nextChangeIn()), 0.5, sceneTick);
    return Math.max(low ? 1 / 6 : 1 / 12, next);
  }

  private update(real: number): void {
    // Slow motion stretches world time; it always ends after its real seconds.
    if (this.slowLeft > 0) {
      this.slowLeft -= real;
      if (this.slowLeft <= 0) this.timeScale = 1;
    }
    const dt = real * this.timeScale;
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
    this.mischief.update(dt);
    if (this.scene.tick(this.time)) this.renderer.dirty = true;
    if (this.scene.active) {
      // After sitting on the sofa or napping on the bed, hop back down to the floor.
      const floor = this.scene.floorY;
      for (const a of this.actors) {
        if (a.mode === 'free' && a.arrived && Math.abs(a.y - floor) > 0.5) {
          a.y = floor;
          this.renderer.dirty = true;
        }
      }
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
    if (this.projectiles.active) {
      this.projectiles.update(dt, s, this.particles);
      this.renderer.dirty = true;
    }
    if (this.screenFx.active) {
      this.screenFx.update(real, s, this.rnd);
      this.renderer.dirty = true;
    }
    if (this.fightHud.active) {
      this.fightHud.update(real);
      this.renderer.dirty = true;
    }
    this.renderer.setOffset(this.screenFx.offset);
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

  /** A click on something in the scene. */
  useObject(o: Placed): void {
    const it = o.interact;
    if (!it || this.game) return;
    const free = this.actors.filter((a) => a.mode === 'free');
    if (it.kind === 'light') {
      this.scene.light = !this.scene.light;
      this.scene.configure({ ...this.settings, sceneLight: this.scene.light }, this.renderer.view);
      void this.patchSettings({ sceneLight: this.scene.light });
      const a = free[0];
      if (a) this.say(a, this.scene.light ? L('Ah, light! 💡', 'آه، نور! 💡') : L('Cozy... 🌙', 'دافي كده... 🌙'));
    } else if (it.kind === 'gift') {
      this.startActivity('gift');
    } else if (it.kind === 'water') {
      const at = this.scene.centreOf(o);
      const a = free.sort((p, q) => Math.abs(p.x - (at?.x ?? 0)) - Math.abs(q.x - (at?.x ?? 0)))[0];
      if (!a || !at) return;
      const tx = at.x + (a.x < at.x ? -1 : 1) * this.px(10);
      a.walkTo(tx, a.y, { then: 'happy' });
      const ms = (Math.abs(tx - a.x) / (a.speed * (this.scale / 3))) * 1000 + 300;
      window.setTimeout(() => {
        a.faceTowards({ x: at.x } as Actor);
        this.say(a, pick({ en: ['Grow, little one 🌱', 'Drink up! 💧', 'You look thirsty.'], eg: ['كبري يا صغنونة 🌱', 'اشربي! 💧', 'شكلك عطشانة.'] }, this.rnd));
        this.effect('sparkle', at.x, at.y - this.px(16), 1);
        this.kick();
      }, ms);
    } else if (it.kind === 'activity') {
      if (this.actors.length === 2) this.startActivity(it.id);
      else if (free[0]) {
        // Alone: go there and do the solo version.
        const a = free[0];
        const spot = this.scene.spot(it.id) ?? this.scene.centreOf(o);
        const solo = { sleep: 'sleep', sit: 'sit', dance: 'dance', coffee: 'drink', talk: 'wave', hug: 'blush', walk: 'walk', play: 'cheer' } as const;
        if (spot) a.walkTo(spot.x, spot.y, { then: solo[it.id] });
        a.nextThinkAt = this.time + 12;
      }
    }
    this.renderer.dirty = true;
    this.kick();
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
