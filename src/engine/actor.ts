import type { Character } from '../domain/models';
import { walkSpeed } from '../domain/personality';
import { Animator } from './animator';
import type { ClipId } from './clips';

export type ActorMode = 'free' | 'activity' | 'dragged';

export interface Bubble {
  text: string;
  /** Seconds left on screen. */
  ttl: number;
}

/**
 * One character in the world. Position is the point between the feet, in CSS px of the world window.
 */
export class Actor {
  readonly animator = new Animator();
  x: number;
  y: number;
  facing: 1 | -1 = 1;
  look: -1 | 0 | 1 = 0;
  mode: ActorMode = 'free';
  target: { x: number; y: number; run: boolean } | null = null;
  bubble: Bubble | null = null;
  /** World time (s) when the free behaviour may pick its next move. */
  nextThinkAt = 0;
  /** Clip to hold after arriving (activities set it). */
  arriveClip: ClipId = 'idle';

  constructor(
    public character: Character,
    x: number,
    y: number,
  ) {
    this.x = x;
    this.y = y;
  }

  get id(): string {
    return this.character.id;
  }

  get speed(): number {
    return walkSpeed(this.character.personality);
  }

  walkTo(x: number, y: number, opts: { run?: boolean; then?: ClipId } = {}): void {
    this.target = { x, y, run: opts.run ?? false };
    this.arriveClip = opts.then ?? 'idle';
    if (Math.abs(x - this.x) > 0.5) this.facing = x > this.x ? 1 : -1;
    this.animator.play(opts.run ? 'run' : 'walk', { force: true, speed: 0.8 + this.character.personality.energy / 250 });
  }

  stop(clip: ClipId = 'idle'): void {
    this.target = null;
    this.animator.play(clip, { force: true });
  }

  faceTowards(other: Actor): void {
    if (Math.abs(other.x - this.x) > 1) this.facing = other.x > this.x ? 1 : -1;
  }

  get arrived(): boolean {
    return this.target === null;
  }

  /** Moves toward the target. `scale` converts sprite speed to screen px. Returns true if it moved. */
  move(dt: number, scale: number): boolean {
    if (!this.target || this.mode === 'dragged') return false;
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * (this.target.run ? 2.2 : 1) * (scale / 3) * dt;
    if (dist <= step) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.target = null;
      this.animator.play(this.arriveClip, { force: true });
      return true;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    return true;
  }

  say(text: string, seconds: number): void {
    this.bubble = { text, ttl: seconds + Math.min(4, text.length / 18) };
  }
}
