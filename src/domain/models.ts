import type { Appearance } from './appearance';
import type { MischiefPrefs } from './mischief';
import type { SpeechLang } from './speech';
import type { Signature } from './templates';
import type { ActivityId, Personality, Preferences } from './personality';

export interface Character {
  id: string;
  name: string;
  nickname: string;
  /** Optional, free text. Never used to pick defaults or dialogue. */
  pronouns: string;
  appearance: Appearance;
  personality: Personality;
  preferences: Preferences;
  /** Sprite source. `procedural` = built from `appearance`; imported packs arrive in a later phase. */
  sprite: { kind: 'procedural' };
  /**
   * Bello and Malouka are the app's own couple: picking their template gives the character that
   * name, and it can't be renamed (see domain/templates.ts). Missing = an ordinary character.
   */
  signature?: Signature;
  createdAt: number;
  updatedAt: number;
}

/** A saved look the user can apply to any character. */
export interface AppearancePreset {
  id: string;
  name: string;
  appearance: Appearance;
  createdAt: number;
}

export const RELATIONSHIP_DYNAMICS = [
  'romantic', 'cute', 'playful', 'calm', 'funny', 'shy', 'chaotic', 'supportive', 'custom',
] as const;
export type RelationshipDynamic = (typeof RELATIONSHIP_DYNAMICS)[number];

export const RELATIONSHIP_STAGES = ['new', 'comfortable', 'close', 'affectionate', 'custom'] as const;
export type RelationshipStage = (typeof RELATIONSHIP_STAGES)[number];

export const BEHAVIOR_MODES = ['stationary', 'relaxed', 'active', 'playful', 'couple'] as const;
export type BehaviorMode = (typeof BEHAVIOR_MODES)[number];

export interface DialogueLine {
  id: string;
  category: DialogueCategory;
  /** Two-line exchange: A says `first`, B answers `reply` (optional). `{a}` / `{b}` = nicknames. */
  first: string;
  reply?: string;
  /** Who opens. `any` lets the scheduler choose by initiative. */
  opener: 'a' | 'b' | 'any';
}

export interface CustomQuestion {
  id: string;
  text: string;
  yes: string;
  no: string;
  /** How much "no" hurts (0 = not at all). */
  noHurts: boolean;
}

export const DIALOGUE_CATEGORIES = [
  'casual', 'romantic', 'funny', 'teasing', 'supportive', 'activity', 'thought',
  'reaction', 'greeting', 'morning', 'night', 'special',
] as const;
export type DialogueCategory = (typeof DIALOGUE_CATEGORIES)[number];

export interface Couple {
  id: string;
  characterAId: string;
  characterBId: string;
  relationship: {
    dynamic: RelationshipDynamic;
    customDynamic: string;
    together: string; // free text "since …"
    progressionEnabled: boolean;
    stage: RelationshipStage;
  };
  favoriteActivities: ActivityId[];
  /** Activities the scheduler may start on its own. */
  enabledActivities: ActivityId[];
  dialogue: {
    customLines: DialogueLine[];
    /** Built-in lines can be switched off per category. */
    disabledCategories: DialogueCategory[];
  };
  /** The user's own questions (shown with Yes / No when a character is clicked). */
  questions?: CustomQuestion[];
  behavior: {
    mode: BehaviorMode;
    /** Seconds between autonomous couple activities (lower bound; personality adds jitter). */
    interactionEverySec: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface WorldSettings {
  activeCoupleId: string | null;
  scale: number; // integer pixel scale 2..6
  paused: boolean;
  hidden: boolean;
  locked: boolean;
  mouseReactions: boolean;
  bubbleSeconds: number;
  /** What language they speak in their bubbles (domain/speech.ts). */
  speech: SpeechLang;
  lowPerformance: boolean;
  monitorIndex: number;
  /** Saved spots per character, as fractions of the world size (survives monitor changes). */
  positions: Record<string, { fx: number; fy: number }>;
  /** Who is out on the desktop: both, or only one of the couple. */
  show: 'both' | 'a' | 'b';
  /** Mood per character, 0..100 (see domain/mood.ts). */
  moods: Record<string, number>;
  /** Best score per mini game. */
  highScores: Record<string, number>;
  /** Questions they may ask when clicked (0 = never, 100 = often). */
  questionChance: number;
  /** Optional scene they live in (null = straight on the transparent desktop). */
  scene: string | null;
  scenePos: 'left' | 'center' | 'right';
  sceneLight: boolean;
  /** Scene size (pixel scale, free — set by dragging its corner). Null = same as the characters. */
  sceneScale: number | null;
  /** Scene top-left as fractions of the screen (set by dragging it). Null = use scenePos. */
  sceneX: number | null;
  sceneY: number | null;
  /** Per-character mischief (grab the mouse, close a tab). Missing = off. See domain/mischief.ts. */
  mischief: Record<string, MischiefPrefs>;
}

export const DEFAULT_SETTINGS: WorldSettings = {
  activeCoupleId: null,
  scale: 3,
  paused: false,
  hidden: false,
  locked: false,
  mouseReactions: true,
  bubbleSeconds: 4,
  speech: 'eg',
  lowPerformance: false,
  monitorIndex: 0,
  positions: {},
  show: 'both',
  moods: {},
  highScores: {},
  questionChance: 35,
  scene: null,
  scenePos: 'right',
  sceneLight: true,
  sceneScale: null,
  sceneX: null,
  sceneY: null,
  mischief: {},
};

export interface WorldEvent {
  id: string;
  type: 'activity' | 'click' | 'dialogue' | 'drag' | 'game' | 'answer';
  timestamp: number;
  characterIds: string[];
  activity?: ActivityId;
  dialogue?: string;
  game?: string;
  score?: number;
}

export function newId(): string {
  return crypto.randomUUID();
}
