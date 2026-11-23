import type { Actor } from '../../engine/actor';
import type { Box } from '../../pixel/draw';
import type { ChoiceBubble } from '../choice';
import type { World } from '../runtime';
import type { Hud } from './hud';

export const GAME_IDS = ['coffee-catch', 'heart-pop', 'copy-me', 'rps'] as const;
export type GameId = (typeof GAME_IDS)[number];

export interface GameHost {
  world: World;
  player: Actor;
  partner: Actor | null;
  choice: ChoiceBubble;
  hud: Hud;
}

export interface Game {
  readonly id: GameId;
  /** True when the game needs every click in the window (the desktop is paused meanwhile). */
  readonly capture: boolean;
  readonly over: boolean;
  readonly score: number;
  start(): void;
  update(dt: number): void;
  draw?(ctx: CanvasRenderingContext2D): Box[];
  pointerMove?(x: number, y: number): void;
  pointerDown?(x: number, y: number): void;
  key?(code: string, down: boolean): void;
  /** Called when the game is stopped early or ends; release anything it holds. */
  dispose?(): void;
}

export interface GameDef {
  id: GameId;
  title: string;
  emoji: string;
  description: string;
  /** How the score reads in the results line. */
  unit: string;
  create(host: GameHost): Game;
}
