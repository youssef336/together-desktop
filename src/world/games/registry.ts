import { COFFEE_CATCH } from './coffee-catch';
import { COPY_ME } from './copy-me';
import { HEART_POP } from './heart-pop';
import { RPS } from './rps';
import type { GameDef, GameId } from './types';

export const GAMES: Record<GameId, GameDef> = {
  'coffee-catch': COFFEE_CATCH,
  'heart-pop': HEART_POP,
  'copy-me': COPY_ME,
  rps: RPS,
};
