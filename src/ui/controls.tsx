import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'primary' | 'plain' | 'danger' | 'ghost';

const TONES: Record<Tone, string> = {
  primary: 'pixel-btn bg-rose text-white',
  plain: 'pixel-btn bg-card text-ink',
  danger: 'pixel-btn bg-card text-rose',
  ghost: 'border-2 border-transparent text-ink-soft hover:text-ink hover:bg-sunk',
};

export function Button({ tone = 'plain', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-pixel text-[15px] ${TONES[tone]} ${className}`}
      {...rest}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`pixel-card p-5 ${className}`}>{children}</section>;
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="font-pixel text-3xl text-ink">{children}</h1>
      {sub && <p className="mt-1 text-ink-soft">{sub}</p>}
    </header>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block font-pixel text-sm text-ink-soft">{children}</span>;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 40,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        className="w-full rounded-xl border-2 border-line bg-card px-3 py-2 text-ink outline-none focus:border-rose"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between font-pixel text-sm text-ink-soft">
        {label}
        <span className="text-ink">{value}</span>
      </span>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={`rounded-lg border-2 px-2.5 py-1 text-sm capitalize ${
            o === value ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink hover:border-ink-soft'
          }`}
        >
          {labels?.[o] ?? o.replace('-', ' ')}
        </button>
      ))}
    </div>
  );
}

export function MultiChips<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={`rounded-lg border-2 px-2.5 py-1 text-sm capitalize ${
              on ? 'border-rose bg-rose-soft text-ink' : 'border-line bg-card text-ink-soft hover:border-ink-soft'
            }`}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-ink">{label}</span>
        {hint && <span className="text-sm text-ink-soft">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border-2 border-ink transition-colors ${checked ? 'bg-rose' : 'bg-sunk'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-ink bg-card transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export function Swatches({ colors, value, onChange }: { colors: readonly string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={`h-7 w-7 rounded-md border-2 ${value.toLowerCase() === c.toLowerCase() ? 'border-ink ring-2 ring-rose' : 'border-line'}`}
          style={{ background: c }}
        />
      ))}
      <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border-2 border-dashed border-ink-soft" title="Any colour">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        <span className="pointer-events-none flex h-full items-center justify-center text-xs text-ink-soft">+</span>
      </label>
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line p-10 text-center">
      <p className="font-pixel text-xl">{title}</p>
      {children && <p className="max-w-md text-ink-soft">{children}</p>}
      {action}
    </div>
  );
}
