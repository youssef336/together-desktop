// Pure falling-items logic for Coffee Catch (no DOM, unit-tested).

export type DropKind = 'cup' | 'gold' | 'heart' | 'mug';

export interface Drop {
  kind: DropKind;
  x: number;
  y: number;
  vy: number;
}

export interface CatchEvent {
  kind: DropKind;
  x: number;
  y: number;
  caught: boolean;
}

export const GAME_SECONDS = 60;

export class FallingField {
  drops: Drop[] = [];
  elapsed = 0;
  private spawnIn = 0.8;

  constructor(
    private readonly width: number,
    private readonly unit: number, // screen px per sprite px
    private readonly rnd: () => number = Math.random,
  ) {}

  /** 0 → 1 over the round: faster drops, shorter gaps. */
  get heat(): number {
    return Math.min(1, this.elapsed / GAME_SECONDS);
  }

  private pickKind(): DropKind {
    const r = this.rnd();
    const mugChance = this.elapsed < 5 ? 0 : 0.12 + this.heat * 0.1;
    if (r < 0.04) return 'gold';
    if (r < 0.1) return 'heart';
    if (r < 0.1 + mugChance) return 'mug';
    return 'cup';
  }

  /** Advances the field; returns what was caught or missed this step. */
  step(dt: number, catchX: number, catchTop: number, catchBottom: number, groundY: number): CatchEvent[] {
    this.elapsed += dt;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = 0.9 - this.heat * 0.55 + this.rnd() * 0.25;
      const margin = 16 * this.unit;
      this.drops.push({
        kind: this.pickKind(),
        x: margin + this.rnd() * (this.width - margin * 2),
        y: -10 * this.unit,
        vy: (45 + this.heat * 75 + this.rnd() * 20) * this.unit,
      });
    }
    const events: CatchEvent[] = [];
    const reach = 13 * this.unit;
    this.drops = this.drops.filter((d) => {
      d.y += d.vy * dt;
      if (d.y >= catchTop && d.y <= catchBottom && Math.abs(d.x - catchX) <= reach) {
        events.push({ kind: d.kind, x: d.x, y: d.y, caught: true });
        return false;
      }
      if (d.y > groundY + 4 * this.unit) {
        events.push({ kind: d.kind, x: d.x, y: groundY, caught: false });
        return false;
      }
      return true;
    });
    return events;
  }
}

/** Points for a catch: cups grow with the combo, gold is big, hearts heal (or score when full). */
export function scoreFor(kind: DropKind, combo: number, lives: number, maxLives: number): { points: number; lives: number } {
  switch (kind) {
    case 'cup':
      return { points: 1 + Math.floor(combo / 5), lives };
    case 'gold':
      return { points: 5, lives };
    case 'heart':
      return lives < maxLives ? { points: 0, lives: lives + 1 } : { points: 3, lives };
    case 'mug':
      return { points: 0, lives: lives - 1 };
  }
}
