import type { ClipId } from '../../engine/clips';
import { ACTIVITY_IDS, type ActivityId } from '../../domain/personality';
import { ACTIVITIES, MOMENTS } from '../../engine/activities';
import { useActiveCouple, useApp } from '../../stores/app-store';
import { CharacterPreview } from '../../ui/CharacterPreview';
import { Empty, Title } from '../../ui/controls';
import { GamesGrid } from './GamesGrid';

/** The clip each card previews — the heart of the activity. */
const PREVIEW: Record<ActivityId, ClipId> = {
  coffee: 'drink',
  hug: 'hug',
  dance: 'dance',
  walk: 'walk',
  sit: 'sit',
  sleep: 'sleep',
  play: 'cheer',
  talk: 'talk',
};

export function ActivitiesPage() {
  const { couple, a, b } = useActiveCouple();
  const status = useApp((s) => s.status);

  return (
    <div>
      <Title sub="Click a card and they do it on your desktop right now. Each one is its own little scene.">Activities</Title>
      {!couple || !a || !b ? (
        <Empty title="Activities need a couple">Create your character and your partner first.</Empty>
      ) : (
        <>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {ACTIVITY_IDS.map((id) => {
              const def = ACTIVITIES[id];
              const running = status.activity === id;
              const auto = couple.enabledActivities.includes(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => void useApp.getState().startActivity(id)}
                    className={`pixel-card flex w-full flex-col items-center p-4 text-center hover:border-rose ${running ? 'border-rose bg-rose-soft' : ''}`}
                  >
                    <div className="flex h-[176px] items-end justify-center gap-1">
                      <CharacterPreview appearance={a.appearance} clip={PREVIEW[id]} scale={4} facing={1} wide={id === 'sleep'} label={`${a.name} — ${def.label}`} />
                      <CharacterPreview appearance={b.appearance} clip={PREVIEW[id]} scale={4} facing={-1} wide={id === 'sleep'} label={`${b.name} — ${def.label}`} />
                    </div>
                    <p className="mt-2 font-pixel text-lg">
                      {def.emoji} {def.label}
                    </p>
                    <p className="text-sm text-ink-soft">{def.description}</p>
                    <p className="mt-2 text-xs text-ink-soft">
                      {running ? 'Happening now…' : auto ? 'Also happens on its own' : 'Only when you ask'}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
          <h2 className="mt-8 mb-2 font-pixel text-xl">Mini games — play with them</h2>
          <p className="mb-3 text-sm text-ink-soft">Coffee Catch and Heart Pop take over the screen until the round ends (Esc stops). Copy Me and Rock Paper Scissors happen in their speech bubbles.</p>
          <GamesGrid />
          <h2 className="mt-8 mb-2 font-pixel text-xl">Little moments</h2>
          <p className="mb-3 text-sm text-ink-soft">These happen by themselves between activities — not too often, never the same one twice in a row.</p>
          <ul className="flex flex-wrap gap-2">
            {MOMENTS.filter((m) => m.id !== 'comfort').map((m) => (
              <li key={m.id} className="rounded-xl border-2 border-line bg-card px-3 py-2 text-sm">
                {m.emoji} {m.label} — <span className="text-ink-soft">{m.description}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
