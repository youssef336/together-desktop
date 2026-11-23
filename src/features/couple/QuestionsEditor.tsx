import { useState } from 'react';
import { type Couple, newId } from '../../domain/models';
import { QUESTIONS } from '../../domain/questions';
import { Button, Card, Label, Toggle } from '../../ui/controls';

/** Your own Yes / No questions — what they ask when you click them, and how they take the answer. */
export function QuestionsEditor({ couple, onChange }: { couple: Couple; onChange: (c: Couple) => void }) {
  const [text, setText] = useState('');
  const [yes, setYes] = useState('');
  const [no, setNo] = useState('');
  const [hurts, setHurts] = useState(true);
  const list = couple.questions ?? [];

  const add = () => {
    if (!text.trim()) return;
    onChange({ ...couple, questions: [...list, { id: newId(), text: text.trim(), yes: yes.trim(), no: no.trim(), noHurts: hurts }] });
    setText('');
    setYes('');
    setNo('');
  };

  const input = 'rounded-xl border-2 border-line bg-card px-3 py-2 outline-none focus:border-rose';
  return (
    <Card>
      <h2 className="font-pixel text-xl">Questions they ask you</h2>
      <p className="mb-4 text-sm text-ink-soft">
        Click a character and sometimes they ask something — you answer in their bubble. {QUESTIONS.length} questions are built in (“{QUESTIONS[0]?.text}”); add
        your own here. If a “No” hurts, they get upset and the other one comes over to comfort them.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <input className={input} placeholder="Question, e.g. “Did you eat today?”" maxLength={70} value={text} onChange={(e) => setText(e.target.value)} />
          <input className={input} placeholder="If you say Yes, e.g. “Good! 🍜”" maxLength={70} value={yes} onChange={(e) => setYes(e.target.value)} />
          <input className={input} placeholder="If you say No, e.g. “Go eat right now 😠”" maxLength={70} value={no} onChange={(e) => setNo(e.target.value)} />
          <Toggle label="“No” makes them sad" checked={hurts} onChange={setHurts} />
          <Button tone="primary" onClick={add} disabled={!text.trim()}>
            Add question
          </Button>
        </div>
        <div>
          <Label>Your questions ({list.length})</Label>
          {list.length === 0 ? (
            <p className="text-sm text-ink-soft">None yet.</p>
          ) : (
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
              {list.map((q) => (
                <li key={q.id} className="flex items-start justify-between gap-2 rounded-xl bg-sunk px-3 py-2 text-sm">
                  <span>
                    <b className="font-pixel">{q.text}</b>
                    <br />
                    Yes → “{q.yes || '❤️'}” · No → “{q.no || (q.noHurts ? '...okay. 💔' : 'Okay!')}” {q.noHurts && '💔'}
                  </span>
                  <button
                    type="button"
                    aria-label="Remove question"
                    className="text-ink-soft hover:text-rose"
                    onClick={() => onChange({ ...couple, questions: list.filter((x) => x.id !== q.id) })}
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
