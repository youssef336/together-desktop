import { GAMES } from '../../world/games/registry';
import { GAME_IDS } from '../../world/games/types';
import { useApp } from '../../stores/app-store';

/** Mini games you play *with* them, on the desktop. */
export function GamesGrid({ compact = false }: { compact?: boolean }) {
  const scores = useApp((s) => s.settings.highScores);
  const status = useApp((s) => s.status);
  return (
    <ul className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-[repeat(auto-fill,minmax(230px,1fr))]'}`}>
      {GAME_IDS.map((id) => {
        const g = GAMES[id];
        const best = scores[id];
        const playing = status.game === id;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => void useApp.getState().startGame(id)}
              className={`pixel-card flex h-full w-full flex-col items-start gap-1 p-4 text-left hover:border-rose ${playing ? 'border-rose bg-rose-soft' : ''}`}
            >
              <span className="text-3xl" aria-hidden>
                {g.emoji}
              </span>
              <span className="font-pixel text-lg">{g.title}</span>
              {!compact && <span className="text-sm text-ink-soft">{g.description}</span>}
              <span className="mt-auto pt-1 text-xs text-ink-soft">{playing ? 'Playing now…' : best ? (id === 'rps' ? `Matches won: ${best}` : `Best: ${best} ${g.unit}`) : 'Not played yet'}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
