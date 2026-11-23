import { memo, useEffect, useRef } from 'react';
import { painterFor } from '../../scenes/paint';
import { paintScene, SCENE_H, SCENE_W, type SceneDef } from '../../scenes/scenes';

/** A small live preview of a scene (its rain, stars and waves move), redrawn ~6 times a second. */
export const ScenePreview = memo(function ScenePreview({ def, scale = 2, light = true }: { def: SceneDef; scale?: number; light?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const g = painterFor(ctx);
    const start = performance.now();
    let timer = 0;
    const tick = () => {
      ctx.clearRect(0, 0, SCENE_W, SCENE_H);
      paintScene(g, def, (performance.now() - start) / 1000, light);
      timer = window.setTimeout(tick, 160);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [def, light]);
  return (
    <canvas
      ref={ref}
      width={SCENE_W}
      height={SCENE_H}
      className="pixel block max-w-full rounded-md"
      style={{ width: SCENE_W * scale, aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
      role="img"
      aria-label={`${def.name} scene`}
    />
  );
});
