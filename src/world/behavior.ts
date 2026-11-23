import type { BehaviorMode } from '../domain/models';
import type { Actor } from '../engine/actor';
import type { Stage } from '../engine/activity';

// Free behaviour between activities. Calm by design: long idles, short strolls,
// and the personality nudges how often and how far a character moves.

interface ModeTuning {
  idle: [number, number]; // seconds between decisions
  walk: number; // chance to stroll
  far: [number, number]; // stroll distance in sprite px
  jump: number;
  sit: number;
  look: number;
}

const TUNING: Record<BehaviorMode, ModeTuning> = {
  stationary: { idle: [8, 18], walk: 0, far: [0, 0], jump: 0, sit: 0.1, look: 0.35 },
  relaxed: { idle: [7, 18], walk: 0.35, far: [12, 45], jump: 0.03, sit: 0.12, look: 0.25 },
  active: { idle: [3, 8], walk: 0.6, far: [25, 90], jump: 0.08, sit: 0.05, look: 0.15 },
  playful: { idle: [3, 9], walk: 0.45, far: [20, 70], jump: 0.18, sit: 0.05, look: 0.15 },
  couple: { idle: [5, 13], walk: 0.4, far: [10, 35], jump: 0.04, sit: 0.12, look: 0.25 },
};

export function think(actor: Actor, partner: Actor | null, stage: Stage, mode: BehaviorMode, now: number): void {
  const t = TUNING[mode];
  const p = actor.character.personality;
  const energy = p.energy / 100;
  const r = stage.rnd;
  const [lo, hi] = t.idle;
  actor.nextThinkAt = now + (lo + r() * (hi - lo)) * (1.25 - energy * 0.5);

  // Couple mode: drift back toward the partner when far apart.
  if (mode === 'couple' && partner) {
    const dist = Math.abs(partner.x - actor.x);
    if (dist > stage.px(60)) {
      const side = actor.x < partner.x ? -1 : 1;
      actor.walkTo(partner.x + side * stage.px(18 + r() * 10), partner.y);
      return;
    }
  }

  const roll = r();
  const walkChance = t.walk * (0.6 + energy * 0.8);
  if (roll < walkChance) {
    const [dmin, dmax] = t.far;
    const dist = stage.px(dmin + r() * (dmax - dmin));
    let dir = r() < 0.5 ? -1 : 1;
    if (actor.x + dir * dist < stage.bounds.left || actor.x + dir * dist > stage.bounds.right) dir = -dir;
    const tx = Math.max(stage.bounds.left, Math.min(stage.bounds.right, actor.x + dir * dist));
    actor.walkTo(tx, actor.y, { run: mode === 'playful' && r() < 0.3 });
    return;
  }
  const rest = r();
  if (rest < t.jump * (0.5 + p.playfulness / 100)) actor.animator.play('jump');
  else if (rest < t.jump + t.sit) actor.animator.play('sit', { force: true });
  else if (rest < t.jump + t.sit + t.look) {
    if (partner && r() < 0.5) actor.faceTowards(partner);
    actor.animator.play('think');
  } else if (actor.animator.clip !== 'idle') actor.animator.play('idle', { force: true });
}
