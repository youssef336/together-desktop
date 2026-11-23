import { useState } from 'react';
import type { Appearance } from '../../domain/appearance';
import { newId } from '../../domain/models';
import { useApp } from '../../stores/app-store';
import { CharacterPreview } from '../../ui/CharacterPreview';
import { Button, Card } from '../../ui/controls';

/** Saved looks: keep a design, apply it to any character later. */
export function PresetBar({ appearance, onApply }: { appearance: Appearance; onApply: (a: Appearance) => void }) {
  const presets = useApp((s) => s.presets);
  const [name, setName] = useState('');

  const save = async () => {
    await useApp.getState().savePreset({ id: newId(), name: name.trim() || 'My look', appearance: { ...appearance }, createdAt: Date.now() });
    setName('');
  };

  return (
    <Card>
      <p className="mb-2 font-pixel text-sm text-ink-soft">Saved looks</p>
      <div className="mb-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border-2 border-line bg-card px-3 py-2 outline-none focus:border-rose"
          placeholder="Name this look"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={save}>Save look</Button>
      </div>
      {presets.length === 0 ? (
        <p className="text-sm text-ink-soft">No saved looks yet.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {presets.map((p) => (
            <div key={p.id} className="group relative flex flex-col items-center rounded-xl border-2 border-line bg-card px-2 pt-1">
              <button type="button" onClick={() => onApply({ ...p.appearance })} title={`Apply “${p.name}”`} className="flex flex-col items-center">
                <CharacterPreview appearance={p.appearance} scale={2} label={p.name} />
                <span className="max-w-20 truncate pb-1 text-xs">{p.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Delete look ${p.name}`}
                onClick={() => void useApp.getState().deletePreset(p.id)}
                className="absolute -top-2 -right-2 hidden h-5 w-5 rounded-full border-2 border-ink bg-card text-xs leading-none group-hover:block"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
