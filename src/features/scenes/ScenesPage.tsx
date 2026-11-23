import { Title } from '../../ui/controls';

const PLANNED = ['Bedroom', 'Coffee shop', 'Park', 'Beach', 'Rainy window', 'Night sky', 'Cozy room', "Valentine's room"];

/** Scenes are Phase 8. This page says so plainly instead of showing buttons that do nothing. */
export function ScenesPage() {
  return (
    <div>
      <Title sub="Optional little backdrops with objects they can use. The transparent desktop stays the main home.">Scenes</Title>
      <div className="rounded-2xl border-2 border-dashed border-line p-8">
        <p className="font-pixel text-xl">Coming in Phase 8</p>
        <p className="mt-2 max-w-xl text-ink-soft">
          Right now your couple lives directly on the desktop. Scenes will add an optional backdrop window with objects — chairs, a bed, coffee cups, a music
          player — that activities can use.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {PLANNED.map((s) => (
            <li key={s} className="rounded-lg bg-sunk px-3 py-1 text-sm text-ink-soft">
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
