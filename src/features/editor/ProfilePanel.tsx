import { useState } from 'react';
import type { Character } from '../../domain/models';
import { ACTIVITY_IDS, DIALOGUE_TONES, type Personality, PERSONALITY_PRESETS } from '../../domain/personality';
import { ACTIVITIES } from '../../engine/activities';
import { Button, Chips, Label, MultiChips, Slider, TextField } from '../../ui/controls';

export const PROFILE_TABS = ['Identity', 'Personality', 'Likes'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

const TRAITS: { key: keyof Omit<Personality, 'traits' | 'dialogueTone'>; label: string; hint: string }[] = [
  { key: 'energy', label: 'Energy', hint: 'How much they move around, and how fast.' },
  { key: 'playfulness', label: 'Playfulness', hint: 'Jumps, games and teasing.' },
  { key: 'affection', label: 'Affection', hint: 'Hugs, hearts, staying close.' },
  { key: 'shyness', label: 'Shyness', hint: 'Blushes when clicked; lets the partner lead.' },
  { key: 'chattiness', label: 'Chattiness', hint: 'How often a bubble pops up.' },
  { key: 'initiative', label: 'Initiative', hint: 'How often they start a couple activity.' },
];

interface Props {
  tab: ProfileTab;
  value: Character;
  onChange: (c: Character) => void;
}

export function ProfilePanel({ tab, value, onChange }: Props) {
  const p = value.personality;
  const setP = (patch: Partial<Personality>) => onChange({ ...value, personality: { ...p, ...patch } });

  if (tab === 'Identity') {
    return (
      <div className="flex flex-col gap-4">
        <TextField label="Name" value={value.name} onChange={(name) => onChange({ ...value, name })} placeholder="Their name" />
        <TextField
          label="Nickname (used in dialogue)"
          value={value.nickname}
          onChange={(nickname) => onChange({ ...value, nickname })}
          placeholder="e.g. Bubu"
        />
        <TextField
          label="Pronouns (optional)"
          value={value.pronouns}
          onChange={(pronouns) => onChange({ ...value, pronouns })}
          placeholder="Leave empty if you like"
        />
      </div>
    );
  }

  if (tab === 'Personality') {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <Label>Start from a vibe (then tweak anything)</Label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PERSONALITY_PRESETS).map(([name, preset]) => (
              <button
                key={name}
                type="button"
                className="rounded-lg border-2 border-line bg-card px-2.5 py-1 text-sm hover:border-ink-soft"
                onClick={() => setP(preset)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        {TRAITS.map((t) => (
          <Slider key={t.key} label={t.label} hint={t.hint} value={p[t.key]} onChange={(v) => setP({ [t.key]: v })} />
        ))}
        <div>
          <Label>How they talk</Label>
          <Chips options={DIALOGUE_TONES} value={p.dialogueTone} onChange={(dialogueTone) => setP({ dialogueTone })} />
        </div>
        <TraitList traits={p.traits} onChange={(traits) => setP({ traits })} label="Little traits" placeholder="e.g. loves rainy days" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label>Favourite activities</Label>
        <MultiChips
          options={ACTIVITY_IDS}
          value={value.preferences.favoriteActivities}
          labels={Object.fromEntries(ACTIVITY_IDS.map((id) => [id, `${ACTIVITIES[id].emoji} ${ACTIVITIES[id].label}`]))}
          onChange={(favoriteActivities) => onChange({ ...value, preferences: { ...value.preferences, favoriteActivities } })}
        />
        <p className="mt-1 text-sm text-ink-soft">Favourites are picked more often when they decide what to do together.</p>
      </div>
      <TraitList
        traits={value.preferences.favoriteThings}
        onChange={(favoriteThings) => onChange({ ...value, preferences: { ...value.preferences, favoriteThings } })}
        label="Favourite things"
        placeholder="e.g. strawberry milk"
      />
    </div>
  );
}

function TraitList({ traits, onChange, label, placeholder }: { traits: string[]; onChange: (t: string[]) => void; label: string; placeholder: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t || traits.includes(t)) return;
    onChange([...traits, t]);
    setDraft('');
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {traits.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-sunk px-2 py-1 text-sm">
            {t}
            <button type="button" aria-label={`Remove ${t}`} className="text-ink-soft hover:text-rose" onClick={() => onChange(traits.filter((x) => x !== t))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border-2 border-line bg-card px-3 py-2 outline-none focus:border-rose"
          value={draft}
          maxLength={40}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <Button onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}
