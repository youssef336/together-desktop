import { memo, useEffect, useRef } from 'react';
import type { Appearance } from '../domain/appearance';
import { Animator } from '../engine/animator';
import type { ClipId } from '../engine/clips';
import { drawCharacter } from '../pixel/draw';
import { SPRITE_H, SPRITE_W } from '../pixel/layout';

interface Props {
  appearance: Appearance;
  clip?: ClipId;
  scale?: number;
  facing?: 1 | -1;
  /** Extra width for lying-down or wide poses. */
  wide?: boolean;
  className?: string;
  label?: string;
}

/**
 * An animated pixel character, drawn on its own canvas with its own tiny clock.
 * It redraws only when the animation frame changes, and stops when unmounted.
 */
export const CharacterPreview = memo(function CharacterPreview({
  appearance,
  clip = 'idle',
  scale = 4,
  facing = 1,
  wide = false,
  className = '',
  label,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = (wide ? SPRITE_H + 6 : SPRITE_W) * scale;
  const h = (SPRITE_H + 2) * scale;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const anim = new Animator();
    anim.play(clip, { force: true, then: clip });
    let last = performance.now();
    let timer = 0;
    const paint = () => {
      ctx.clearRect(0, 0, w, h);
      drawCharacter(ctx, appearance, anim.frame(), w / 2, h - scale, scale, facing);
    };
    const tick = () => {
      const now = performance.now();
      if (anim.update((now - last) / 1000)) paint();
      last = now;
      timer = window.setTimeout(tick, Math.max(40, anim.nextChangeIn() * 1000));
    };
    paint();
    timer = window.setTimeout(tick, 100);
    return () => window.clearTimeout(timer);
  }, [appearance, clip, scale, facing, w, h]);

  return <canvas ref={ref} className={`pixel ${className}`} style={{ width: w, height: h }} role="img" aria-label={label ?? 'Pixel character'} />;
});
