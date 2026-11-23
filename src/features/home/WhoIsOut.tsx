import type { Character, WorldSettings } from '../../domain/models';
import { moodLabel, MOOD_DEFAULT } from '../../domain/mood';
import { useApp } from '../../stores/app-store';

/** Choose who lives on the desktop right now — both, or just one — and see how each one feels. */
export function WhoIsOut({ a, b }: { a: Character; b: Character }) {
  const show = useApp((s) => s.settings.show);
  const moods = useApp((s) => s.settings.moods);
  const options: { value: WorldSettings['show']; label: string }[] = [
    { value: 'both', label: `Both ♥` },
    { value: 'a', label: `Only ${a.nickname || a.name}` },
    { value: 'b', label: `Only ${b.nickname || b.name}` },
  ];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-pixel text-sm text-ink-soft">Who’s out:</span>
        <div className="flex rounded-xl border-2 border-ink bg-card p-0.5" role="radiogroup" aria-label="Who is on the desktop">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={show === o.value}
              onClick={() => void useApp.getState().saveSettings({ show: o.value })}
              className={`rounded-lg px-3 py-1 text-sm ${show === o.value ? 'bg-ink text-paper' : 'text-ink hover:bg-sunk'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-4 text-sm">
        {[a, b].map((c) => {
          const m = moods[c.id] ?? MOOD_DEFAULT;
          const { emoji, label } = moodLabel(m);
          return (
            <span key={c.id} className="flex items-center gap-1.5" title={`${c.name}: ${label} (${m}/100)`}>
              <span aria-hidden>{emoji}</span>
              {c.nickname || c.name}
              <span className="inline-block h-2 w-16 overflow-hidden rounded-full bg-sunk" aria-hidden>
                <span className="block h-full rounded-full bg-rose" style={{ width: `${m}%` }} />
              </span>
              <span className="sr-only">{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
