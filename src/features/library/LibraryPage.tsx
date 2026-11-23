import { useState } from 'react';
import { BASE_APPEARANCE } from '../../domain/appearance';
import { ALL_CLIPS } from '../../engine/clips';
import { useApp } from '../../stores/app-store';
import { CharacterPreview } from '../../ui/CharacterPreview';
import { Label, Title } from '../../ui/controls';

const CATEGORY_LABEL = { idle: 'Idle', move: 'Movement', social: 'Together', reaction: 'Reactions', rest: 'Resting' };

/**
 * Every animation the engine knows, previewed on any of your characters.
 * Animations are generated from the character's parts, so each one works for every design.
 */
export function LibraryPage() {
  const characters = useApp((s) => s.characters);
  const [who, setWho] = useState<string>(characters[0]?.id ?? '');
  const appearance = characters.find((c) => c.id === who)?.appearance ?? BASE_APPEARANCE;
  const groups = Object.entries(CATEGORY_LABEL).map(([key, label]) => ({ label, clips: ALL_CLIPS.filter((c) => c.category === key) }));

  return (
    <div>
      <Title sub="Generated from each character's own pixels — every animation fits every design you make.">Animation Library</Title>
      {characters.length > 0 && (
        <label className="mb-6 block w-60">
          <Label>Preview on</Label>
          <select className="w-full rounded-xl border-2 border-line bg-card px-3 py-2" value={who} onChange={(e) => setWho(e.target.value)}>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {groups.map((g) => (
        <section key={g.label} className="mb-6">
          <h2 className="mb-3 font-pixel text-xl">{g.label}</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {g.clips.map((clip) => (
              <li key={clip.id} className="pixel-card flex flex-col items-center p-3">
                <CharacterPreview appearance={appearance} clip={clip.id} scale={3} wide={clip.id === 'sleep'} label={clip.label} />
                <span className="mt-1 font-pixel">{clip.label}</span>
                <span className="text-xs text-ink-soft">
                  {clip.frames.length} frames · {clip.fps} fps · {clip.loop ? 'loops' : 'once'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-ink-soft">Importing your own sprite sheets and animation packs is planned — see TASKS.md (Phase 5b).</p>
    </div>
  );
}
