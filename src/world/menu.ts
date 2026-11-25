import type { ActivityId } from '../domain/personality';
import { isNaughty, type MischiefPace, type MischiefPrefs, mischiefOf, PACE_LABEL } from '../domain/mischief';
import { ACTIVITIES } from '../engine/activities';
import type { Actor } from '../engine/actor';
import type { ClipId } from '../engine/clips';
import { openMain, world as native } from '../platform/bridge';
import type { GameController } from './games/controller';
import { GAMES } from './games/registry';
import { GAME_IDS } from './games/types';
import type { Interactions } from './interact';
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
  private games: GameController | null = null;
  private talk: Interactions | null = null;

  attach(games: GameController, talk: Interactions): void {
    this.games = games;
    this.talk = talk;
  }

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
    const sub = (label: string, build: () => void) => item(`${label} ▸`, () => {
      this.open(actor, x, y, 'full');
      el.replaceChildren(name);
      build();
      this.reposition(x, y);
    });
    item('💬  Talk to me', () => void this.talk?.ask(actor));
    sub('🎮  Play with me', () => {
      for (const id of GAME_IDS) {
        const g = GAMES[id];
        const best = w.settings.highScores[id];
        item(`${g.emoji}  ${g.title}${best ? `  (best ${best})` : ''}`, () => this.games?.start(id, actor.id));
      }
    });
    sep();
    for (const id of kind === 'quick' ? QUICK : FULL) {
      if (!couple) break;
      const def = ACTIVITIES[id];
      item(`${def.emoji}  ${def.label}`, () => w.startActivity(id, actor.id));
    }
    if (kind === 'full') {
      sep();
      for (const s of SOLO) item(s.label, () => actor.animator.play(s.clip, { force: true }));
      sep();
      sub('😈  Mischief', () => {
        const prefs = mischiefOf(w.settings, actor.id);
        const set = (patch: Partial<MischiefPrefs>) => this.setMischief(actor, { ...prefs, ...patch });
        item('Grab my mouse and run', () => set({ grab: !prefs.grab }), { checked: prefs.grab });
        item('Close my browser tab', () => set({ tab: !prefs.tab }), { checked: prefs.tab });
        sep();
        for (const pace of Object.keys(PACE_LABEL) as MischiefPace[]) {
          item(PACE_LABEL[pace], () => set({ pace }), { checked: prefs.pace === pace });
        }
        if (isNaughty(prefs)) {
          sep();
          item('Do it now! 😈', () => void w.mischief.start(actor));
        }
      });
      item('✏️  Rename…', () => void this.talk?.rename(actor));
      item('Edit character…', () => void openMain(`editor:${actor.id}`));
      item('Change couple…', () => void openMain('couple'));
      item('Settings…', () => void openMain('settings'));
      sep();
      item('Lock positions', () => void w.patchSettings({ locked: !w.settings.locked }), { checked: w.settings.locked });
      item(w.settings.paused ? 'Resume' : 'Pause', () => void w.patchSettings({ paused: !w.settings.paused }));
      if (w.couple) {
        const side = w.couple.characterAId === actor.id ? 'a' : 'b';
        if (couple) {
          const partner = w.actors.find((a) => a !== actor)!;
          item(`Send ${partner.character.nickname || partner.character.name} away`, () => void w.setShow(side));
          item('Only show the other one', () => void w.setShow(side === 'a' ? 'b' : 'a'));
        } else {
          item('Bring my partner back ♥', () => void w.setShow('both'));
        }
      }
      item('Hide characters', () => void native.hide());
    } else {
      sep();
      item('More…', () => this.open(actor, x, y, 'full'));
    }

    const credit = document.createElement('div');
    credit.className = 'td-menu-credit';
    credit.textContent = 'Bello Together ♥';
    el.appendChild(credit);
    el.hidden = false;
    this.reposition(x, y);
  }

  private setMischief(actor: Actor, prefs: MischiefPrefs): void {
    const w = this.w;
    void w.patchSettings({ mischief: { ...w.settings.mischief, [actor.id]: prefs } }).then(() => w.syncCursorFeed());
  }

  private reposition(x: number, y: number): void {
    const w = this.w;
    const el = this.el;
    const r = el.getBoundingClientRect();
    const left = Math.min(x + 8, window.innerWidth - r.width - 8);
    const top = Math.max(8, Math.min(y - r.height / 2, window.innerHeight - r.height - 8));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    w.renderer.extraHit.set('menu', [{ x: left - 4, y: top - 4, w: r.width + 8, h: r.height + 8 }]);
    // While the menu is open, a click anywhere else closes it — so capture the whole window.
    void native.setCapture(true);
    w.renderer.dirty = true;
    w.kick();
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.w.renderer.extraHit.delete('menu');
    void native.setCapture(false);
    this.w.renderer.dirty = true;
    this.w.kick();
  }
}
