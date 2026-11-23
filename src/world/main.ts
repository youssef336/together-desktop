import '@fontsource/pixelify-sans/400.css';
import './world.css';
import { EVENTS, on, world as native } from '../platform/bridge';
import type { ActivityId } from '../domain/personality';
import { wireInput } from './input';
import { ContextMenu } from './menu';
import { World } from './runtime';
import { scheduleDailyGreetings } from './daily';
import { ChoiceBubble } from './choice';
import { GameController } from './games/controller';
import type { GameId } from './games/types';
import { Interactions } from './interact';

if (import.meta.env.DEV) {
  const fwd = (kind: string) => (...args: unknown[]) => void native.log(`${kind} ${args.map((a) => (a instanceof Error ? a.stack : typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`);
  const origError = console.error;
  console.error = (...a: unknown[]) => {
    origError(...a);
    fwd('error')(...a);
  };
  window.addEventListener('error', (e) => fwd('uncaught')(e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', (e) => fwd('rejection')(String(e.reason)));
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('world') as HTMLCanvasElement;
  const w = new World(canvas);
  const menu = new ContextMenu(w);
  const choice = new ChoiceBubble(w);
  const games = new GameController(w, choice, menu);
  const talk = new Interactions(w, choice, games);
  menu.attach(games, talk);
  w.onRender = () => choice.place();
  wireInput(canvas, w, menu, games, talk);
  await document.fonts.load('16px "Pixelify Sans"').catch(() => undefined);
  await w.load();

  window.addEventListener('resize', () => {
    w.renderer.resize();
    w.scene.layout(w.renderer.view);
    w.clampAll();
    w.kick();
  });
  await on<{ from?: string } | null>(EVENTS.dataChanged, (p) => {
    if (p?.from !== 'world') void w.load();
  });
  await on<ActivityId>(EVENTS.activity, (id) => {
    if (!games.playing) w.startActivity(id);
  });
  await on<{ id: GameId; playerId?: string }>(EVENTS.game, (p) => games.start(p.id, p.playerId));
  await on<{ x: number; y: number }>(EVENTS.cursor, (c) => w.onCursor(c.x, c.y));
  await on<string>(EVENTS.command, (cmd) => {
    if (cmd === 'toggle-pause') void w.patchSettings({ paused: !w.settings.paused });
    if (cmd === 'hidden') {
      menu.close();
      choice.close(null);
      games.stop();
      if (!w.settings.hidden && w.actors.length > 0) void w.patchSettings({ hidden: true });
    }
    if (cmd === 'shown' && w.settings.hidden) void w.patchSettings({ hidden: false });
    if (cmd === 'reload') void w.load();
    if (cmd.startsWith('show:')) void w.setShow(cmd.slice(5) as 'both' | 'a' | 'b');
    if (cmd === 'stop-game') games.stop();
    if (cmd.startsWith('scene:')) {
      const id = cmd.slice(6);
      void w.patchSettings({ scene: id === 'none' ? null : id }).then(() => w.load());
    }
  });
  scheduleDailyGreetings(w);
  // Exposed for debugging from the devtools console only.
  (window as unknown as { together: World }).together = w;
}

void boot();
