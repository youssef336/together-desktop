import { pickExchange } from '../domain/dialogue';
import { newId } from '../domain/models';
import { clickReactionWeights, weightedPick } from '../domain/personality';
import type { Actor } from '../engine/actor';
import { store } from '../data/store';
import { world as native } from '../platform/bridge';
import type { GameController } from './games/controller';
import type { Interactions } from './interact';
import type { ContextMenu } from './menu';
import type { World } from './runtime';
import type { Corner } from './scene-layer';

const DRAG_START_PX = 5;
const DOUBLE_CLICK_MS = 320;
const PICKUP_LINES = ['Whoa!', 'Eek!', 'Wheee!', 'Where are we going?', 'Hey! 😳'];
const PARTNER_LINES = ['Are you okay?', 'Careful!', 'Hey, bring them back!', 'Hehe, flying?'];

/** Pointer handling: click reactions, double-click quick menu, right-click menu, drag and drop, hover. */
export function wireInput(canvas: HTMLCanvasElement, w: World, menu: ContextMenu, games: GameController, talk: Interactions): void {
  let down: { actor: Actor; x: number; y: number; offX: number; offY: number; dragging: boolean; at: number } | null = null;
  let lastClick: { id: string; at: number; timer: number } | null = null;
  /** Moving or resizing the scene. */
  let sceneDrag: {
    kind: 'move' | Corner;
    x: number;
    y: number;
    offX: number;
    offY: number;
    moved: boolean;
    obj: ReturnType<typeof w.scene.objectAt>;
    startScale: number;
    startW: number;
    startH: number;
    anchor: { x: number; y: number };
    at: number;
  } | null = null;
  /** A drag needs the button actually held a moment — quick clicks never move things. */
  const isRealDrag = (e: PointerEvent, since: number) => (e.buttons & 1) === 1 && performance.now() - since > 90;
  const hoverWaveAt = new Map<string, number>();
  const drags = new Map<string, number[]>();

  const actorAt = (x: number, y: number) => {
    const id = w.renderer.hitTest(x, y);
    return id ? (w.actors.find((a) => a.id === id) ?? null) : null;
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (games.pointerDown(e.clientX, e.clientY)) return;
    if (w.game) return; // bubble games: the desktop under the characters stays as it is
    menu.close();
    const actor = actorAt(e.clientX, e.clientY);
    if (!actor) {
      if (!w.scene.contains(e.clientX, e.clientY) && !w.scene.handleAt(e.clientX, e.clientY)) return;
      // Press inside the scene: a click uses the object under it; a drag moves the scene;
      // a drag from any corner resizes it (the opposite corner stays put).
      canvas.setPointerCapture(e.pointerId);
      const corner = w.scene.handleAt(e.clientX, e.clientY);
      const r = w.scene.rect;
      sceneDrag = {
        kind: corner ?? 'move',
        x: e.clientX,
        y: e.clientY,
        offX: w.scene.rect.x - e.clientX,
        offY: w.scene.rect.y - e.clientY,
        moved: false,
        obj: w.scene.objectAt(e.clientX, e.clientY),
        startScale: w.scene.scale,
        startW: r.w,
        startH: r.h,
        anchor: { x: corner === 'nw' || corner === 'sw' ? r.x + r.w : r.x, y: corner === 'nw' || corner === 'ne' ? r.y + r.h : r.y },
        at: performance.now(),
      };
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    down = { actor, x: e.clientX, y: e.clientY, offX: actor.x - e.clientX, offY: actor.y - e.clientY, dragging: false, at: performance.now() };
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!sceneDrag && !down) {
      // Corners are invisible handles: show a resize cursor over them.
      const c = w.game ? null : w.scene.handleAt(e.clientX, e.clientY);
      canvas.style.cursor = c === 'nw' || c === 'se' ? 'nwse-resize' : c ? 'nesw-resize' : '';
    }
    if (games.pointerMove(e.clientX, e.clientY)) return;
    if (sceneDrag) {
      if (!sceneDrag.moved && (Math.hypot(e.clientX - sceneDrag.x, e.clientY - sceneDrag.y) < DRAG_START_PX || !isRealDrag(e, sceneDrag.at))) return;
      if (!sceneDrag.moved) {
        sceneDrag.moved = true;
        void native.setCapture(true);
      }
      const view = w.renderer.view;
      const before = { ...w.scene.rect, floor: w.scene.floorY };
      if (sceneDrag.kind === 'move') w.scene.moveTo(e.clientX + sceneDrag.offX, e.clientY + sceneDrag.offY, view);
      else {
        const d = sceneDrag;
        const dx = (e.clientX - d.x) * (d.kind === 'nw' || d.kind === 'sw' ? -1 : 1);
        const dy = (e.clientY - d.y) * (d.kind === 'nw' || d.kind === 'ne' ? -1 : 1);
        // Follow whichever direction the mouse pulls more, so diagonal drags feel natural.
        const ratio = Math.max(0.1, ((d.startW + dx) / d.startW + (d.startH + dy) / d.startH) / 2);
        w.scene.resizeTo(d.startScale * ratio, view, d.kind as Corner, d.anchor);
      }
      // They live in it: carry them along, keeping their place on the floor.
      for (const a of w.actors) {
        if (a.mode === 'dragged') continue;
        const rel = (a.x - before.x) / before.w;
        a.x = w.scene.rect.x + rel * w.scene.rect.w;
        a.y = w.scene.floorY;
        if (a.target) a.target = null;
      }
      w.renderer.dirty = true;
      w.kick();
      return;
    }
    if (!down) return;
    const { actor } = down;
    if (!down.dragging) {
      if (w.settings.locked || Math.hypot(e.clientX - down.x, e.clientY - down.y) < DRAG_START_PX || !isRealDrag(e, down.at)) return;
      down.dragging = true;
      if (w.runner && [w.runner.ctx.initiator, w.runner.ctx.partner].includes(actor)) {
        w.runner.finish();
        w.runner = null;
        w.publishStatus();
      }
      actor.mode = 'dragged';
      actor.target = null;
      actor.animator.play('dangle', { force: true, then: 'dangle' });
      if (w.rnd() < 0.6) w.say(actor, PICKUP_LINES[Math.floor(w.rnd() * PICKUP_LINES.length)]!);
      void native.setCapture(true);
    }
    actor.x = e.clientX + down.offX;
    actor.y = e.clientY + down.offY;
    w.clampAll();
    w.renderer.dirty = true;
    w.kick();
  });

  const release = (e: PointerEvent) => {
    if (sceneDrag) {
      const d = sceneDrag;
      sceneDrag = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (d.moved) {
        void native.setCapture(false);
        w.clampAll();
        void w.patchSettings(w.scene.persisted(w.renderer.view));
      } else if (d.obj) w.useObject(d.obj);
      return;
    }
    if (!down) return;
    const { actor, dragging } = down;
    down = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (dragging) {
      void native.setCapture(false);
      actor.mode = 'free';
      w.clampAll(); // back inside the scene floor, if there is one
      actor.nextThinkAt = w.time + 5;
      actor.animator.play('land', { force: true });
      w.savePosition(actor);
      const partner = w.actors.find((a) => a !== actor);
      if (partner && partner.mode === 'free' && w.rnd() < 0.3 + partner.character.personality.affection / 200) {
        partner.faceTowards(actor);
        partner.animator.play('surprise', { force: true });
        w.say(partner, PARTNER_LINES[Math.floor(w.rnd() * PARTNER_LINES.length)]!);
      }
      void store.logEvent({ id: newId(), type: 'drag', timestamp: Date.now(), characterIds: [actor.id] });
      // Tossed around a lot in a short time → a little dizzy and grumpy.
      const times = [...(drags.get(actor.id) ?? []).filter((t) => w.time - t < 30), w.time];
      drags.set(actor.id, times);
      if (times.length >= 4) {
        drags.set(actor.id, []);
        w.mood(actor, 'dragged-a-lot');
        window.setTimeout(() => {
          actor.animator.play('pout', { force: true });
          w.say(actor, "I'm dizzy... stop it 😵‍💫");
        }, 700);
      }
      w.kick();
      return;
    }
    // Click vs double click.
    const now = performance.now();
    if (lastClick && lastClick.id === actor.id && now - lastClick.at < DOUBLE_CLICK_MS) {
      window.clearTimeout(lastClick.timer);
      lastClick = null;
      menu.open(actor, e.clientX, e.clientY, 'quick');
      return;
    }
    const timer = window.setTimeout(() => {
      if (talk.shouldAsk()) void talk.ask(actor);
      else react(w, actor);
    }, DOUBLE_CLICK_MS);
    lastClick = { id: actor.id, at: now, timer };
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (w.game) return;
    const actor = actorAt(e.clientX, e.clientY);
    if (actor) menu.open(actor, e.clientX, e.clientY, 'full');
  });

  // Hover: the cursor position arrives from Rust (the window is click-through most of the time).
  w.onCursor = (x, y) => {
    if (!w.settings.mouseReactions || w.paused || w.game) return;
    let changed = false;
    for (const a of w.actors) {
      if (a.mode !== 'free' || !a.arrived) {
        if (a.look !== 0) {
          a.look = 0;
          changed = true;
        }
        continue;
      }
      const headY = a.y - w.px(26);
      const dist = Math.hypot(x - a.x, y - headY);
      const look: -1 | 0 | 1 = dist < w.px(70) ? ((Math.sign(x - a.x) * a.facing) as -1 | 0 | 1) : 0;
      if (look !== a.look) {
        a.look = look;
        changed = true;
      }
      const last = hoverWaveAt.get(a.id) ?? -999;
      if (dist < w.px(28) && w.time - last > 25 && a.animator.clip === 'idle') {
        hoverWaveAt.set(a.id, w.time);
        a.animator.play(w.rnd() < 0.5 ? 'wave' : 'happy');
        changed = true;
      }
    }
    if (changed) {
      w.renderer.dirty = true;
      w.kick();
    }
  };
}

