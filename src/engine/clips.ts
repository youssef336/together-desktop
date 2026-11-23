import { type Pose, pose } from '../pixel/pose';

export interface Frame {
  pose: Pose;
  /** Lift above the ground in sprite pixels (jumps). */
  lift?: number;
  /** Lying down (sleep) — the renderer rotates the sprite. */
  lie?: boolean;
}

export interface Clip {
  id: ClipId;
  label: string;
  category: 'idle' | 'move' | 'social' | 'reaction' | 'rest';
  fps: number;
  loop: boolean;
  /** Higher priority clips can interrupt lower ones; equal priority waits unless forced. */
  priority: number;
  frames: Frame[];
}

export const CLIP_IDS = [
  'idle', 'walk', 'run', 'sit', 'sleep', 'jump', 'wave', 'dance', 'hug', 'hold', 'drink',
  'talk', 'happy', 'surprise', 'blush', 'dangle', 'land', 'cheer', 'think', 'pout', 'sadIdle', 'catch',
] as const;
export type ClipId = (typeof CLIP_IDS)[number];

const f = (p: Partial<Pose>, extra: Omit<Frame, 'pose'> = {}): Frame => ({ pose: pose(p), ...extra });
const times = (n: number, fr: Frame): Frame[] => Array.from({ length: n }, () => fr);

