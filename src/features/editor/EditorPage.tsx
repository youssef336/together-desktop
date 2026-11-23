import { useEffect, useMemo, useState } from 'react';
import { BASE_APPEARANCE, randomizeAppearance } from '../../domain/appearance';
import { createCharacter, createCouple, duplicateCharacter } from '../../domain/factory';
import type { Character } from '../../domain/models';
import { TEMPLATES } from '../../domain/templates';
import type { ClipId } from '../../engine/clips';
import { useApp } from '../../stores/app-store';
import { CharacterPreview } from '../../ui/CharacterPreview';
import { Button, Card, Chips } from '../../ui/controls';
import { useHistory } from '../../ui/useHistory';
import { LookPanel, PART_TABS, type PartTab } from './LookPanel';
import { PresetBar } from './PresetBar';
import { PROFILE_TABS, ProfilePanel, type ProfileTab } from './ProfilePanel';

const PREVIEW_CLIPS: ClipId[] = ['idle', 'walk', 'wave', 'dance', 'hug', 'drink', 'sit', 'sleep', 'jump'];
type Tab = PartTab | ProfileTab;

interface Props {
  id: string | null;
  role?: 'me' | 'partner';
}

export function EditorPage({ id, role }: Props) {
  const view = useApp((s) => s.view);
  const pairWith = view.name === 'editor' ? view.pairWith : undefined;
  const characters = useApp((s) => s.characters);
  const existing = id ? characters.find((c) => c.id === id) : undefined;
  const [initial] = useState<Character>(
    () => existing ?? createCharacter(role === 'partner' ? 'My partner' : role === 'me' ? 'Me' : 'New character'),
  );
  const draft = useHistory<Character>(initial);
  const [tab, setTab] = useState<Tab>('Face');
  const [clip, setClip] = useState<ClipId>('idle');
  const [pinned, setPinned] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const c = draft.value;
  const dirty = useMemo(() => JSON.stringify(c) !== JSON.stringify(existing ?? initial), [c, existing, initial]);
  const isNew = !existing;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        draft.undo();
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        draft.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft]);

  const save = async () => {
    if (!c.name.trim()) {
      setMessage('Give them a name first.');
      setTab('Identity');
      return;
    }
    setSaving(true);
    try {
      const app = useApp.getState();
      await app.saveCharacter(c);
      if (isNew && role === 'me') {
        app.go({ name: 'editor', id: null, role: 'partner', pairWith: c.id });
        return;
      }
      if (isNew && role === 'partner' && pairWith) {
        await app.saveCouple(createCouple(pairWith, c.id));
        app.go({ name: 'home' });
        return;
      }
      setMessage('Saved ✓');
      if (isNew) app.go({ name: 'editor', id: c.id });
    } catch (e) {
      console.error(e);
      setMessage('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveAsVersion = async () => {
    const copy = { ...duplicateCharacter(c), name: `${c.name} (version)` };
    await useApp.getState().saveCharacter(copy);
    setMessage(`Saved a copy as “${copy.name}”.`);
  };

  const heading = role === 'me' && isNew ? 'Create your character' : role === 'partner' && isNew ? 'Create your partner' : isNew ? 'New character' : `Edit ${existing?.name}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {role && isNew && <p className="font-pixel text-sm text-rose">Step {role === 'me' ? '1' : '2'} of 2</p>}
          <h1 className="font-pixel text-3xl">{heading}</h1>
          {role === 'partner' && isNew && <p className="text-ink-soft">Built from scratch — design them exactly as you imagine them.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="ghost" onClick={draft.undo} disabled={!draft.canUndo} title="Undo (⌘Z / Ctrl+Z)">
            ↶ Undo
          </Button>
          <Button tone="ghost" onClick={draft.redo} disabled={!draft.canRedo} title="Redo (⇧⌘Z / Ctrl+Y)">
            ↷ Redo
          </Button>
          {!isNew && (
            <Button onClick={saveAsVersion} title="Keep this design as a separate character">
              Save as version
            </Button>
          )}
          <Button tone="primary" onClick={save} disabled={saving || (!dirty && !isNew)}>
            {role === 'me' && isNew ? 'Next: your partner →' : role === 'partner' && isNew ? 'Bring them together ♥' : 'Save'}
          </Button>
        </div>
      </div>
      {message && <p className="text-sm text-ink-soft" role="status">{message}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,1fr)_minmax(380px,1.15fr)]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col items-center gap-4 bg-[radial-gradient(circle_at_50%_70%,#fbe1e3,transparent_65%)]">
            <div className="flex items-end justify-center gap-6">
              {pinned && (
                <div className="flex flex-col items-center opacity-90">
                  <CharacterPreview appearance={pinned.appearance} clip={clip} scale={5} wide={clip === 'sleep'} label="Pinned design" />
                  <span className="font-pixel text-xs text-ink-soft">pinned</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <CharacterPreview appearance={c.appearance} clip={clip} scale={pinned ? 5 : 7} wide={clip === 'sleep'} label={`${c.name} preview`} />
                {pinned && <span className="font-pixel text-xs text-ink-soft">current</span>}
              </div>
            </div>
            <Chips options={PREVIEW_CLIPS} value={clip} onChange={setClip} />
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => draft.set({ ...c, appearance: randomizeAppearance(c.appearance) })}>🎲 Randomize all</Button>
            <Button onClick={() => draft.set({ ...c, appearance: { ...BASE_APPEARANCE } })}>Reset look</Button>
            <Button onClick={() => setPinned(pinned ? null : structuredClone(c))}>{pinned ? 'Unpin' : '📌 Pin to compare'}</Button>
          </div>
          {isNew && (
            <Card>
              <p className="mb-2 font-pixel text-sm text-ink-soft">Start from a base (optional — every part stays editable)</p>
              <div className="flex flex-wrap gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => draft.set({ ...c, appearance: { ...t.appearance } })}
                    className="flex flex-col items-center rounded-xl border-2 border-line bg-card px-2 pt-1 hover:border-ink-soft"
                  >
                    <CharacterPreview appearance={t.appearance} scale={2} label={t.label} />
                    <span className="pb-1 text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
          <PresetBar appearance={c.appearance} onApply={(appearance) => draft.set({ ...c, appearance })} />
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap gap-1 border-b-2 border-line pb-3">
            {[...PART_TABS, ...PROFILE_TABS].map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 font-pixel text-sm ${i === PART_TABS.length ? 'ml-2' : ''} ${
                  tab === t ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-sunk hover:text-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {(PART_TABS as readonly string[]).includes(tab) ? (
            <LookPanel
              tab={tab as PartTab}
              value={c.appearance}
              onChange={(appearance) => draft.set({ ...c, appearance })}
              onRandomize={(field) => draft.set({ ...c, appearance: randomizeAppearance(c.appearance, field) })}
            />
          ) : (
            <ProfilePanel tab={tab as ProfileTab} value={c} onChange={(next) => draft.set(next)} />
          )}
        </Card>
      </div>
      <p className="text-xs text-ink-soft">Everything you make here is saved only on this computer.</p>
    </div>
  );
}
