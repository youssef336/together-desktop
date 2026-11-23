import '@fontsource/pixelify-sans/400.css';
import './world.css';
import { EVENTS, on } from '../platform/bridge';
import type { ActivityId } from '../domain/personality';
import { wireInput } from './input';
import { ContextMenu } from './menu';
import { World } from './runtime';
import { scheduleDailyGreetings } from './daily';

async function boot(): Promise<void> {
  const canvas = document.getElementById('world') as HTMLCanvasElement;
  const w = new World(canvas);
  const menu = new ContextMenu(w);
  wireInput(canvas, w, menu);
  await document.fonts.load('16px "Pixelify Sans"').catch(() => undefined);
  await w.load();

  window.addEventListener('resize', () => {
    w.renderer.resize();
    w.clampAll();
    w.kick();
  });
  await on<{ from?: string } | null>(EVENTS.dataChanged, (p) => {
    if (p?.from !== 'world') void w.load();
  });
  await on<ActivityId>(EVENTS.activity, (id) => w.startActivity(id));
  await on<{ x: number; y: number }>(EVENTS.cursor, (c) => w.onCursor(c.x, c.y));
  await on<string>(EVENTS.command, (cmd) => {
    if (cmd === 'toggle-pause') void w.patchSettings({ paused: !w.settings.paused });
    if (cmd === 'hidden') {
      menu.close();
      if (!w.settings.hidden && w.actors.length > 0) void w.patchSettings({ hidden: true });
    }
    if (cmd === 'shown' && w.settings.hidden) void w.patchSettings({ hidden: false });
    if (cmd === 'reload') void w.load();
  });
  scheduleDailyGreetings(w);
  // Exposed for debugging from the devtools console only.
  (window as unknown as { together: World }).together = w;
}

void boot();
