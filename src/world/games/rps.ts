import type { Game, GameDef, GameHost } from './types';

const HANDS = [
  { id: 'rock', label: '✊', beats: 'scissors' },
  { id: 'paper', label: '✋', beats: 'rock' },
  { id: 'scissors', label: '✌️', beats: 'paper' },
] as const;

/** Best of three against one of them. They tease when they win and sulk (a bit) when they lose. */
class RpsVsYou implements Game {
  readonly id = 'rps' as const;
  readonly capture = false;
  score = 0;
  over = false;
  /** Rounds the character won — the world reads this to pick the ending. */
  theirs = 0;
  private stopped = false;

  constructor(private readonly h: GameHost) {}

  start(): void {
    void this.run();
  }

  update(): void {
    this.h.hud.set(`You ${this.score} – ${this.theirs} ${this.h.player.character.nickname || this.h.player.character.name}`);
  }

  dispose(): void {
    this.stopped = true;
    this.h.choice.close(null);
  }

  private wait(sec: number): Promise<void> {
    return new Promise((r) => window.setTimeout(r, sec * 1000));
  }

  private async run(): Promise<void> {
    const { player, world, choice } = this.h;
    const teasing = player.character.personality.playfulness > 60;
    while (!this.stopped && this.score < 2 && this.theirs < 2) {
      const pick = await choice.ask(player, 'Rock, paper, scissors…', HANDS.map((h) => ({ label: h.label, value: h.id })), 15);
      if (this.stopped) return;
      if (pick === null) {
        world.say(player, 'Hello? 👀');
        this.over = true;
        return;
      }
      player.animator.play('dance', { force: true, then: 'idle' });
      await this.wait(0.8);
      const mine = HANDS[Math.floor(world.rnd() * 3)]!;
      const yours = HANDS.find((h) => h.id === pick)!;
      if (mine.id === yours.id) {
        player.animator.play('surprise', { force: true });
        world.say(player, `${mine.label} Tie! Again!`);
      } else if (mine.beats === yours.id) {
        this.theirs++;
        player.animator.play('cheer', { force: true });
        world.say(player, `${mine.label} ${teasing ? 'Too easy 😏' : 'I win this one!'}`);
      } else {
        this.score++;
        player.animator.play('pout', { force: true });
        world.say(player, `${mine.label} Nooo! 😤`);
      }
      await this.wait(1.8);
    }
    this.over = true;
  }
}

export const RPS: GameDef = {
  id: 'rps',
  title: 'Rock Paper Scissors',
  emoji: '✊',
  description: 'Best of three against them, answered right in their speech bubble.',
  unit: 'matches won',
  create: (h) => new RpsVsYou(h),
};
