import { useEffect, useState } from 'react';
import { BELLO, DEMO_B, MADE_BY } from '../domain/templates';
import { CharacterPreview } from '../ui/CharacterPreview';

/** Opening card: the big BELLO name for a moment, then it fades away. Click to skip. */
export function Splash() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>('in');
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t1 = window.setTimeout(() => setPhase('out'), reduce ? 600 : 1400);
    const t2 = window.setTimeout(() => setPhase('gone'), reduce ? 700 : 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
  if (phase === 'gone') return null;
  return (
    <div
      className={`fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-4 bg-paper transition-opacity duration-500 ${phase === 'out' ? 'opacity-0' : 'opacity-100'}`}
      onClick={() => setPhase('gone')}
      role="presentation"
    >
      <div className="flex items-end gap-3">
        <CharacterPreview appearance={BELLO} clip="wave" scale={5} label="Bello waving" />
        <CharacterPreview appearance={DEMO_B} clip="happy" scale={5} facing={-1} label="Their partner" />
      </div>
      <p className="font-pixel text-8xl leading-none tracking-wider text-rose [text-shadow:6px_6px_0_var(--color-ink)]">{MADE_BY.toUpperCase()}</p>
      <p className="font-pixel text-2xl">Together</p>
      <p className="text-sm text-ink-soft">A little world for the two of you.</p>
    </div>
  );
}
