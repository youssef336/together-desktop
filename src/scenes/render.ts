import type { Box } from '../pixel/draw';
import type { Footprint } from './objects';
import { painterFor } from './paint';
import { paintScene, SCENE_H, SCENE_W, type SceneDef } from './scenes';

/** Paints a scene onto a 1× canvas and blits it scaled. Re-used by the world and the Scenes page. */
export class SceneCanvas {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  footprints: Footprint[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SCENE_W;
    this.canvas.height = SCENE_H;
    this.ctx = this.canvas.getContext('2d')!;
  }

  paint(def: SceneDef, t: number, lightOn: boolean): void {
    this.ctx.clearRect(0, 0, SCENE_W, SCENE_H);
    this.footprints = paintScene(painterFor(this.ctx), def, t, lightOn);
  }

  /** Draw at (x, y) with pixel scale s. Adds a soft pixel shadow. */
  blit(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): Box {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = 'rgba(58,42,53,0.22)';
    const w = Math.round(SCENE_W * s);
    const h = Math.round(SCENE_H * s);
    ctx.fillRect(x + s * 2, y + s * 2, w, h);
    ctx.drawImage(this.canvas, x, y, w, h);
    ctx.restore();
    return { x, y, w: w + s * 2, h: h + s * 2 };
  }
}
