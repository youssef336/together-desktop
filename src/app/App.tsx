import { useEffect } from 'react';
import { isBrowserPreview } from '../data/store';
import { ActivitiesPage } from '../features/activities/ActivitiesPage';
import { CharactersPage } from '../features/characters/CharactersPage';
import { CouplePage } from '../features/couple/CouplePage';
import { EditorPage } from '../features/editor/EditorPage';
import { HomePage } from '../features/home/HomePage';
import { LibraryPage } from '../features/library/LibraryPage';
import { ScenesPage } from '../features/scenes/ScenesPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { EVENTS, on, type WorldStatus } from '../platform/bridge';
import { useApp, type View } from '../stores/app-store';
import { Sidebar } from './Sidebar';

function parseNavigate(target: string): View | null {
  if (target.startsWith('editor:')) return { name: 'editor', id: target.slice(7) };
  const simple = ['home', 'characters', 'couple', 'activities', 'library', 'scenes', 'settings'] as const;
  return (simple as readonly string[]).includes(target) ? ({ name: target } as View) : null;
}

export function App() {
  const ready = useApp((s) => s.ready);
  const error = useApp((s) => s.error);
  const view = useApp((s) => s.view);

  useEffect(() => {
    void useApp.getState().load();
    const offs = [
      on<string>(EVENTS.navigate, (target) => {
        const v = parseNavigate(target);
        if (v) useApp.getState().go(v);
      }),
      on<WorldStatus>(EVENTS.status, (status) => {
        useApp.setState({ status });
        void useApp.getState().refreshEvents();
      }),
      on<{ from?: string } | null>(EVENTS.dataChanged, (p) => {
        if (p?.from === 'world') void useApp.getState().load();
      }),
    ];
    return () => offs.forEach((p) => void p.then((off) => off()));
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        {isBrowserPreview && (
          <div className="border-b-2 border-line bg-peach/40 px-6 py-2 text-sm">
            Browser preview — data is kept in this browser only and the desktop world is not running. Use <code>pnpm app</code> for the real app.
          </div>
        )}
        <div className="mx-auto max-w-6xl px-8 py-8">
          {!ready ? (
            <p className="font-pixel text-ink-soft">Waking them up…</p>
          ) : error ? (
            <p className="text-rose">{error}</p>
          ) : (
            <Page view={view} />
          )}
        </div>
      </main>
    </div>
  );
}

function Page({ view }: { view: View }) {
  switch (view.name) {
    case 'home':
      return <HomePage />;
    case 'characters':
      return <CharactersPage />;
    case 'editor':
      return <EditorPage key={view.id ?? `new-${view.role ?? ''}`} id={view.id} role={view.role} />;
    case 'couple':
      return <CouplePage />;
    case 'activities':
      return <ActivitiesPage />;
    case 'library':
      return <LibraryPage />;
    case 'scenes':
      return <ScenesPage />;
    case 'settings':
      return <SettingsPage />;
  }
}
