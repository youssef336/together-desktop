import type { WorldSettings } from '../domain/models';
import type { ActivityId } from '../domain/personality';
import type { Box } from '../pixel/draw';
import { SceneCanvas } from '../scenes/render';
import { FLOOR_Y, type Placed, SCENE_H, SCENE_MAP, SCENE_W, type SceneDef, spotFor } from '../scenes/scenes';

/**
 * The optional scene on the desktop: where it sits, what it looks like right now, which object
 * is under the cursor, and where an activity should happen inside it.
 */
export class SceneLayer {
  def: SceneDef | null = null;
  light = true;
  private pos: WorldSettings['scenePos'] = 'right';
  private canvas: SceneCanvas | null = null;
  private paintedAt = -1;
  rect: Box = { x: 0, y: 0, w: 0, h: 0 };
  scale = 3;
  private fx: number | null = null;
  private fy: number | null = null;
  static readonly MIN = 1.5;
  static readonly MAX = 9;

  configure(settings: WorldSettings, view: { w: number; h: number }): boolean {
    const def = settings.scene ? (SCENE_MAP[settings.scene] ?? null) : null;
    const changed = def?.id !== this.def?.id;
    this.def = def;
    this.light = settings.sceneLight;
    this.pos = settings.scenePos;
    this.scale = settings.sceneScale ?? settings.scale;
    this.fx = settings.sceneX;
    this.fy = settings.sceneY;
    this.layout(view);
    if (def && !this.canvas) this.canvas = new SceneCanvas();
    this.paintedAt = -1;
    return changed;
  }

  layout(view: { w: number; h: number }): void {
    const s = this.scale;
    const w = Math.round(SCENE_W * s);
    const h = Math.round(SCENE_H * s);
    let x = this.pos === 'left' ? 12 : this.pos === 'center' ? Math.round((view.w - w) / 2) : view.w - w - 12;
    let y = view.h - h - 8;
    if (this.fx !== null && this.fy !== null) {
      x = Math.round(this.fx * view.w);
      y = Math.round(this.fy * view.h);
    }
    this.rect = { x: Math.max(0, Math.min(view.w - w, x)), y: Math.max(0, Math.min(view.h - h, y)), w, h };
  }

  /** Corner grip for resizing (bottom-right). */
  handleAt(x: number, y: number): boolean {
    if (!this.active) return false;
    const r = this.rect;
    const g = Math.max(14, this.scale * 6);
    return x >= r.x + r.w - g && x <= r.x + r.w + 4 && y >= r.y + r.h - g && y <= r.y + r.h + 4;
  }

  /** Free move / resize while dragging; returns the new rect. */
  moveTo(x: number, y: number, view: { w: number; h: number }): void {
    this.fx = x / view.w;
    this.fy = y / view.h;
    this.layout(view);
  }

  resizeTo(scale: number, view: { w: number; h: number }): void {
    this.scale = Math.max(SceneLayer.MIN, Math.min(SceneLayer.MAX, scale));
    // Keep the top-left corner where it is while the bottom-right follows the mouse.
    this.fx = this.rect.x / view.w;
    this.fy = this.rect.y / view.h;
    this.layout(view);
    this.paintedAt = -1;
  }

  /** Values to persist after a move / resize. */
  persisted(view: { w: number; h: number }): { sceneScale: number; sceneX: number; sceneY: number } {
    return { sceneScale: Math.round(this.scale * 100) / 100, sceneX: this.rect.x / view.w, sceneY: this.rect.y / view.h };
  }

  get active(): boolean {
    return this.def !== null;
  }

  get animated(): boolean {
    return !!this.def?.live || !!this.def?.objects.some((o) => ['table', 'plant', 'radio', 'fireplace', 'palm', 'balloons', 'lampPost'].includes(o.object));
  }

  /** Screen y of the floor line (where feet stand). */
  get floorY(): number {
    return this.rect.y + FLOOR_Y * this.scale;
  }

  bounds(): { left: number; right: number; top: number; bottom: number } {
    const s = this.scale;
    return { left: this.rect.x + 12 * s, right: this.rect.x + this.rect.w - 12 * s, top: this.floorY, bottom: this.floorY };
  }

  /** Repaints when the animation moved on (about 8 fps). Returns true when it changed. */
  tick(t: number): boolean {
    if (!this.def || !this.canvas) return false;
    const frame = Math.floor(t * 8);
    if (frame === this.paintedAt) return false;
    this.paintedAt = frame;
    this.canvas.paint(this.def, t, this.light);
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, t: number): Box | null {
    if (!this.def || !this.canvas) return null;
    if (this.paintedAt < 0) this.tick(t);
    const box = this.canvas.blit(ctx, this.rect.x, this.rect.y, this.scale);
    // Resize grip: three little diagonal steps in the bottom-right corner.
    const k = Math.max(2, Math.round(this.scale * 0.8));
    const right = this.rect.x + this.rect.w - k * 2;
    const bottom = this.rect.y + this.rect.h - k * 2;
    ctx.fillStyle = 'rgba(58,42,53,0.75)';
    for (let i = 0; i < 3; i++) for (let j = 0; j <= i; j++) ctx.fillRect(right - j * k * 1.5, bottom - (i - j) * k * 1.5, k, k);
    return box;
  }

  contains(x: number, y: number): boolean {
    const r = this.rect;
    return this.active && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  /** The object under a screen point, if any. */
  objectAt(x: number, y: number): Placed | null {
    if (!this.def || !this.canvas || !this.contains(x, y)) return null;
    const s = this.scale;
    const lx = (x - this.rect.x) / s;
    const ly = (y - this.rect.y) / s;
    const feet = this.canvas.footprints;
    for (let i = this.def.objects.length - 1; i >= 0; i--) {
      const f = feet[i];
      if (f && lx >= f.x - 2 && lx <= f.x + f.w + 2 && ly >= f.y - 2 && ly <= f.y + f.h + 2) return this.def.objects[i]!;
    }
    return null;
  }

  /** Where an activity happens in this scene: the object's centre, raised for beds and seats. */
  spot(activity: ActivityId): { x: number; y: number } | null {
    if (!this.def || !this.canvas) return null;
    const placed = spotFor(this.def, activity);
    if (!placed) return null;
    const i = this.def.objects.indexOf(placed);
    const f = this.canvas.footprints[i];
    if (!f) return null;
    const s = this.scale;
    const raise = placed.object === 'bed' ? 7 : placed.object === 'sofa' || placed.object === 'bench' ? 4 : 0;
    return { x: this.rect.x + (f.x + f.w / 2) * s, y: this.floorY - raise * s };
  }

  /** Screen centre of an object (for "go water the plant"). */
  centreOf(p: Placed): { x: number; y: number } | null {
    if (!this.def || !this.canvas) return null;
    const f = this.canvas.footprints[this.def.objects.indexOf(p)];
    if (!f) return null;
    return { x: this.rect.x + (f.x + f.w / 2) * this.scale, y: this.floorY };
  }
}
