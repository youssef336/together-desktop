import type { ActivityId } from '../domain/personality';
import { OBJECTS, type Footprint, type ObjectKind } from './objects';
import { INK, type Painter, seeded } from './paint';

// Scenes: small pixel rooms that sit on the desktop. The couple lives on the floor line inside,
// and furniture gives activities a place (coffee at the table, naps on the bed) and gives you
// things to click.

export const SCENE_W = 200;
export const SCENE_H = 92;
export const FLOOR_Y = 74; // where feet stand

export type Interaction =
  | { kind: 'activity'; id: ActivityId }
  | { kind: 'light' }
  | { kind: 'water' }
  | { kind: 'gift' };

export interface Placed {
  object: ObjectKind;
  x: number;
  /** Floor offset (things on the back wall sit higher). */
  lift?: number;
  /** What a click on it does. */
  interact?: Interaction;
  /** Which activity happens here (coffee at the table, sleep on the bed…). */
  spot?: ActivityId;
}

export interface SceneDef {
  id: string;
  name: string;
  emoji: string;
  /** Static backdrop: wall, floor, fixed decoration. */
  back(g: Painter): void;
  /** Moving parts (rain, stars, waves) — drawn every animation tick. */
  live?(g: Painter, t: number): void;
  objects: Placed[];
}

const floorPlanks = (g: Painter, color: string, line: string) => {
  g.rect(0, FLOOR_Y, SCENE_W, SCENE_H - FLOOR_Y, color);
  g.rect(0, FLOOR_Y, SCENE_W, 1, line);
  for (let y = FLOOR_Y + 5; y < SCENE_H; y += 5) g.rect(0, y, SCENE_W, 1, line);
  for (let x = 12; x < SCENE_W; x += 26) g.rect(x + ((x / 26) % 2) * 9, FLOOR_Y + 1, 1, 4, line);
};

const windowFrame = (g: Painter, x: number, y: number, w: number, h: number, sky: string) => {
  g.rect(x - 2, y - 2, w + 4, h + 4, '#fbf6ee');
  g.rect(x, y, w, h, sky);
  g.rect(x + w / 2, y, 1, h, '#fbf6ee');
  g.rect(x, y + h / 2, w, 1, '#fbf6ee');
  g.rect(x - 3, y + h + 2, w + 6, 2, '#e9d9cd');
};

const stars = (g: Painter, x: number, y: number, w: number, h: number, t: number, n: number, seed: number) => {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const sx = x + Math.floor(r() * w);
    const sy = y + Math.floor(r() * h);
    const twinkle = (Math.floor(t * 2) + i) % 5 === 0;
    g.px(sx, sy, twinkle ? '#ffffff' : '#c9c4f0');
  }
};

const disc = (g: Painter, cx: number, cy: number, r: number, color: string) => {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    g.rect(cx - half, cy + y, half * 2 + 1, 1, color);
  }
};

const rain = (g: Painter, x: number, y: number, w: number, h: number, t: number) => {
  const r = seeded(7);
  for (let i = 0; i < 26; i++) {
    const rx = x + Math.floor(r() * w);
    const speed = 30 + r() * 20;
    const ry = y + ((r() * h + t * speed) % h);
    g.rect(rx, ry, 1, 3, '#a9c4e8');
  }
};

