// A pose is one animation frame described semantically. The composer turns
// (appearance, pose) into pixels, so every animation works for every custom character.

export type LegPose = 'stand' | 'stepA' | 'stepB' | 'sit';
export type ArmPose =
  | 'down'
  | 'swingA'
  | 'swingB'
  | 'wave1'
  | 'wave2'
  | 'up'
  | 'hug'
  | 'cup'
  | 'cupUp'
  | 'reach';
export type EyePose = 'open' | 'closed' | 'happy' | 'wide' | 'sad';
export type MouthPose = 'default' | 'open' | 'smile' | 'sad';

export interface Pose {
  legs: LegPose;
  arms: ArmPose;
  eyes: EyePose;
  mouth: MouthPose;
  /** 1 = breathe down one pixel. */
  bob: 0 | 1;
  /** Eye direction: -1 left, 0 centre, 1 right. */
  look: -1 | 0 | 1;
  /** Force blush regardless of the appearance detail. */
  blush?: boolean;
}

export const NEUTRAL: Pose = { legs: 'stand', arms: 'down', eyes: 'open', mouth: 'default', bob: 0, look: 0 };

export function pose(p: Partial<Pose>): Pose {
  return { ...NEUTRAL, ...p };
}

export function poseKey(p: Pose): string {
  return `${p.legs}|${p.arms}|${p.eyes}|${p.mouth}|${p.bob}|${p.look}|${p.blush ? 1 : 0}`;
}
