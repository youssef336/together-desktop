import { useEffect, useState } from 'react';
import { autostart, isTauri, type MonitorInfo, world } from '../../platform/bridge';
import { useApp } from '../../stores/app-store';
import { Button, Card, Label, Slider, Title, Toggle } from '../../ui/controls';

export function SettingsPage() {
  const s = useApp((st) => st.settings);
  const save = useApp((st) => st.saveSettings);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [launch, setLaunch] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  useEffect(() => {
    void world.monitors().then(setMonitors);
    void autostart.isEnabled().then(setLaunch);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <Title>Settings</Title>

      <Card>
        <h2 className="mb-2 font-pixel text-xl">On the desktop</h2>
        <Toggle label="Show characters" checked={!s.hidden} onChange={(v) => void save({ hidden: !v })} />
        <Toggle label="Pause" hint="Freezes them in place. Uses almost no CPU." checked={s.paused} onChange={(v) => void save({ paused: v })} />
        <Toggle label="Lock positions" hint="Clicks still work; dragging is off." checked={s.locked} onChange={(v) => void save({ locked: v })} />
        <Toggle
          label="React to the mouse"
          hint="They look at the cursor and sometimes wave. The position is used only for this and never stored."
          checked={s.mouseReactions}
          onChange={(v) => void save({ mouseReactions: v })}
        />
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          <Slider label="Character size" min={2} max={6} value={s.scale} onChange={(scale) => void save({ scale })} hint="Pixel scale — stays crisp at every size." />
          <Slider label="Speech bubble seconds" min={2} max={10} value={s.bubbleSeconds} onChange={(bubbleSeconds) => void save({ bubbleSeconds })} />
          <Slider
            label="Questions when you click them (%)"
            min={0}
            max={100}
            step={5}
            value={s.questionChance}
            onChange={(questionChance) => void save({ questionChance })}
            hint="How often a click turns into a Yes / No question instead of a reaction. 0 = never."
          />
        </div>
        {monitors.length > 1 && (
          <label className="mt-4 block">
            <Label>Display</Label>
            <select
              className="rounded-xl border-2 border-line bg-card px-3 py-2"
              value={s.monitorIndex}
              onChange={(e) => void save({ monitorIndex: Number(e.target.value) })}
            >
              {monitors.map((m) => (
                <option key={m.index} value={m.index}>
                  {m.name} — {m.width}×{m.height}
                  {m.primary ? ' (main)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-pixel text-xl">Performance</h2>
        <Toggle
          label="Low-performance mode"
          hint="Halves the frame rate. Good for laptops on battery and while gaming."
          checked={s.lowPerformance}
          onChange={(v) => void save({ lowPerformance: v })}
        />
        <p className="text-sm text-ink-soft">
          Always on: they sleep when hidden or paused, redraw only what changed, and slow to a few frames per second while idle.
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 font-pixel text-xl">Startup</h2>
        <Toggle
          label="Open at login"
          hint="Starts in the tray with your couple on the desktop; the main window stays closed."
          checked={launch}
          onChange={async (v) => {
            await autostart.set(v);
            setLaunch(await autostart.isEnabled());
          }}
        />
        {!isTauri() && <p className="text-sm text-ink-soft">Available in the desktop app.</p>}
        <p className="mt-2 text-sm text-ink-soft">Closing this window keeps them on your desktop. Quit from the tray / menu-bar icon.</p>
      </Card>

      <Card>
        <h2 className="mb-2 font-pixel text-xl">Privacy</h2>
        <ul className="mb-4 list-disc pl-5 text-sm text-ink-soft">
          <li>No account, no cloud, no analytics. Everything is a local file on this computer.</li>
          <li>No screen recording and no keystrokes — only the cursor position for hover reactions, if enabled above.</li>
          <li>AI dialogue is not built yet; when it is, it will be off by default and clearly marked.</li>
        </ul>
        {confirmWipe ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-rose">Delete every character, couple, look and setting?</span>
            <Button onClick={() => setConfirmWipe(false)}>Cancel</Button>
            <Button
              tone="danger"
              onClick={async () => {
                await useApp.getState().wipe();
                setConfirmWipe(false);
              }}
            >
              Yes, delete everything
            </Button>
          </div>
        ) : (
          <Button tone="danger" onClick={() => setConfirmWipe(true)}>
            Delete all my data…
          </Button>
        )}
      </Card>
    </div>
  );
}
