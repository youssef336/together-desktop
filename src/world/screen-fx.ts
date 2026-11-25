import type { ScreenTone } from '../engine/activity';

const FADE_IN = 0.6;
const FADE_OUT = 1.2;

/** Edge colour and strength of each tone; the centre of the screen stays clear. */
const TONE: Record<ScreenTone, { edge: string; wash: string; strength: number }> = {
  angry: { edge: '224, 64, 64', wash: '224, 64, 64', strength: 0.26 },
  sulk: { edge: '70, 80, 115', wash: '70, 80, 115', strength: 0.3 },
  love: { edge: '255, 150, 185', wash: '255, 214, 150', strength: 0.34 },
};

/**
 * The screen's mood for a moment (fights): a red glow at the edges while they fight, a grey one
 * while they sulk, a warm pink-gold one with a soft light around them when they make up.
 * Also a small shake for big hits. It never takes clicks: the world's hitboxes don't change.
 */
export class ScreenFx {
  private tone: ScreenTone | null = null;
  private prevTone: ScreenTone | null = null;
  private t = 0;
  private dur = 0;
  /** Cross-fade from the previous tone. */
  private prevAlpha = 0;
  private shakeLeft = 0;
  private shakePower = 0;
  offset = { x: 0, y: 0 };

  get active(): boolean {
    return this.tone !== null || this.prevAlpha > 0 || this.shakeLeft > 0;
  }

  get current(): ScreenTone | null {
    return this.tone;
  }

  set(tone: ScreenTone, seconds: number): void {
    const same = this.tone === tone;
    if (this.tone && !same) {
      this.prevTone = this.tone;
      this.prevAlpha = this.alpha();
    }
    this.tone = tone;
    // The same tone again just lasts longer (no second fade-in).
    this.t = same ? Math.min(this.t, FADE_IN) : 0;
    this.dur = this.t + Math.max(seconds, FADE_IN + FADE_OUT);
  }

  /** Ends a tone at once (a cancelled fight). */
  clear(): void {
    this.tone = null;
    this.prevAlpha = 0;
    this.shakeLeft = 0;
    this.offset = { x: 0, y: 0 };
  }

  shake(power: number, seconds = 0.25): void {
    this.shakePower = Math.max(this.shakeLeft > 0 ? this.shakePower : 0, power);
    this.shakeLeft = Math.max(this.shakeLeft, seconds);
  }

  private alpha(): number {
    if (!this.tone) return 0;
    const fin = Math.min(1, this.t / FADE_IN);
    const fout = Math.min(1, Math.max(0, (this.dur - this.t) / FADE_OUT));
    return Math.min(fin, fout);
  }

  update(dt: number, scale: number, rnd: () => number): void {
    if (this.tone) {
      this.t += dt;
      if (this.t >= this.dur) this.tone = null;
    }
    if (this.prevAlpha > 0) this.prevAlpha = Math.max(0, this.prevAlpha - dt / FADE_OUT);
    if (this.shakeLeft > 0) {
      this.shakeLeft -= dt;
      const p = this.shakePower * (scale / 3) * 2;
      this.offset = this.shakeLeft > 0 ? { x: Math.round((rnd() - 0.5) * p * 2), y: Math.round((rnd() - 0.5) * p) } : { x: 0, y: 0 };
    }
  }

  /** Draws under the characters. `focus` = where the couple is (the warm light gathers there). */
  draw(ctx: CanvasRenderingContext2D, view: { w: number; h: number }, focus: { x: number; y: number } | null, time: number): void {
    if (this.prevTone && this.prevAlpha > 0) this.paint(ctx, view, this.prevTone, this.prevAlpha, focus, time);
    if (this.tone) this.paint(ctx, view, this.tone, this.alpha(), focus, time);
  }

  private paint(ctx: CanvasRenderingContext2D, view: { w: number; h: number }, tone: ScreenTone, a: number, focus: { x: number; y: number } | null, time: number): void {
    const spec = TONE[tone];
    // A slow pulse while they fight, a gentle breathing glow when they make up.
    const pulse = tone === 'angry' ? 0.85 + 0.15 * Math.sin(time * 6) : tone === 'love' ? 0.9 + 0.1 * Math.sin(time * 2) : 1;
    const k = spec.strength * a * pulse;
    const cx = view.w / 2;
    const cy = view.h / 2;
    const r = Math.hypot(cx, cy);
    ctx.save();
    const edge = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
    edge.addColorStop(0, `rgba(${spec.edge}, 0)`);
    edge.addColorStop(1, `rgba(${spec.edge}, ${k})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = `rgba(${spec.wash}, ${k * 0.18})`;
    ctx.fillRect(0, 0, view.w, view.h);
    if (tone === 'love' && focus) {
      const fr = Math.min(view.w, view.h) * 0.35;
      const glow = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, fr);
      glow.addColorStop(0, `rgba(255, 236, 180, ${0.45 * a * pulse})`);
      glow.addColorStop(0.5, `rgba(255, 170, 200, ${0.18 * a})`);
      glow.addColorStop(1, 'rgba(255, 170, 200, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(focus.x - fr, focus.y - fr, fr * 2, fr * 2);
    }
    ctx.restore();
  }
}
