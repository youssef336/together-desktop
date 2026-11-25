import { type MischiefPace, type MischiefPrefs, mischiefOf, PACE_LABEL } from '../../domain/mischief';
import { useApp } from '../../stores/app-store';
import { Card, Chips, Toggle } from '../../ui/controls';

/** Per-character mischief: grab the mouse and run, close the browser tab. Off by default. */
export function MischiefCard() {
  const s = useApp((st) => st.settings);
  const save = useApp((st) => st.saveSettings);
  const characters = useApp((st) => st.characters);
  const couples = useApp((st) => st.couples);
  const couple = couples.find((c) => c.id === s.activeCoupleId) ?? couples[0];
  const pair = couple ? [couple.characterAId, couple.characterBId] : [];
  const people = pair.map((id) => characters.find((c) => c.id === id)).filter((c) => !!c);

  const set = (id: string, patch: Partial<MischiefPrefs>) =>
    void save({ mischief: { ...s.mischief, [id]: { ...mischiefOf(s, id), ...patch } } });

  return (
    <Card>
      <h2 className="mb-1 font-pixel text-xl">😈 Mischief</h2>
      <p className="mb-3 text-sm text-ink-soft">
        Let one of them tease you. Now and then they sneak up, grab your mouse and run off with it — click them a few times
        to get it back (they always give up within 12 seconds). Or they climb up and close your browser tab — click them
        while they wave to stop it. Pause or hide them to end any prank at once.
      </p>
      {people.length === 0 && <p className="text-sm text-ink-soft">Create your couple first.</p>}
      {people.map((c) => {
        const p = mischiefOf(s, c.id);
        return (
          <div key={c.id} className="mb-3 rounded-xl border-2 border-line p-3">
            <div className="mb-1 font-pixel text-lg">{c.nickname || c.name}</div>
            <Toggle label="Grab my mouse and run" checked={p.grab} onChange={(grab) => set(c.id, { grab })} />
            <Toggle
              label="Close my browser tab"
              hint="Only when a browser is the front window (⌘W / Ctrl+W — reopen it with ⌘⇧T / Ctrl+Shift+T). macOS asks once to allow control of your computer."
              checked={p.tab}
              onChange={(tab) => set(c.id, { tab })}
            />
            {(p.grab || p.tab) && (
              <Chips<MischiefPace>
                options={Object.keys(PACE_LABEL) as MischiefPace[]}
                labels={PACE_LABEL}
                value={p.pace}
                onChange={(pace) => set(c.id, { pace })}
              />
            )}
          </div>
        );
      })}
    </Card>
  );
}
