import type { ClipId } from '../../engine/clips';
import type { Game, GameDef, GameHost } from './types';

const MOVES: { id: string; label: string; clip: ClipId; bubble: string }[] = [
  { id: 'wave', label: '👋 Wave', clip: 'wave', bubble: '👋' },
  { id: 'jump', label: '🦘 Jump', clip: 'jump', bubble: '🦘' },
  { id: 'dance', label: '💃 Dance', clip: 'cheer', bubble: '💃' },
  { id: 'blush', label: '😳 Blush', clip: 'blush', bubble: '😳' },
];

/** Simon says: they show a sequence of moves, you repeat it. One more move each round. */
class CopyMe implements Game {
  readonly id = 'copy-me' as const;
  readonly capture = false;
  score = 0;
  over = false;
  private stopped = false;

  constructor(private readonly h: GameHost) {}

  start(): void {
    void this.run();
  }

  update(): void {
    this.h.hud.set(`Round ${this.score + 1}`);
  }

  dispose(): void {
    this.stopped = true;
    this.h.choice.close(null);
  }

  private wait(sec: number): Promise<void> {
    return new Promise((r) => window.setTimeout(r, sec * 1000));
  }

  private async run(): Promise<void> {
    const { player, partner, world, choice } = this.h;
    const seq: number[] = [];
    world.say(player, 'Watch me, then copy! 👀');
    await this.wait(2.2);
    while (!this.stopped) {
      seq.push(Math.floor(world.rnd() * MOVES.length));
      for (const i of seq) {
        if (this.stopped) return;
        const m = MOVES[i]!;
        player.animator.play(m.clip, { force: true });
        world.say(player, m.bubble);
        await this.wait(Math.max(0.7, 1.2 - seq.length * 0.05));
        player.animator.play('idle', { force: true });
        await this.wait(0.25);
      }
      for (let k = 0; k < seq.length; k++) {
        if (this.stopped) return;
        const pick = await choice.ask(player, `Your turn! (${k + 1}/${seq.length})`, MOVES.map((m) => ({ label: m.label, value: m.id })), 12);
        if (this.stopped) return;
        const want = MOVES[seq[k]!]!;
        if (pick !== want.id) {
          player.animator.play('pout', { force: true });
          world.say(player, pick === null ? 'Too slow! 😴' : `Nope! It was ${want.bubble}`);
          await this.wait(1.6);
          this.over = true;
          return;
        }
        const m = MOVES.find((x) => x.id === pick)!;
        player.animator.play(m.clip, { force: true });
      }
      this.score++;
      player.animator.play('happy', { force: true });
      if (partner) {
        partner.animator.play('cheer', { force: true });
        world.say(partner, this.score >= 5 ? 'Genius!! 🤯' : 'Yay!');
      } else world.say(player, 'Yes!!');
      await this.wait(1.4);
    }
  }
}

export const COPY_ME: GameDef = {
  id: 'copy-me',
  title: 'Copy Me',
  emoji: '🪞',
  description: 'They show you a little dance, you repeat it move by move. One more move every round.',
  unit: 'rounds',
  create: (h) => new CopyMe(h),
};
