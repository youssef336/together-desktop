import { useApp, type View } from '../stores/app-store';
import { ACTIVITIES } from '../engine/activities';

const NAV: { view: View['name']; label: string; icon: string }[] = [
  { view: 'home', label: 'Home', icon: '⌂' },
  { view: 'characters', label: 'My Characters', icon: '☺' },
  { view: 'couple', label: 'My Couple', icon: '♥' },
  { view: 'activities', label: 'Activities', icon: '☕' },
  { view: 'library', label: 'Animation Library', icon: '▶' },
  { view: 'scenes', label: 'Scenes', icon: '☾' },
  { view: 'settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  const view = useApp((s) => s.view);
  const go = useApp((s) => s.go);
  const status = useApp((s) => s.status);
  const current = view.name === 'editor' ? 'characters' : view.name;

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r-2 border-line bg-sunk/60 px-4 py-6">
      <div className="mb-8 px-2">
        <p className="font-pixel text-2xl leading-none">Together</p>
        <p className="mt-1 text-xs text-ink-soft">A little world for the two of you.</p>
      </div>
      <ul className="flex flex-col gap-1">
        {NAV.map((n) => (
          <li key={n.view}>
            <button
              type="button"
              onClick={() => go({ name: n.view } as View)}
              aria-current={current === n.view ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-pixel ${
                current === n.view ? 'bg-card text-ink shadow-[0_2px_0_var(--color-line)]' : 'text-ink-soft hover:bg-card/70 hover:text-ink'
              }`}
            >
              <span className="w-5 text-center" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-auto rounded-xl border-2 border-line bg-card px-3 py-2 text-sm">
        <p className="font-pixel text-xs text-ink-soft">On the desktop</p>
        <p className="truncate">
          {!status.visible
            ? 'Hidden'
            : status.paused
              ? 'Paused'
              : status.activity
                ? `${ACTIVITIES[status.activity]?.emoji ?? ''} ${ACTIVITIES[status.activity]?.label ?? status.activity}`
                : 'Hanging out'}
        </p>
      </div>
    </nav>
  );
}
