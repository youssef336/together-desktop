import type { ActivityId } from '../domain/personality';
import { ACTIVITIES } from '../engine/activities';
import type { Actor } from '../engine/actor';
import type { ClipId } from '../engine/clips';
import { openMain, world as native } from '../platform/bridge';
import type { World } from './runtime';

const QUICK: ActivityId[] = ['hug', 'coffee', 'talk', 'dance'];
const FULL: ActivityId[] = ['talk', 'hug', 'dance', 'walk', 'coffee', 'play', 'sit', 'sleep'];
const SOLO: { clip: ClipId; label: string }[] = [
  { clip: 'wave', label: 'Wave' },
  { clip: 'jump', label: 'Jump' },
  { clip: 'cheer', label: 'Cheer' },
  { clip: 'think', label: 'Look around' },
  { clip: 'sit', label: 'Sit' },
];

/**
 * The right-click / double-click menu, drawn as DOM inside the world window. Its rectangle is
 * added to the hitboxes so clicks on it are not passed through to the desktop.
 */
export class ContextMenu {
  private el: HTMLDivElement;

  constructor(private readonly w: World) {
    this.el = document.createElement('div');
    this.el.className = 'td-menu';
    this.el.hidden = true;
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => e.key === 'Escape' && this.close());
  }

  get isOpen(): boolean {
    return !this.el.hidden;
  }

  open(actor: Actor, x: number, y: number, kind: 'quick' | 'full'): void {
    const w = this.w;
    const el = this.el;
    el.replaceChildren();
    const name = document.createElement('div');
    name.className = 'td-menu-title';
    name.textContent = actor.character.nickname || actor.character.name;
    el.appendChild(name);

    const item = (label: string, fn: () => void, opts: { checked?: boolean } = {}) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = (opts.checked ? '✓ ' : '') + label;
      b.addEventListener('click', () => {
        this.close();
        fn();
      });
      el.appendChild(b);
    };
    const sep = () => el.appendChild(Object.assign(document.createElement('hr'), {}));

    const couple = w.actors.length === 2;
    for (const id of kind === 'quick' ? QUICK : FULL) {
      if (!couple) break;
      const def = ACTIVITIES[id];
      item(`${def.emoji}  ${def.label}`, () => w.startActivity(id, actor.id));
    }
    if (kind === 'full') {
      sep();
      for (const s of SOLO) item(s.label, () => actor.animator.play(s.clip, { force: true }));
      sep();
      item('Edit character…', () => void openMain(`editor:${actor.id}`));
      item('Change couple…', () => void openMain('couple'));
      item('Settings…', () => void openMain('settings'));
      sep();
      item('Lock positions', () => void w.patchSettings({ locked: !w.settings.locked }), { checked: w.settings.locked });
      item(w.settings.paused ? 'Resume' : 'Pause', () => void w.patchSettings({ paused: !w.settings.paused }));
      item('Hide characters', () => void native.hide());
    } else {
      sep();
      item('More…', () => this.open(actor, x, y, 'full'));
    }

    el.hidden = false;
    const r = el.getBoundingClientRect();
    const left = Math.min(x + 8, window.innerWidth - r.width - 8);
    const top = Math.max(8, Math.min(y - r.height / 2, window.innerHeight - r.height - 8));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    w.renderer.extraHit = [{ x: left - 4, y: top - 4, w: r.width + 8, h: r.height + 8 }];
    // While the menu is open, a click anywhere else closes it — so capture the whole window.
    void native.setCapture(true);
    w.renderer.dirty = true;
    w.kick();
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.w.renderer.extraHit = [];
    void native.setCapture(false);
    this.w.renderer.dirty = true;
    this.w.kick();
  }
}
