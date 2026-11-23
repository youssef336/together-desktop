import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useRef, useState } from 'react';
import { isTauri } from '../../platform/bridge';
import { duplicateCharacter, exportCharacter, importCharacter } from '../../domain/factory';
import type { Character } from '../../domain/models';
import { useApp } from '../../stores/app-store';
import { CharacterPreview } from '../../ui/CharacterPreview';
import { Button, Empty, Title } from '../../ui/controls';

/** Desktop: native save dialog. Browser preview: a normal download. Returns false if cancelled. */
async function download(name: string, text: string): Promise<boolean> {
  if (isTauri()) {
    const path = await save({ defaultPath: name, filters: [{ name: 'Together character', extensions: ['json'] }] });
    if (!path) return false;
    await writeTextFile(path, text);
    return true;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export function CharactersPage() {
  const characters = useApp((s) => s.characters);
  const couples = useApp((s) => s.couples);
  const go = useApp((s) => s.go);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Character | null>(null);

  const onImport = async (file: File) => {
    try {
      const c = importCharacter(await file.text());
      await useApp.getState().saveCharacter(c);
      setNotice(`Imported ${c.name}.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'That file could not be imported.');
    }
  };

  return (
    <div>
      <Title sub="Everyone you have made. Characters are saved on this computer only.">My Characters</Title>
      <div className="mb-5 flex flex-wrap gap-2">
        <Button tone="primary" onClick={() => go({ name: 'editor', id: null })}>
          + Create character
        </Button>
        <Button onClick={() => fileRef.current?.click()}>Import…</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
      </div>
      {notice && <p className="mb-4 text-sm text-ink-soft" role="status">{notice}</p>}
      {characters.length === 0 ? (
        <Empty title="No characters yet" action={<Button tone="primary" onClick={() => go({ name: 'editor', id: null, role: 'me' })}>Create your character</Button>}>
          Start with yourself — your partner comes next.
        </Empty>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {characters.map((c) => {
            const inCouple = couples.some((x) => x.characterAId === c.id || x.characterBId === c.id);
            return (
              <li key={c.id} className="pixel-card flex flex-col items-center p-4">
                <button type="button" onClick={() => go({ name: 'editor', id: c.id })} className="flex flex-col items-center" aria-label={`Edit ${c.name}`}>
                  <CharacterPreview appearance={c.appearance} scale={4} label={c.name} />
                  <span className="mt-2 font-pixel text-lg">{c.name}</span>
                  <span className="text-sm text-ink-soft">{c.nickname || ' '}</span>
                </button>
                {inCouple && <span className="mt-1 rounded-full bg-rose-soft px-2 text-xs">in a couple ♥</span>}
                <div className="mt-3 flex flex-wrap justify-center gap-1">
                  <Button tone="ghost" className="px-2 py-1 text-sm" onClick={() => go({ name: 'editor', id: c.id })}>
                    Edit
                  </Button>
                  <Button tone="ghost" className="px-2 py-1 text-sm" onClick={() => void useApp.getState().saveCharacter(duplicateCharacter(c))}>
                    Duplicate
                  </Button>
                  <Button tone="ghost" className="px-2 py-1 text-sm" onClick={async () => {
                      try {
                        if (await download(`${c.name || 'character'}.together.json`, exportCharacter(c))) setNotice(`Exported ${c.name}.`);
                      } catch (e) {
                        console.error(e);
                        setNotice('Export failed. Try another folder.');
                      }
                    }}>
                    Export
                  </Button>
                  <Button tone="ghost" className="px-2 py-1 text-sm text-rose" onClick={() => setConfirm(c)}>
                    Delete
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {confirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/30 p-4" role="dialog" aria-modal="true" aria-label="Delete character">
          <div className="pixel-card max-w-sm p-6">
            <p className="font-pixel text-xl">Delete {confirm.name}?</p>
            <p className="mt-2 text-ink-soft">
              {couples.some((x) => x.characterAId === confirm.id || x.characterBId === confirm.id)
                ? 'Their couple will be removed too. This cannot be undone.'
                : 'This cannot be undone.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setConfirm(null)}>Keep</Button>
              <Button
                tone="danger"
                onClick={() => {
                  void useApp.getState().deleteCharacter(confirm.id);
                  setConfirm(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
