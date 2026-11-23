import { BASE_APPEARANCE } from '../../domain/appearance';
import type { WorldEvent } from '../../domain/models';
import { ACTIVITY_IDS } from '../../domain/personality';
import { ACTIVITIES } from '../../engine/activities';
import { useActiveCouple, useApp } from '../../stores/app-store';
import { CharacterPreview } from '../../ui/CharacterPreview';
import { Button, Card } from '../../ui/controls';

const STAGE_LABEL = { new: 'New relationship', comfortable: 'Comfortable', close: 'Close', affectionate: 'Affectionate', custom: 'Our own kind' };

export function HomePage() {
  const { couple, a, b } = useActiveCouple();
  const characters = useApp((s) => s.characters);
  const status = useApp((s) => s.status);
  const settings = useApp((s) => s.settings);
  const events = useApp((s) => s.events);
  const go = useApp((s) => s.go);

  if (!couple || !a || !b) return <Welcome hasCharacters={characters.length > 0} />;

  const names = new Map(characters.map((c) => [c.id, c.nickname || c.name]));
  const doing = !settings.hidden && !status.paused && status.activity ? ACTIVITIES[status.activity as keyof typeof ACTIVITIES] : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-pixel text-sm text-rose">My World</p>
          <h1 className="font-pixel text-4xl">
            {a.nickname || a.name} <span className="text-rose">♥</span> {b.nickname || b.name}
          </h1>
        </div>
        <div className="flex gap-2">
          {settings.hidden ? (
            <Button tone="primary" onClick={() => void useApp.getState().saveSettings({ hidden: false })}>
              Enter desktop world
            </Button>
          ) : (
            <Button onClick={() => void useApp.getState().saveSettings({ paused: !settings.paused })}>{settings.paused ? '▶ Resume' : '❚❚ Pause'}</Button>
          )}
          {!settings.hidden && <Button onClick={() => void useApp.getState().saveSettings({ hidden: true })}>Hide</Button>}
        </div>
      </header>

      <Card className="overflow-hidden bg-[linear-gradient(180deg,#fdf0ea_0%,#fbe1e3_70%,#f4d6cf_70%,#f4d6cf_100%)] p-0">
        <div className="flex items-end justify-center gap-2 px-6 pt-8 pb-3">
          <CharacterPreview appearance={a.appearance} scale={6} facing={1} label={a.name} />
          <span className="mb-24 animate-pulse font-pixel text-3xl text-rose" aria-hidden>
            ♥
          </span>
          <CharacterPreview appearance={b.appearance} scale={6} facing={-1} label={b.name} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-line bg-card/80 px-6 py-3">
          <p>
            <span className="font-pixel text-ink-soft">Currently: </span>
            {settings.hidden ? 'Hidden from the desktop' : settings.paused ? 'Paused' : doing ? `${doing.emoji} ${doing.label}` : 'Hanging out together'}
          </p>
          <p className="text-sm text-ink-soft">
            {couple.relationship.dynamic === 'custom' ? couple.relationship.customDynamic || 'Custom' : couple.relationship.dynamic}
            {couple.relationship.progressionEnabled && ` · ${STAGE_LABEL[couple.relationship.stage]}`}
            {couple.relationship.together && ` · together ${couple.relationship.together}`}
          </p>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-3 font-pixel text-xl">Start an activity</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACTIVITY_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => void useApp.getState().startActivity(id)}
                className="flex flex-col items-center gap-1 rounded-xl border-2 border-line bg-card py-3 hover:border-rose hover:bg-rose-soft"
              >
                <span className="text-2xl" aria-hidden>
                  {ACTIVITIES[id].emoji}
                </span>
                <span className="text-sm">{ACTIVITIES[id].label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => go({ name: 'editor', id: a.id })}>Edit {a.nickname || a.name}</Button>
            <Button onClick={() => go({ name: 'editor', id: b.id })}>Edit {b.nickname || b.name}</Button>
            <Button onClick={() => go({ name: 'couple' })}>Customize relationship</Button>
            <Button tone="ghost" onClick={() => go({ name: 'settings' })}>
              Settings
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-pixel text-xl">Recent moments</h2>
          {events.length === 0 ? (
            <p className="text-ink-soft">Nothing yet — they just moved in.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {events.slice(0, 8).map((e) => (
                <li key={e.id} className="flex justify-between gap-3">
                  <span>{describe(e, names)}</span>
                  <span className="shrink-0 text-ink-soft">{new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function describe(e: WorldEvent, names: Map<string, string>): string {
  const who = e.characterIds.map((id) => names.get(id) ?? 'Someone');
  if (e.type === 'activity' && e.activity) {
    const def = ACTIVITIES[e.activity];
    return `${def.emoji} ${who.join(' & ')} — ${def.label.toLowerCase()}${e.dialogue === 'user' ? ' (your idea)' : ''}`;
  }
  if (e.type === 'drag') return `✋ You moved ${who[0]}`;
  if (e.type === 'click') return `👆 You poked ${who[0]}`;
  return `${who.join(' & ')}`;
}

function Welcome({ hasCharacters }: { hasCharacters: boolean }) {
  const go = useApp((s) => s.go);
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="flex items-end gap-4 opacity-80">
        <div className="opacity-40 grayscale">
          <CharacterPreview appearance={BASE_APPEARANCE} scale={6} label="Your character, not created yet" />
        </div>
        <span className="mb-20 font-pixel text-3xl text-rose">?</span>
        <div className="opacity-40 grayscale">
          <CharacterPreview appearance={{ ...BASE_APPEARANCE, hairStyle: 'long', hairLength: 'medium' }} scale={6} facing={-1} label="Your partner, not created yet" />
        </div>
      </div>
      <div>
        <h1 className="font-pixel text-4xl">Let’s build your little world</h1>
        <p className="mt-2 max-w-lg text-ink-soft">
          Design yourself, then your partner — every hair, outfit and quirk. Then they move onto your desktop and live there together.
        </p>
      </div>
      <div className="flex gap-3">
        <Button tone="primary" onClick={() => go({ name: 'editor', id: null, role: 'me' })}>
          Create your character
        </Button>
        {hasCharacters && <Button onClick={() => go({ name: 'couple' })}>Pair existing characters</Button>}
      </div>
    </div>
  );
}
