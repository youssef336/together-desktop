import { newId } from '../../domain/models';
import { store } from '../../data/store';
import { world as native } from '../../platform/bridge';
import type { ChoiceBubble } from '../choice';
import type { ContextMenu } from '../menu';
import type { World } from '../runtime';
import { Hud } from './hud';
import { GAMES } from './registry';
import type { GameId } from './types';

const HINTS: Record<GameId, string> = {
  'coffee-catch': 'mouse or ←/→',
  'heart-pop': 'click the hearts',
  'copy-me': 'answer in the bubble',
  rps: 'answer in the bubble',
};

/** Starts, feeds input to, and wraps up mini games. One game at a time. */
export class GameController {
  readonly hud = new Hud();
  private gameId: GameId | null = null;
  private playerId: string | null = null;

  constructor(
    private readonly w: World,
    private readonly choice: ChoiceBubble,
    private readonly menu: ContextMenu,
  ) {
    w.onGameOver = () => this.finish();
    this.hud.onStop = () => this.stop();
    this.hud.onHidden = () => {
      w.renderer.extraHit.delete('hud');
      w.renderer.dirty = true;
      w.kick();
    };
    window.addEventListener('keydown', (e) => {
      if (!w.game) return;
      if (e.key === 'Escape') this.stop();
      else w.game.key?.(e.code, true);
    });
    window.addEventListener('keyup', (e) => w.game?.key?.(e.code, false));
  }

  get playing(): boolean {
    return this.w.game !== null;
  }

  start(id: GameId, playerId?: string): boolean {
    const w = this.w;
    if (w.actors.length === 0) return false;
    if (w.game) this.stop();
    w.runner?.finish();
    w.runner = null;
    this.menu.close();
    this.choice.close(null);
    const player = w.actors.find((a) => a.id === playerId) ?? w.actors[0]!;
    const partner = w.actors.find((a) => a !== player) ?? null;
    for (const a of w.actors) {
      a.mode = 'activity';
      a.target = null;
    }
    if (w.settings.paused) void w.patchSettings({ paused: false });
    const def = GAMES[id];
    const game = def.create({ world: w, player, partner, choice: this.choice, hud: this.hud });
    w.game = game;
    this.gameId = id;
    this.playerId = player.id;
    this.hud.show(`${def.emoji} ${def.title}`, HINTS[id], game.capture);
    if (game.capture) {
      w.renderer.captureAll = true;
      void native.setCapture(true);
    }
    void native.focus();
    game.start();
    this.refreshHudHit();
    w.publishStatus();
    w.kick();
    return true;
  }

  /** Mouse and keys go to the game first while one is running. Returns true if consumed. */
  pointerMove(x: number, y: number): boolean {
    if (!this.w.game) return false;
    this.w.game.pointerMove?.(x, y);
    return this.w.game.capture;
  }

  pointerDown(x: number, y: number): boolean {
    if (!this.w.game) return false;
    this.w.game.pointerDown?.(x, y);
    return this.w.game.capture;
  }

  private refreshHudHit(): void {
    const box = this.hud.box();
    if (box) this.w.renderer.extraHit.set('hud', [box]);
    else this.w.renderer.extraHit.delete('hud');
    this.w.renderer.dirty = true;
    this.w.kick();
  }

  /** Stopped early: no score, no record. */
  stop(): void {
    if (!this.w.game) return;
    this.w.game.dispose?.();
    this.cleanup();
    this.hud.hide();
  }

  private finish(): void {
    const w = this.w;
    const game = w.game;
    const id = this.gameId;
    if (!game || !id) return;
    game.dispose?.();
    const def = GAMES[id];
    const player = w.actors.find((a) => a.id === this.playerId) ?? w.actors[0];
    const partner = w.actors.find((a) => a !== player) ?? null;
    const score = game.score;
    const best = w.settings.highScores[id] ?? 0;
    // RPS keeps a tally of matches you won instead of a high score.
    const isRps = id === 'rps';
    const record = !isRps && score > best && score > 0;
    const youWonMatch = isRps && score >= 2;
    this.cleanup();

    if (player) {
      const theyWonRps = id === 'rps' && (game as unknown as { theirs: number }).theirs >= 2;
      if (record) {
        player.animator.play('cheer', { force: true });
        w.effect('hearts', player.x, player.y - w.px(38), 2.5);
        w.say(player, `New record! ${score} ${def.unit} 🎉`);
        if (partner) {
          partner.animator.play('dance', { force: true, then: 'idle' });
          window.setTimeout(() => partner.animator.play('idle', { force: true }), 2500);
        }
      } else if (id === 'rps') {
        w.say(player, theyWonRps ? 'I win! Rematch anytime 😏' : 'You won... rematch!! 😤');
        player.animator.play(theyWonRps ? 'cheer' : 'pout', { force: true });
      } else {
        w.say(player, `${score} ${def.unit}! ${score >= best * 0.8 ? 'So good!' : 'Again?'}`);
        player.animator.play('happy', { force: true });
      }
      for (const a of w.actors) w.mood(a, record ? 'game-record' : id === 'rps' && !theyWonRps && a === player ? 'game-lost' : 'game-played');
      w.savePosition(player);
    }
    if (record) void w.patchSettings({ highScores: { ...w.settings.highScores, [id]: score } });
    if (youWonMatch) void w.patchSettings({ highScores: { ...w.settings.highScores, rps: best + 1 } });
    void store.logEvent({ id: newId(), type: 'game', timestamp: Date.now(), characterIds: w.actors.map((a) => a.id), game: id, score });
    this.hud.result(
      isRps
        ? `${def.emoji} ${youWonMatch ? 'You won the match! 🎉' : 'They won this time'} · matches won ${best + (youWonMatch ? 1 : 0)}`
        : `${def.emoji} ${score} ${def.unit}${record ? ' · new record! 🎉' : best ? ` · best ${best}` : ''}`,
    );
    this.refreshHudHit();
  }

  private cleanup(): void {
    const w = this.w;
    w.game = null;
    this.gameId = null;
    w.renderer.captureAll = false;
    void native.setCapture(false);
    for (const a of w.actors) {
      a.mode = 'free';
      a.nextThinkAt = w.time + 6;
      if (a.animator.clip === 'catch') a.animator.play('idle', { force: true });
    }
    w.renderer.dirty = true;
    w.publishStatus();
    w.kick();
  }
}
