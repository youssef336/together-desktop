import { INK, type Painter } from './paint';

// Scene furniture. Every painter draws with its bottom on `floor` and its left edge at `x`,
// and returns its footprint so the scene can make it clickable.

export interface Footprint {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Draw = (g: Painter, x: number, floor: number, t: number, on: boolean) => Footprint;

const box = (x: number, y: number, w: number, h: number): Footprint => ({ x, y, w, h });

export const OBJECTS = {
  bed: ((g, x, f) => {
    g.rect(x, f - 14, 3, 14, '#8a5a36'); // headboard
    g.rect(x + 1, f - 13, 1, 12, '#a66a43');
    g.rect(x + 3, f - 8, 34, 6, '#f6f1e9'); // mattress + sheet
    g.rect(x + 3, f - 8, 34, 1, INK);
    g.rect(x + 13, f - 9, 24, 5, '#e8a5a0'); // blanket
    g.rect(x + 13, f - 5, 24, 1, '#c97c78');
    g.rect(x + 4, f - 11, 8, 3, '#fbf6ee'); // pillow
    g.rect(x + 3, f - 2, 34, 2, '#8a5a36');
    g.rect(x + 36, f - 6, 2, 6, '#8a5a36');
    return box(x, f - 14, 38, 14);
  }) as Draw,
  sofa: ((g, x, f) => {
    g.rect(x, f - 14, 32, 7, '#d97b6c'); // back
    g.rect(x, f - 14, 32, 1, INK);
    g.rect(x - 2, f - 10, 4, 8, '#c9665a'); // arms
    g.rect(x + 30, f - 10, 4, 8, '#c9665a');
    g.rect(x + 2, f - 8, 28, 5, '#e8907f'); // seat
    g.rect(x + 15, f - 8, 1, 5, '#c9665a');
    g.rect(x, f - 3, 32, 1, '#a8524a');
    g.rect(x, f - 2, 2, 2, INK);
    g.rect(x + 30, f - 2, 2, 2, INK);
    return box(x - 2, f - 14, 36, 14);
  }) as Draw,
  bench: ((g, x, f) => {
    g.rect(x, f - 12, 30, 2, '#a66a43');
    g.rect(x, f - 9, 30, 2, '#a66a43');
    g.rect(x, f - 6, 30, 2, '#8a5a36');
    g.rect(x + 2, f - 4, 2, 4, INK);
    g.rect(x + 26, f - 4, 2, 4, INK);
    return box(x, f - 12, 30, 12);
  }) as Draw,
  table: ((g, x, f, t) => {
    g.rect(x, f - 11, 22, 2, '#a66a43');
    g.rect(x, f - 9, 22, 1, '#8a5a36');
    g.rect(x + 9, f - 8, 4, 8, '#8a5a36');
    g.rect(x + 6, f - 1, 10, 1, '#6b4226');
    // two cups with steam
    for (const cx of [x + 4, x + 14]) {
      g.rect(cx, f - 15, 4, 4, '#fbf6ee');
      g.rect(cx, f - 15, 4, 1, '#6b4226');
      g.px(cx + 4, f - 13, '#fbf6ee');
      if (Math.floor(t * 2 + cx) % 2 === 0) g.px(cx + 1, f - 17, '#ffffffaa');
      else g.px(cx + 2, f - 18, '#ffffffaa');
    }
    return box(x, f - 16, 22, 16);
  }) as Draw,
  lamp: ((g, x, f, _t, on) => {
    g.rect(x + 3, f - 22, 1, 20, INK);
    g.rect(x + 1, f - 2, 5, 2, INK);
    g.rect(x, f - 27, 7, 5, on ? '#f4e3a1' : '#c9c4d6');
    g.rect(x, f - 27, 7, 1, INK);
    if (on) g.rect(x - 1, f - 22, 9, 1, '#fff6c8aa');
    return box(x - 1, f - 27, 9, 27);
  }) as Draw,
  plant: ((g, x, f, t) => {
    g.rect(x + 1, f - 6, 8, 6, '#d97b6c');
    g.rect(x + 1, f - 6, 8, 1, INK);
    const sway = Math.floor(t * 1.5) % 2;
    g.rect(x + 4, f - 13, 2, 7, '#6d8a6f');
    g.rect(x + sway, f - 12, 4, 3, '#7fc4a0');
    g.rect(x + 6 - sway, f - 15, 4, 3, '#7fc4a0');
    g.rect(x + 3, f - 18, 4, 3, '#9ad6b0');
    return box(x, f - 18, 10, 18);
  }) as Draw,
  radio: ((g, x, f, t, on) => {
    g.rect(x, f - 9, 14, 9, '#5a6a8a');
    g.rect(x, f - 9, 14, 1, INK);
    g.rect(x + 2, f - 7, 4, 4, '#2f2b3a');
    g.rect(x + 8, f - 7, 4, 4, '#2f2b3a');
    g.rect(x + 3, f - 12, 1, 3, INK);
    if (on && Math.floor(t * 3) % 2 === 0) {
      g.rect(x + 3, f - 6, 2, 2, '#9fd0d8');
      g.rect(x + 9, f - 6, 2, 2, '#9fd0d8');
    }
    return box(x, f - 12, 14, 12);
  }) as Draw,
  bookshelf: ((g, x, f) => {
    g.rect(x, f - 30, 18, 30, '#8a5a36');
    const colors = ['#e8a5a0', '#9fd0d8', '#f2c58c', '#b8d8a8', '#c9b3e0'];
    for (let row = 0; row < 3; row++) {
      g.rect(x + 1, f - 28 + row * 9, 16, 7, '#5a3825');
      for (let i = 0; i < 5; i++) g.rect(x + 2 + i * 3, f - 27 + row * 9, 2, 6, colors[(i + row) % colors.length]!);
    }
    return box(x, f - 30, 18, 30);
  }) as Draw,
  fireplace: ((g, x, f, t) => {
    g.rect(x, f - 22, 28, 22, '#b8735a');
    g.rect(x - 2, f - 23, 32, 2, '#8a5a36');
    g.rect(x + 6, f - 14, 16, 14, '#2f2b3a');
    const flick = Math.floor(t * 6) % 3;
    g.rect(x + 9, f - 6 - flick, 10, 5 + flick, '#f2994a');
    g.rect(x + 11, f - 9 + (flick === 1 ? 1 : 0), 6, 7, '#f2c94c');
    g.rect(x + 13, f - 11 + flick, 2, 4, '#fff1b8');
    g.rect(x + 8, f - 2, 12, 2, '#6b4226');
    return box(x - 2, f - 23, 32, 23);
  }) as Draw,
  tree: ((g, x, f) => {
    g.rect(x + 9, f - 22, 5, 22, '#8a5a36');
    g.rect(x, f - 42, 24, 22, '#6d8a6f');
    g.rect(x + 3, f - 46, 18, 6, '#7fa883');
    g.rect(x + 4, f - 38, 6, 4, '#8fbf93');
    g.rect(x + 14, f - 30, 5, 3, '#8fbf93');
    return box(x, f - 46, 24, 46);
  }) as Draw,
  lampPost: ((g, x, f, t, on) => {
    g.rect(x + 2, f - 34, 2, 34, INK);
    g.rect(x, f - 38, 6, 4, on ? '#f4e3a1' : '#8c8aa0');
    if (on && Math.floor(t * 2) % 4 !== 0) g.rect(x - 2, f - 34, 10, 1, '#fff6c855');
    return box(x - 2, f - 38, 10, 38);
  }) as Draw,
  umbrella: ((g, x, f) => {
    g.rect(x + 11, f - 26, 1, 26, INK);
    g.rect(x, f - 28, 24, 3, '#d97b6c');
    g.rect(x + 3, f - 30, 18, 2, '#f6f1e9');
    g.rect(x + 6, f - 31, 12, 1, '#d97b6c');
    g.rect(x + 2, f - 2, 20, 2, '#9fd0d8'); // towel
    return box(x, f - 31, 24, 31);
  }) as Draw,
  palm: ((g, x, f, t) => {
    g.rect(x + 8, f - 30, 3, 30, '#a66a43');
    const s = Math.floor(t) % 2;
    g.rect(x - 2 + s, f - 33, 12, 3, '#6d8a6f');
    g.rect(x + 9 - s, f - 34, 12, 3, '#6d8a6f');
    g.rect(x + 4, f - 37, 10, 3, '#7fa883');
    return box(x - 2, f - 37, 23, 37);
  }) as Draw,
  balloons: ((g, x, f, t) => {
    const bob = Math.floor(t * 1.2) % 2;
    const colors = ['#e8707f', '#f4a3a3', '#e8707f'];
    colors.forEach((c, i) => {
      const bx = x + i * 6;
      const by = f - 40 - (i % 2) * 4 - bob;
      g.rect(bx, by, 5, 5, c);
      g.rect(bx + 1, by - 1, 1, 1, c);
      g.rect(bx + 3, by - 1, 1, 1, c);
      g.rect(bx + 2, by + 5, 1, f - by - 5, '#ffffff88');
    });
    return box(x, f - 46, 18, 46);
  }) as Draw,
  counter: ((g, x, f) => {
    g.rect(x, f - 16, 40, 16, '#8a5a36');
    g.rect(x - 1, f - 17, 42, 2, '#5a3825');
    g.rect(x + 4, f - 22, 8, 5, '#c9c4d6'); // coffee machine
    g.rect(x + 6, f - 20, 4, 1, INK);
    g.rect(x + 28, f - 20, 4, 3, '#fbf6ee');
    for (let i = 0; i < 4; i++) g.rect(x + 3 + i * 10, f - 12, 6, 8, '#a66a43');
    return box(x - 1, f - 22, 42, 22);
  }) as Draw,
} as const;

export type ObjectKind = keyof typeof OBJECTS;
