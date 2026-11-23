import { CLIP_MAP, type ClipId, type Frame } from './clips';

export interface PlayOptions {
  /** Play even over a higher-priority clip. */
  force?: boolean;
  /** Clip to return to when a one-shot clip ends (default: idle). */
  then?: ClipId;
  /** Speed multiplier (personality energy tweaks walking cadence). */
  speed?: number;
}

/**
 * Plays one clip at a time with priorities, interruptions and a fall-back clip.
 * Pure state; the world reads `frame()` and redraws only when `frameIndex` changes.
 */
export class Animator {
  clip: ClipId = 'idle';
  frameIndex = 0;
  private elapsed = 0;
  private then: ClipId = 'idle';
  private speed = 1;
  /** True once a non-looping clip reached its last frame. */
  finished = false;

  play(id: ClipId, opts: PlayOptions = {}): boolean {
    const next = CLIP_MAP[id];
    const current = CLIP_MAP[this.clip];
    if (!opts.force && !this.finished && current.priority > next.priority && !current.loop) return false;
    if (id === this.clip && !this.finished && next.loop) {
      this.speed = opts.speed ?? this.speed;
      return true;
    }
    this.clip = id;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.finished = false;
    this.then = opts.then ?? 'idle';
    this.speed = opts.speed ?? 1;
    return true;
  }

  /** Advances time; returns true when the visible frame changed. */
  update(dt: number): boolean {
    const c = CLIP_MAP[this.clip];
    if (this.finished && !c.loop) {
      this.play(this.then, { force: true });
      return true;
    }
    this.elapsed += dt * this.speed;
    const step = 1 / c.fps;
    let changed = false;
    while (this.elapsed >= step) {
      this.elapsed -= step;
      if (this.frameIndex + 1 < c.frames.length) {
        this.frameIndex++;
        changed = true;
      } else if (c.loop) {
        this.frameIndex = 0;
        changed = true;
      } else {
        this.finished = true;
        break;
      }
    }
    return changed;
  }

  frame(): Frame {
    const c = CLIP_MAP[this.clip];
    return c.frames[this.frameIndex] ?? c.frames[0]!;
  }

  /** Next update tick needed, in seconds — lets the world sleep longer when idle. */
  nextChangeIn(): number {
    const c = CLIP_MAP[this.clip];
    return Math.max(0, 1 / c.fps - this.elapsed) / this.speed;
  }
}
