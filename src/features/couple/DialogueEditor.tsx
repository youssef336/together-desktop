import { useState } from 'react';
import { BUILT_IN } from '../../domain/dialogue';
import { type Character, type Couple, DIALOGUE_CATEGORIES, type DialogueCategory, newId } from '../../domain/models';
import { Button, Card, Chips, Label, MultiChips } from '../../ui/controls';

const USER_CATEGORIES = DIALOGUE_CATEGORIES.filter((c) => c !== 'activity');

/** The couple's own lines, plus switches for the built-in categories. */
export function DialogueEditor({ couple, a, b, onChange }: { couple: Couple; a: Character; b: Character; onChange: (c: Couple) => void }) {
  const [category, setCategory] = useState<DialogueCategory>('romantic');
  const [opener, setOpener] = useState<'a' | 'b' | 'any'>('any');
  const [first, setFirst] = useState('');
  const [reply, setReply] = useState('');
  const lines = couple.dialogue.customLines;
  const name = (who: 'a' | 'b' | 'any') => (who === 'a' ? a.nickname || a.name : who === 'b' ? b.nickname || b.name : 'Either');

  const add = () => {
    if (!first.trim()) return;
    onChange({
      ...couple,
      dialogue: { ...couple.dialogue, customLines: [...lines, { id: newId(), category, opener, first: first.trim(), reply: reply.trim() || undefined }] },
    });
    setFirst('');
    setReply('');
  };

  const enabled = USER_CATEGORIES.filter((c) => !couple.dialogue.disabledCategories.includes(c));

  return (
    <Card>
      <h2 className="font-pixel text-xl">Dialogue</h2>
      <p className="mb-4 text-sm text-ink-soft">
        Write your own lines. Use <code>{'{you}'}</code> for the other one’s nickname. Your lines are picked twice as often as built-in ones.
      </p>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3">
          <div>
            <Label>Category</Label>
            <Chips options={USER_CATEGORIES} value={category} onChange={setCategory} />
          </div>
          <div>
            <Label>Who says it first</Label>
            <Chips options={['any', 'a', 'b'] as const} value={opener} onChange={setOpener} labels={{ any: 'Either', a: name('a'), b: name('b') }} />
          </div>
          <input
            className="rounded-xl border-2 border-line bg-card px-3 py-2 outline-none focus:border-rose"
            placeholder="First line, e.g. “Come sit with me.”"
            value={first}
            maxLength={90}
            onChange={(e) => setFirst(e.target.value)}
          />
          <input
            className="rounded-xl border-2 border-line bg-card px-3 py-2 outline-none focus:border-rose"
            placeholder="Reply (optional), e.g. “Coming ❤️”"
            value={reply}
            maxLength={90}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button tone="primary" onClick={add} disabled={!first.trim()}>
            Add line
          </Button>
          <div>
            <Label>Built-in lines in use</Label>
            <MultiChips
              options={USER_CATEGORIES}
              value={enabled}
              onChange={(on) => onChange({ ...couple, dialogue: { ...couple.dialogue, disabledCategories: USER_CATEGORIES.filter((c) => !on.includes(c)) } })}
            />
            <p className="mt-1 text-xs text-ink-soft">
              e.g. romantic: “{BUILT_IN.romantic[0]?.first}” — “{BUILT_IN.romantic[0]?.reply}”
            </p>
          </div>
        </div>
        <div>
          <Label>Your lines ({lines.length})</Label>
          {lines.length === 0 ? (
            <p className="text-sm text-ink-soft">None yet. Inside jokes welcome.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
              {lines.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-2 rounded-xl bg-sunk px-3 py-2 text-sm">
                  <span>
                    <span className="font-pixel text-xs text-ink-soft">
                      {l.category} · {name(l.opener)}
                    </span>
                    <br />“{l.first}”{l.reply && <> — “{l.reply}”</>}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove line"
                    className="text-ink-soft hover:text-rose"
                    onClick={() => onChange({ ...couple, dialogue: { ...couple.dialogue, customLines: lines.filter((x) => x.id !== l.id) } })}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
