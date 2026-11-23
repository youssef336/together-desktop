/**
 * The small bar at the top during a game: live stats and Stop. When the round ends it turns into a
 * compact result with a ✕, and hides itself after a few seconds.
 */
export class Hud {
  private el: HTMLDivElement;
  private stats: HTMLSpanElement;
  private hint: HTMLSpanElement;
  private button: HTMLButtonElement;
  private dim: HTMLDivElement;
  private title = '';
  private hideTimer = 0;
  onStop: () => void = () => {};
  /** Called when the bar disappears (so the world can drop its hitbox). */
  onHidden: () => void = () => {};

  constructor() {
    this.dim = document.createElement('div');
    this.dim.className = 'td-dim';
    this.dim.hidden = true;
    this.el = document.createElement('div');
    this.el.className = 'td-hud';
    this.el.hidden = true;
    this.el.setAttribute('role', 'status');
    this.stats = document.createElement('span');
    this.hint = document.createElement('span');
    this.hint.className = 'td-hud-hint';
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.addEventListener('click', () => (this.el.classList.contains('td-hud-done') ? this.hide() : this.onStop()));
    this.el.append(this.stats, this.hint, this.button);
    document.body.append(this.dim, this.el);
  }

  show(title: string, hint: string, dim: boolean): void {
    window.clearTimeout(this.hideTimer);
    this.title = title;
    this.el.classList.remove('td-hud-done');
    this.el.hidden = false;
    this.dim.hidden = !dim;
    this.hint.hidden = false;
    this.hint.textContent = hint;
    this.button.textContent = 'Stop';
    this.button.title = 'Stop the game (Esc)';
    this.button.setAttribute('aria-label', 'Stop the game');
    this.set('');
  }

  set(stats: string): void {
    const text = stats ? `${this.title} · ${stats}` : this.title;
    if (this.stats.textContent !== text) this.stats.textContent = text;
  }

  /** Round over: compact result + ✕, gone after a few seconds. */
  result(text: string, seconds = 4): void {
    this.dim.hidden = true;
    this.el.classList.add('td-hud-done');
    this.hint.hidden = true;
    this.stats.textContent = text;
    this.button.textContent = '✕';
    this.button.title = 'Hide';
    this.button.setAttribute('aria-label', 'Hide');
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.hide(), seconds * 1000);
  }

  hide(): void {
    window.clearTimeout(this.hideTimer);
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.dim.hidden = true;
    this.onHidden();
  }

  box(): { x: number; y: number; w: number; h: number } | null {
    if (this.el.hidden) return null;
    const r = this.el.getBoundingClientRect();
    return { x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8 };
  }
}
