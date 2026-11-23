import { OBJECTS } from '../../scenes/objects';
import { SCENES } from '../../scenes/scenes';
import { useApp } from '../../stores/app-store';
import { Chips, Label, Slider, Title, Toggle } from '../../ui/controls';
import { ScenePreview } from './ScenePreview';

const OBJECT_LABEL: Partial<Record<keyof typeof OBJECTS, string>> = {
  bed: 'bed — naps',
  sofa: 'sofa — sit together',
  bench: 'bench — sit together',
  table: 'table — coffee',
  radio: 'radio — dance',
  lamp: 'lamp — lights on/off',
  lampPost: 'street lamp — lights',
  plant: 'plant — water it',
  tree: 'tree — water it',
  balloons: 'balloons — a gift',
  counter: 'counter — chat',
  fireplace: 'fireplace — chat',
  umbrella: 'umbrella — nap',
};

/** Phase 8: optional little rooms on the desktop. The couple lives on the floor; furniture does things. */
export function ScenesPage() {
  const s = useApp((st) => st.settings);
  const save = useApp((st) => st.saveSettings);
  const current = SCENES.find((x) => x.id === s.scene) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <Title sub="Give them a little room on your desktop — or keep them free on the transparent desktop. Click the furniture: they use it.">Scenes</Title>

      <div className="pixel-card flex flex-wrap items-end gap-6 p-5">
        <div>
          <Label>Where on the screen</Label>
          <Chips options={['left', 'center', 'right'] as const} value={s.scenePos} onChange={(scenePos) => void save({ scenePos, sceneX: null, sceneY: null })} />
          <p className="mt-1 text-xs text-ink-soft">Or drag the scene anywhere on the desktop.</p>
        </div>
 <div className="w-56">
          <Slider
            label="Size"
            min={15}
            max={90}
            value={Math.round((s.sceneScale ?? s.scale) * 10)}
            onChange={(v) => void save({ sceneScale: v / 10 })}
            hint="Or drag any corner of the scene on the desktop."
          />
        </div>
        <div className="min-w-56">
          <Toggle label="Lights on" checked={s.sceneLight} onChange={(sceneLight) => void save({ sceneLight })} />
        </div>
        <button
          type="button"
          onClick={() => void save({ scene: null })}
          className={`rounded-xl border-2 px-4 py-2 font-pixel ${!current ? 'border-ink bg-ink text-paper' : 'border-line bg-card hover:border-ink-soft'}`}
        >
          No scene — free on the desktop
        </button>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {SCENES.map((def) => {
          const on = def.id === s.scene;
          const things = [...new Set(def.objects.filter((o) => o.interact).map((o) => OBJECT_LABEL[o.object]).filter(Boolean))];
          return (
            <li key={def.id}>
              <button
                type="button"
                onClick={() => void save({ scene: def.id, hidden: false })}
                aria-pressed={on}
                className={`pixel-card flex w-full flex-col gap-2 p-3 text-left hover:border-rose ${on ? 'border-rose bg-rose-soft' : ''}`}
              >
                <ScenePreview def={def} scale={1.5} light={on ? s.sceneLight : true} />
                <span className="flex items-center justify-between font-pixel text-lg">
                  <span>
                    {def.emoji} {def.name}
                  </span>
                  {on && <span className="text-sm text-rose">On the desktop</span>}
                </span>
                <span className="text-xs text-ink-soft">{things.join(' · ')}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-ink-soft">
        In a scene, activities happen at the right place — coffee at the table, naps on the bed, sitting on the sofa. Games still use the whole screen.
      </p>
    </div>
  );
}