const CLIPS: Clip[] = [
  {
    id: 'idle', label: 'Idle', category: 'idle', fps: 4, loop: true, priority: 0,
    frames: [...times(3, f({})), ...times(3, f({ bob: 1 })), f({}), f({ eyes: 'closed' }), ...times(2, f({})), ...times(3, f({ bob: 1 }))],
  },
  {
    id: 'walk', label: 'Walk', category: 'move', fps: 8, loop: true, priority: 1,
    frames: [f({ legs: 'stepA', arms: 'swingA' }), f({ bob: 1 }), f({ legs: 'stepB', arms: 'swingB' }), f({ bob: 1 })],
  },
  {
    id: 'run', label: 'Run', category: 'move', fps: 12, loop: true, priority: 1,
    frames: [f({ legs: 'stepA', arms: 'swingA', mouth: 'smile' }, { lift: 1 }), f({ bob: 1, mouth: 'smile' }), f({ legs: 'stepB', arms: 'swingB', mouth: 'smile' }, { lift: 1 }), f({ bob: 1, mouth: 'smile' })],
  },
  {
    id: 'sit', label: 'Sit', category: 'rest', fps: 3, loop: true, priority: 2,
    frames: [...times(4, f({ legs: 'sit' })), f({ legs: 'sit', eyes: 'closed' }), ...times(3, f({ legs: 'sit' }))],
  },
  {
    id: 'sleep', label: 'Sleep', category: 'rest', fps: 2, loop: true, priority: 2,
    frames: [f({ eyes: 'closed' }, { lie: true }), f({ eyes: 'closed', bob: 1 }, { lie: true })],
  },
  {
    id: 'jump', label: 'Jump', category: 'move', fps: 12, loop: false, priority: 3,
    frames: [f({ bob: 1 }), f({ arms: 'up', mouth: 'smile' }, { lift: 3 }), f({ arms: 'up', mouth: 'smile' }, { lift: 6 }), f({ arms: 'up', mouth: 'smile' }, { lift: 7 }), f({ arms: 'up', mouth: 'smile' }, { lift: 5 }), f({}, { lift: 2 }), f({ bob: 1 })],
  },
  {
    id: 'wave', label: 'Wave', category: 'social', fps: 6, loop: false, priority: 3,
    frames: [...[1, 2, 3].flatMap(() => [f({ arms: 'wave1', mouth: 'smile' }), f({ arms: 'wave2', mouth: 'smile' })]), f({ mouth: 'smile' })],
  },
  {
    id: 'dance', label: 'Dance', category: 'social', fps: 6, loop: true, priority: 2,
    frames: [f({ arms: 'up', eyes: 'happy', mouth: 'smile' }), f({ arms: 'swingA', legs: 'stepA', eyes: 'happy', mouth: 'smile' }, { lift: 1 }), f({ arms: 'up', eyes: 'happy', mouth: 'smile', bob: 1 }), f({ arms: 'swingB', legs: 'stepB', eyes: 'happy', mouth: 'smile' }, { lift: 1 })],
  },
  {
    id: 'hug', label: 'Hug', category: 'social', fps: 3, loop: true, priority: 3,
    frames: [f({ arms: 'hug', eyes: 'closed', blush: true }), f({ arms: 'hug', eyes: 'closed', blush: true, bob: 1 })],
  },
  {
    id: 'hold', label: 'Hold hands', category: 'social', fps: 4, loop: true, priority: 2,
    frames: [f({ arms: 'reach', mouth: 'smile' }), f({ arms: 'reach', mouth: 'smile', bob: 1 })],
  },
  {
    id: 'drink', label: 'Drink coffee', category: 'social', fps: 3, loop: true, priority: 2,
    frames: [...times(4, f({ arms: 'cup' })), f({ arms: 'cupUp', eyes: 'closed' }), f({ arms: 'cupUp', eyes: 'closed', bob: 1 }), f({ arms: 'cupUp', eyes: 'closed' }), f({ arms: 'cup', eyes: 'happy', blush: true })],
  },
  {
    id: 'talk', label: 'Talk', category: 'social', fps: 6, loop: true, priority: 1,
    frames: [f({ mouth: 'open' }), f({}), f({ mouth: 'open', bob: 1 }), f({ bob: 1 })],
  },
  {
    id: 'happy', label: 'Happy', category: 'reaction', fps: 5, loop: false, priority: 3,
    frames: [f({ eyes: 'happy', mouth: 'smile' }), f({ eyes: 'happy', mouth: 'smile', bob: 1 }), f({ eyes: 'happy', mouth: 'smile' }), f({ eyes: 'happy', mouth: 'smile', bob: 1 }), f({ eyes: 'happy', mouth: 'smile' })],
  },
  {
    id: 'surprise', label: 'Surprise', category: 'reaction', fps: 8, loop: false, priority: 4,
    frames: [f({ eyes: 'wide', mouth: 'open' }, { lift: 2 }), f({ eyes: 'wide', mouth: 'open', arms: 'up' }, { lift: 3 }), f({ eyes: 'wide', mouth: 'open' }, { lift: 1 }), ...times(4, f({ eyes: 'wide', mouth: 'open' }))],
  },
  {
    id: 'blush', label: 'Blush', category: 'reaction', fps: 4, loop: false, priority: 3,
    frames: [...times(3, f({ eyes: 'happy', blush: true, look: -1 })), ...times(3, f({ eyes: 'happy', blush: true, look: -1, bob: 1 }))],
  },
  {
    id: 'dangle', label: 'Picked up', category: 'reaction', fps: 4, loop: true, priority: 5,
    frames: [f({ arms: 'up', eyes: 'wide', mouth: 'open', legs: 'stepA' }), f({ arms: 'up', eyes: 'wide', mouth: 'open', legs: 'stepB' })],
  },
  {
    id: 'land', label: 'Land', category: 'reaction', fps: 8, loop: false, priority: 4,
    frames: [f({ legs: 'sit', eyes: 'closed' }), f({ bob: 1, eyes: 'closed' }), f({ eyes: 'happy' }), f({})],
  },
  {
    id: 'cheer', label: 'Cheer', category: 'reaction', fps: 6, loop: false, priority: 3,
    frames: [...[1, 2, 3].flatMap(() => [f({ arms: 'up', eyes: 'happy', mouth: 'smile' }, { lift: 2 }), f({ arms: 'up', eyes: 'happy', mouth: 'smile', bob: 1 })])],
  },
  {
    id: 'think', label: 'Look around', category: 'idle', fps: 3, loop: false, priority: 1,
    frames: [...times(3, f({ look: -1 })), f({ look: 0 }), ...times(3, f({ look: 1 })), f({ eyes: 'closed' }), f({})],
  },
  {
    id: 'pout', label: 'Upset', category: 'reaction', fps: 3, loop: false, priority: 3,
    frames: [...times(3, f({ eyes: 'sad', mouth: 'sad', look: -1 })), ...times(3, f({ eyes: 'closed', mouth: 'sad', bob: 1 })), ...times(2, f({ eyes: 'sad', mouth: 'sad' }))],
  },
  {
    id: 'sadIdle', label: 'Sad idle', category: 'idle', fps: 2, loop: true, priority: 0,
    frames: [...times(3, f({ eyes: 'sad', mouth: 'sad' })), ...times(3, f({ eyes: 'sad', mouth: 'sad', bob: 1 })), f({ eyes: 'closed', mouth: 'sad', bob: 1 })],
  },
  {
    id: 'catch', label: 'Catch', category: 'move', fps: 10, loop: true, priority: 1,
    frames: [f({ arms: 'up', legs: 'stepA', mouth: 'smile' }), f({ arms: 'up', bob: 1, mouth: 'smile' }), f({ arms: 'up', legs: 'stepB', mouth: 'smile' }), f({ arms: 'up', bob: 1, mouth: 'smile' })],
  },
];

export const CLIP_MAP: Record<ClipId, Clip> = Object.fromEntries(CLIPS.map((c) => [c.id, c])) as Record<ClipId, Clip>;
export const ALL_CLIPS = CLIPS;

export function clipDuration(id: ClipId): number {
  const c = CLIP_MAP[id];
  return c.frames.length / c.fps;
}