export const SCENES: SceneDef[] = [
  {
    id: 'bedroom',
    name: 'Bedroom',
    emoji: '🛏️',
    back(g) {
      g.rect(0, 0, SCENE_W, FLOOR_Y, '#d9c9e8');
      for (let y = 6; y < FLOOR_Y - 4; y += 8) for (let x = (y / 8) % 2 ? 4 : 8; x < SCENE_W; x += 8) g.px(x, y, '#c6b2da');
      windowFrame(g, 84, 14, 30, 22, '#2f3a66');
      floorPlanks(g, '#b98a62', '#a3764f');
      g.rect(70, FLOOR_Y + 3, 60, 10, '#e8a5a0'); // rug
      g.rect(72, FLOOR_Y + 5, 56, 6, '#f4c3c0');
    },
    live(g, t) {
      stars(g, 84, 14, 30, 22, t, 8, 3);
      g.rect(106, 17, 4, 4, '#f4e3a1');
    },
    objects: [
      { object: 'bed', x: 8, spot: 'sleep', interact: { kind: 'activity', id: 'sleep' } },
      { object: 'lamp', x: 50, interact: { kind: 'light' } },
      { object: 'radio', x: 140, lift: 0, spot: 'dance', interact: { kind: 'activity', id: 'dance' } },
      { object: 'plant', x: 180, interact: { kind: 'water' } },
    ],
  },
  {
    id: 'coffee-shop',
    name: 'Coffee shop',
    emoji: '☕',
    back(g) {
      g.rect(0, 0, SCENE_W, FLOOR_Y, '#e9d2b4');
      for (let y = 40; y < FLOOR_Y; y += 5) for (let x = (y / 5) % 2 ? 0 : 6; x < SCENE_W; x += 12) g.rect(x, y, 11, 4, '#d8b896');
      g.rect(20, 8, 34, 20, '#2f2b3a'); // menu board
      g.rect(23, 12, 18, 1, '#fbf6ee');
      g.rect(23, 16, 24, 1, '#fbf6ee');
      g.rect(23, 20, 14, 1, '#f2c58c');
      for (const x of [90, 130, 170]) {
        g.rect(x, 0, 1, 10, INK);
        g.rect(x - 4, 10, 9, 4, '#f2c58c');
      }
      floorPlanks(g, '#8a5a36', '#6b4226');
    },
    objects: [
      { object: 'counter', x: 4, interact: { kind: 'activity', id: 'talk' } },
      { object: 'table', x: 100, spot: 'coffee', interact: { kind: 'activity', id: 'coffee' } },
      { object: 'plant', x: 182, interact: { kind: 'water' } },
    ],
  },
  {
    id: 'park',
    name: 'Park',
    emoji: '🌳',
    back(g) {
      g.rect(0, 0, SCENE_W, FLOOR_Y, '#bfe3f2');
      g.rect(0, 46, SCENE_W, 28, '#d5eef7');
      g.rect(0, FLOOR_Y - 8, SCENE_W, 8, '#a8d49a');
      g.rect(0, FLOOR_Y, SCENE_W, SCENE_H - FLOOR_Y, '#8cc28a');
      const r = seeded(11);
      for (let i = 0; i < 30; i++) g.px(Math.floor(r() * SCENE_W), FLOOR_Y + 2 + Math.floor(r() * 14), ['#f4a3a3', '#f4e3a1', '#fbf6ee'][i % 3]!);
    },
    live(g, t) {
      const cx = (t * 4) % (SCENE_W + 40) - 30;
      g.rect(cx, 10, 22, 5, '#ffffff');
      g.rect(cx + 4, 7, 12, 3, '#ffffff');
      const cx2 = (t * 2.5 + 110) % (SCENE_W + 40) - 30;
      g.rect(cx2, 22, 16, 4, '#ffffffcc');
    },
    objects: [
      { object: 'tree', x: 10, interact: { kind: 'water' } },
      { object: 'bench', x: 80, spot: 'sit', interact: { kind: 'activity', id: 'sit' } },
      { object: 'lampPost', x: 170, interact: { kind: 'light' } },
    ],
  },
  {
    id: 'beach',
    name: 'Beach',
    emoji: '🏖️',
    back(g) {
      g.rect(0, 0, SCENE_W, 50, '#9fd8ef');
      g.rect(150, 8, 14, 14, '#f4e3a1');
      g.rect(0, 50, SCENE_W, 18, '#5aa6c8');
      g.rect(0, 68, SCENE_W, SCENE_H - 68, '#f2dca6');
      const r = seeded(5);
      for (let i = 0; i < 25; i++) g.px(Math.floor(r() * SCENE_W), 70 + Math.floor(r() * 20), '#e3c584');
    },
    live(g, t) {
      for (let x = 0; x < SCENE_W; x += 8) {
        const y = 52 + Math.round(Math.sin(t * 1.6 + x / 12) * 1.5);
        g.rect(x, y, 5, 1, '#bfe8f7');
      }
      const foam = 66 + Math.round(Math.sin(t * 1.2) * 1.5);
      g.rect(0, foam, SCENE_W, 2, '#ffffff');
    },
    objects: [
      { object: 'palm', x: 12 },
      { object: 'umbrella', x: 70, spot: 'sleep', interact: { kind: 'activity', id: 'sleep' } },
      { object: 'radio', x: 160, spot: 'dance', interact: { kind: 'activity', id: 'dance' } },
    ],
  },
  {
    id: 'rainy-window',
    name: 'Rainy window',
    emoji: '🌧️',
    back(g) {
      g.rect(0, 0, SCENE_W, FLOOR_Y, '#4b5878');
      windowFrame(g, 40, 8, 120, 44, '#2d3a5a');
      floorPlanks(g, '#6b5a6a', '#5a4a5a');
    },
    live(g, t) {
      rain(g, 40, 8, 120, 44, t);
    },
    objects: [
      { object: 'sofa', x: 70, spot: 'sit', interact: { kind: 'activity', id: 'sit' } },
      { object: 'lamp', x: 20, interact: { kind: 'light' } },
      { object: 'table', x: 122, spot: 'coffee', interact: { kind: 'activity', id: 'coffee' } },
      { object: 'plant', x: 178, interact: { kind: 'water' } },
    ],
  },
  {
    id: 'night-sky',
    name: 'Night sky',
    emoji: '🌙',
    back(g) {
      g.rect(0, 0, SCENE_W, FLOOR_Y, '#1e2342');
      g.rect(0, 40, SCENE_W, 34, '#262c52');
      disc(g, 36, 16, 7, '#f4e3a1'); // crescent moon
      disc(g, 39, 14, 6, '#1e2342');
      g.rect(0, FLOOR_Y - 6, SCENE_W, 6, '#2f4a3a');
      g.rect(0, FLOOR_Y, SCENE_W, SCENE_H - FLOOR_Y, '#3c5a46');
    },
    live(g, t) {
      stars(g, 0, 0, SCENE_W, 60, t, 40, 9);
      const shoot = (t * 30) % 400;
      if (shoot < 40) g.rect(120 + shoot, 8 + shoot / 3, 3, 1, '#ffffff');
    },
    objects: [
      { object: 'bench', x: 80, spot: 'sit', interact: { kind: 'activity', id: 'sit' } },
      { object: 'lampPost', x: 150, interact: { kind: 'light' } },
    ],
  },
  {
    id: 'cozy-room',
    name: 'Cozy room',
    emoji: '🔥',
    back(g) {
      g.rect(0, 0, SCENE_W, FLOOR_Y, '#f2d4b6');
      g.rect(0, 50, SCENE_W, 2, '#d9b490');
      for (let x = 6; x < SCENE_W; x += 14) g.rect(x, 52, 1, FLOOR_Y - 52, '#e6c4a0');
      floorPlanks(g, '#a66a43', '#8a5a36');
      g.rect(56, FLOOR_Y + 3, 70, 10, '#b8d8a8');
      g.rect(58, FLOOR_Y + 5, 66, 6, '#cfe6c2');
    },
    objects: [
      { object: 'bookshelf', x: 6 },
      { object: 'fireplace', x: 30, interact: { kind: 'activity', id: 'talk' } },
      { object: 'sofa', x: 92, spot: 'sit', interact: { kind: 'activity', id: 'sit' } },
      { object: 'table', x: 140, spot: 'coffee', interact: { kind: 'activity', id: 'coffee' } },
      { object: 'lamp', x: 180, interact: { kind: 'light' } },
    ],
  },
  {
    id: 'valentine',
    name: "Valentine's room",
    emoji: '💝',
    back(g) {
      g.rect(0, 0, SCENE_W, FLOOR_Y, '#f7d6dc');
      for (let y = 8; y < FLOOR_Y - 6; y += 12) {
        for (let x = (y / 12) % 2 ? 6 : 12; x < SCENE_W; x += 14) {
          g.rect(x, y, 1, 1, '#eaa9b6');
          g.rect(x + 2, y, 1, 1, '#eaa9b6');
          g.rect(x, y + 1, 3, 1, '#eaa9b6');
          g.px(x + 1, y + 2, '#eaa9b6');
        }
      }
      floorPlanks(g, '#c98a8f', '#b07479');
    },
    objects: [
      { object: 'balloons', x: 8, interact: { kind: 'gift' } },
      { object: 'sofa', x: 50, spot: 'sit', interact: { kind: 'activity', id: 'hug' } },
      { object: 'table', x: 110, spot: 'coffee', interact: { kind: 'activity', id: 'coffee' } },
      { object: 'radio', x: 150, spot: 'dance', interact: { kind: 'activity', id: 'dance' } },
      { object: 'plant', x: 180, interact: { kind: 'water' } },
    ],
  },
];

export const SCENE_MAP: Record<string, SceneDef> = Object.fromEntries(SCENES.map((s) => [s.id, s]));

/** Draws a whole scene into a low-res painter and returns where each object landed. */
export function paintScene(g: Painter, def: SceneDef, t: number, lightOn: boolean, withLive = true): Footprint[] {
  def.back(g);
  if (withLive) def.live?.(g, t);
  const feet = def.objects.map((o) => OBJECTS[o.object](g, o.x, FLOOR_Y - (o.lift ?? 0), t, lightOn));
  if (!lightOn) g.rect(0, 0, SCENE_W, SCENE_H, '#141a3a66');
  // frame
  g.rect(0, 0, SCENE_W, 1, INK);
  g.rect(0, SCENE_H - 1, SCENE_W, 1, INK);
  g.rect(0, 0, 1, SCENE_H, INK);
  g.rect(SCENE_W - 1, 0, 1, SCENE_H, INK);
  return feet;
}

/** Spot x (centre of the object) for an activity in this scene, if it has one. */
export function spotFor(def: SceneDef, activity: ActivityId): Placed | null {
  return def.objects.find((o) => o.spot === activity) ?? null;
}
