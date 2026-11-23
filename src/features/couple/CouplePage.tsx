import { useState } from 'react';
import { createCouple } from '../../domain/factory';
import { BEHAVIOR_MODES, type Couple, RELATIONSHIP_DYNAMICS, RELATIONSHIP_STAGES } from '../../domain/models';
import { ACTIVITY_IDS } from '../../domain/personality';
import { ACTIVITIES } from '../../engine/activities';
import { useActiveCouple, useApp } from '../../stores/app-store';
import { CharacterPreview } from '../../ui/CharacterPreview';
import { Button, Card, Chips, Empty, Label, MultiChips, Slider, TextField, Title, Toggle } from '../../ui/controls';
import { DialogueEditor } from './DialogueEditor';

const MODE_HINT = {
  stationary: 'They stay put. Only conversations happen on their own.',
  relaxed: 'Long, calm idles with the occasional stroll.',
  active: 'They move around more often.',
  playful: 'More jumps, games and dancing.',
  couple: 'They stick together: more hugs, sitting close and walks.',
};

const activityLabels = Object.fromEntries(ACTIVITY_IDS.map((id) => [id, `${ACTIVITIES[id].emoji} ${ACTIVITIES[id].label}`]));

export function CouplePage() {
  const { couple, a, b } = useActiveCouple();
  const characters = useApp((s) => s.characters);
  const couples = useApp((s) => s.couples);
  const [pickA, setPickA] = useState<string>('');
  const [pickB, setPickB] = useState<string>('');

  const saveCouple = (patch: (c: Couple) => Couple) => couple && void useApp.getState().saveCouple(patch(couple));

  const pairing = (
    <Card>
      <h2 className="mb-3 font-pixel text-xl">{couple ? 'Make another couple' : 'Pair two characters'}</h2>
      {characters.length < 2 ? (
        <p className="text-ink-soft">You need at least two characters. Create them in My Characters.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          {[
            [pickA, setPickA, 'First'],
            [pickB, setPickB, 'Partner'],
          ].map(([value, set, label]) => (
            <label key={label as string} className="block">
              <Label>{label as string}</Label>
              <select
                className="rounded-xl border-2 border-line bg-card px-3 py-2"
                value={value as string}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
              >
                <option value="">Choose…</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <Button
            tone="primary"
            disabled={!pickA || !pickB || pickA === pickB}
            onClick={async () => {
              const c = createCouple(pickA, pickB);
              await useApp.getState().saveCouple(c);
              await useApp.getState().saveSettings({ activeCoupleId: c.id });
              setPickA('');
              setPickB('');
            }}
          >
            Pair them ♥
          </Button>
        </div>
      )}
    </Card>
  );

  if (!couple || !a || !b) {
    return (
      <div>
        <Title>My Couple</Title>
        <div className="flex flex-col gap-5">
          <Empty title="No couple yet">Create two characters, then pair them here — or follow the first-run flow on Home.</Empty>
          {pairing}
        </div>
      </div>
    );
  }

  const r = couple.relationship;

  return (
    <div className="flex flex-col gap-5">
      <Title sub="How these two are together — and how often they show it.">My Couple</Title>

      {couples.length > 1 && (
        <Card>
          <Label>On the desktop now</Label>
          <div className="flex flex-wrap gap-2">
            {couples.map((c) => {
              const ca = characters.find((x) => x.id === c.characterAId);
              const cb = characters.find((x) => x.id === c.characterBId);
              return (
                <Button key={c.id} tone={c.id === couple.id ? 'primary' : 'plain'} onClick={() => void useApp.getState().saveSettings({ activeCoupleId: c.id })}>
                  {ca?.name} ♥ {cb?.name}
                </Button>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex items-end justify-center gap-6 bg-[radial-gradient(circle_at_50%_80%,#fbe1e3,transparent_70%)]">
          <CharacterPreview appearance={a.appearance} clip="hold" scale={5} facing={1} label={a.name} />
          <CharacterPreview appearance={b.appearance} clip="hold" scale={5} facing={-1} label={b.name} />
        </Card>
        <Card>
          <h2 className="mb-3 font-pixel text-xl">Relationship</h2>
          <div className="flex flex-col gap-4">
            <div>
              <Label>Dynamic</Label>
              <Chips options={RELATIONSHIP_DYNAMICS} value={r.dynamic} onChange={(dynamic) => saveCouple((c) => ({ ...c, relationship: { ...c.relationship, dynamic } }))} />
            </div>
            {r.dynamic === 'custom' && (
              <TextField
                label="Describe it in your words"
                value={r.customDynamic}
                maxLength={60}
                onChange={(customDynamic) => saveCouple((c) => ({ ...c, relationship: { ...c.relationship, customDynamic } }))}
              />
            )}
            <TextField
              label="Together since (optional)"
              value={r.together}
              placeholder="e.g. 14 Feb 2024"
              onChange={(together) => saveCouple((c) => ({ ...c, relationship: { ...c.relationship, together } }))}
            />
            <Toggle
              label="Relationship stage"
              hint="Optional. Just a label you choose — nothing to grind."
              checked={r.progressionEnabled}
              onChange={(progressionEnabled) => saveCouple((c) => ({ ...c, relationship: { ...c.relationship, progressionEnabled } }))}
            />
            {r.progressionEnabled && (
              <Chips options={RELATIONSHIP_STAGES} value={r.stage} onChange={(stage) => saveCouple((c) => ({ ...c, relationship: { ...c.relationship, stage } }))} />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-pixel text-xl">Behaviour on the desktop</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <Label>Mode</Label>
            <Chips options={BEHAVIOR_MODES} value={couple.behavior.mode} onChange={(mode) => saveCouple((c) => ({ ...c, behavior: { ...c.behavior, mode } }))} />
            <p className="mt-2 text-sm text-ink-soft">{MODE_HINT[couple.behavior.mode]}</p>
          </div>
          <Slider
            label="Something together about every (minutes)"
            min={1}
            max={20}
            value={Math.round(couple.behavior.interactionEverySec / 60)}
            onChange={(m) => saveCouple((c) => ({ ...c, behavior: { ...c.behavior, interactionEverySec: m * 60 } }))}
            hint="Personality and mode add some natural variation."
          />
          <div>
            <Label>Activities they may start on their own</Label>
            <MultiChips options={ACTIVITY_IDS} value={couple.enabledActivities} labels={activityLabels} onChange={(enabledActivities) => saveCouple((c) => ({ ...c, enabledActivities }))} />
          </div>
          <div>
            <Label>Shared favourites (picked more often)</Label>
            <MultiChips options={ACTIVITY_IDS} value={couple.favoriteActivities} labels={activityLabels} onChange={(favoriteActivities) => saveCouple((c) => ({ ...c, favoriteActivities }))} />
          </div>
        </div>
      </Card>

      <DialogueEditor couple={couple} a={a} b={b} onChange={(c) => void useApp.getState().saveCouple(c)} />

      {pairing}
    </div>
  );
}
