import type { Actor } from '../engine/actor';
import type { World } from './runtime';

export interface ChoiceOption {
  label: string;
  value: string;
}

/**
 * A speech bubble with buttons, above a character. DOM (so it is clickable and accessible),
 * styled like the canvas bubbles. Its box joins the hitboxes so clicks are not passed through.
 */
export class ChoiceBubble {
  private el: HTMLDivElement;
  private actor: Actor | null = null;
  private resolve: ((v: string | null) => void) | null = null;
  private timer = 0;

  constructor(private readonly w: World) {
    this.el = document.createElement('div');
    this.el.className = 'td-choice';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    document.body.appendChild(this.el);
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  /** Resolves with the chosen value, or null if it timed out or was dismissed. */
  ask(actor: Actor, text: string, options: ChoiceOption[], timeoutSec = 14): Promise<string | null> {
    this.close(null);
    this.actor = actor;
    const q = document.createElement('p');
    q.textContent = text;
    const row = document.createElement('div');
    row.className = 'td-choice-row';
    for (const o of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.label;
      b.addEventListener('click', () => this.close(o.value));
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      row.appendChild(b);
    }
    this.el.replaceChildren(q, row);
    this.el.setAttribute('aria-label', text);
    this.el.hidden = false;
    this.place();
    this.timer = window.setTimeout(() => this.close(null), timeoutSec * 1000);
    return new Promise((r) => (this.resolve = r));
  }

  /** A bubble with a text field (rename). Resolves with the text, or null when cancelled. */
  askText(actor: Actor, prompt: string, initial: string, maxLength = 24): Promise<string | null> {
    this.close(null);
    this.actor = actor;
    const q = document.createElement('p');
    q.textContent = prompt;
    const input = document.createElement('input');
    input.className = 'td-choice-input';
    input.value = initial;
    input.maxLength = maxLength;
    const row = document.createElement('div');
    row.className = 'td-choice-row';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = 'Save';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    const submit = () => {
      const v = input.value.trim();
      this.close(v ? v : null);
    };
    ok.addEventListener('click', submit);
    cancel.addEventListener('click', () => this.close(null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') this.close(null);
    });
    row.append(ok, cancel);
    this.el.replaceChildren(q, input, row);
    this.el.hidden = false;
    this.place();
    input.focus();
    input.select();
    this.timer = window.setTimeout(() => this.close(null), 60_000);
    return new Promise((r) => (this.resolve = r));
  }

  /** Keeps the bubble above its character (called each render). */
  place(): void {
    if (!this.actor || this.el.hidden) return;
    const s = this.w.scale;
    const r = this.el.getBoundingClientRect();
    const headTop = this.actor.y - 36 * s;
    let top = headTop - r.height - 10;
    if (top < 6) top = this.actor.y + 10;
    const left = Math.max(6, Math.min(window.innerWidth - r.width - 6, this.actor.x - r.width / 2));
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
    this.el.style.setProperty('--tail', `${Math.max(14, Math.min(r.width - 14, this.actor.x - left))}px`);
    const box = { x: left - 4, y: top - 4, w: r.width + 8, h: r.height + 8 };
    const prev = this.w.renderer.extraHit.get('choice')?.[0];
    if (!prev || Math.abs(prev.x - box.x) > 1 || Math.abs(prev.y - box.y) > 1 || prev.w !== box.w || prev.h !== box.h) {
      this.w.renderer.extraHit.set('choice', [box]);
      // Report the new hitbox to Rust right away, or the first click would fall through to the desktop.
      this.w.renderer.dirty = true;
      this.w.kick();
    }
  }

  close(value: string | null): void {
    window.clearTimeout(this.timer);
    if (!this.el.hidden) {
      this.el.hidden = true;
      this.w.renderer.extraHit.delete('choice');
      this.w.renderer.dirty = true;
      this.w.kick();
    }
    const r = this.resolve;
    this.resolve = null;
    this.actor = null;
    r?.(value);
  }
}