/** A single click: the personality picks the reaction. */
function react(w: World, actor: Actor): void {
  if (actor.mode === 'dragged') return;
  const kind = weightedPick(clickReactionWeights(actor.character.personality), w.rnd);
  const partner = w.actors.find((a) => a !== actor);
  switch (kind) {
    case 'wave':
      actor.animator.play('wave', { force: true });
      break;
    case 'jump':
      actor.animator.play('jump', { force: true });
      break;
    case 'heart':
      actor.animator.play('happy', { force: true });
      w.effect('heart', actor.x, actor.y - w.px(36), 1.2);
      break;
    case 'talk': {
      const line = pickExchange('reaction', {
        tone: actor.character.personality.dialogueTone,
        custom: w.couple?.dialogue.customLines ?? [],
        disabled: w.couple?.dialogue.disabledCategories ?? [],
        recent: [],
      });
      actor.animator.play('talk', { force: true, then: 'idle' });
      if (line) w.say(actor, line.first.replaceAll('{you}', partner?.character.nickname ?? ''));
      break;
    }
    case 'surprise':
      actor.animator.play('surprise', { force: true });
      w.effect('sweat', actor.x + w.px(8) * actor.facing, actor.y - w.px(34), 1);
      break;
    case 'blush':
      actor.animator.play('blush', { force: true });
      w.say(actor, '...hi 😳');
      break;
  }
  actor.nextThinkAt = w.time + 4;
  w.mood(actor, 'poked');
  void store.logEvent({ id: newId(), type: 'click', timestamp: Date.now(), characterIds: [actor.id], dialogue: kind });
  w.renderer.dirty = true;
  w.kick();
}
