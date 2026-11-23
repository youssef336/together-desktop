// Appearance of a procedurally drawn pixel character.
// Every field maps to a real layer in src/pixel/compose.ts — nothing here is cosmetic-only.

export const FACE_SHAPES = ['round', 'oval', 'square', 'heart'] as const;
export const EYE_SHAPES = ['dot', 'round', 'wide', 'sleepy', 'sparkle'] as const;
export const EYEBROWS = ['none', 'thin', 'thick', 'arched'] as const;
export const NOSES = ['none', 'dot', 'button'] as const;
export const MOUTHS = ['smile', 'grin', 'small', 'cat', 'neutral'] as const;
export const HAIR_STYLES = [
  'bald',
  'buzz',
  'short',
  'messy',
  'side-part',
  'bob',
  'long',
  'ponytail',
  'twin-tails',
  'bun',
  'curly',
] as const;
export const HAIR_LENGTHS = ['short', 'medium', 'long'] as const;
export const BODY_SHAPES = ['slim', 'regular', 'broad'] as const;
export const HEIGHTS = ['short', 'medium', 'tall'] as const;
export const TOPS = ['tee', 'hoodie', 'sweater', 'shirt', 'dress', 'tank'] as const;
export const BOTTOMS = ['pants', 'shorts', 'skirt', 'none'] as const;
export const SHOES = ['sneakers', 'boots', 'slippers', 'none'] as const;
export const HATS = ['none', 'beanie', 'cap', 'bow', 'flower', 'crown'] as const;
export const GLASSES = ['none', 'round', 'square', 'sun'] as const;
export const JEWELRY = ['none', 'earrings', 'necklace', 'both'] as const;
export const DETAILS = ['none', 'blush', 'freckles', 'mole', 'blush-freckles'] as const;

export type FaceShape = (typeof FACE_SHAPES)[number];
export type EyeShape = (typeof EYE_SHAPES)[number];
export type Eyebrows = (typeof EYEBROWS)[number];
export type Nose = (typeof NOSES)[number];
export type Mouth = (typeof MOUTHS)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];
export type HairLength = (typeof HAIR_LENGTHS)[number];
export type BodyShape = (typeof BODY_SHAPES)[number];
export type Height = (typeof HEIGHTS)[number];
export type Top = (typeof TOPS)[number];
export type Bottom = (typeof BOTTOMS)[number];
export type Shoes = (typeof SHOES)[number];
export type Hat = (typeof HATS)[number];
export type Glasses = (typeof GLASSES)[number];
export type Jewelry = (typeof JEWELRY)[number];
export type Detail = (typeof DETAILS)[number];

export interface Appearance {
  faceShape: FaceShape;
  skin: string;
  eyeShape: EyeShape;
  eyeColor: string;
  eyeSize: 1 | 2;
  eyebrows: Eyebrows;
  nose: Nose;
  mouth: Mouth;
  hairStyle: HairStyle;
  hairLength: HairLength;
  hairColor: string;
  bodyShape: BodyShape;
  height: Height;
  top: Top;
  topColor: string;
  bottom: Bottom;
  bottomColor: string;
  shoes: Shoes;
  shoeColor: string;
  hat: Hat;
  hatColor: string;
  glasses: Glasses;
  jewelry: Jewelry;
  jewelryColor: string;
  detail: Detail;
}

/** Curated swatches. The editor also offers a free colour picker, so these are shortcuts, not limits. */
export const SKIN_TONES = ['#ffe0c7', '#f5c9a6', '#e8b088', '#c98d62', '#a66a43', '#7a4a2c', '#553222'];
export const HAIR_COLORS = [
  '#2b2024', '#5a3825', '#8a5a36', '#c98b4b', '#e8c27a', '#f3e2b3',
  '#b8463f', '#e58fa8', '#8fb8e8', '#9a8fd8', '#7fc4a0', '#e8e4ea',
];
export const EYE_COLORS = ['#2b2024', '#5a3825', '#3d6fa8', '#3f8a5c', '#8a6a3d', '#7a5aa8'];
export const CLOTH_COLORS = [
  '#f6f1e9', '#2f2b3a', '#e8a5a0', '#f2c58c', '#f4e3a1', '#b8d8a8',
  '#9fd0d8', '#a7b8e8', '#c9b3e0', '#d97b6c', '#6d8a6f', '#5a6a8a',
];

export const APPEARANCE_OPTIONS = {
  faceShape: FACE_SHAPES,
  eyeShape: EYE_SHAPES,
  eyebrows: EYEBROWS,
  nose: NOSES,
  mouth: MOUTHS,
  hairStyle: HAIR_STYLES,
  hairLength: HAIR_LENGTHS,
  bodyShape: BODY_SHAPES,
  height: HEIGHTS,
  top: TOPS,
  bottom: BOTTOMS,
  shoes: SHOES,
  hat: HATS,
  glasses: GLASSES,
  jewelry: JEWELRY,
  detail: DETAILS,
} as const;

export type OptionKey = keyof typeof APPEARANCE_OPTIONS;

export const COLOR_FIELDS = {
  skin: SKIN_TONES,
  eyeColor: EYE_COLORS,
  hairColor: HAIR_COLORS,
  topColor: CLOTH_COLORS,
  bottomColor: CLOTH_COLORS,
  shoeColor: CLOTH_COLORS,
  hatColor: CLOTH_COLORS,
  jewelryColor: ['#f2c94c', '#d9d9e3', '#e8a5a0', '#9fd0d8'],
} as const;

export type ColorKey = keyof typeof COLOR_FIELDS;

export const BASE_APPEARANCE: Appearance = {
  faceShape: 'round',
  skin: '#f5c9a6',
  eyeShape: 'round',
  eyeColor: '#2b2024',
  eyeSize: 1,
  eyebrows: 'thin',
  nose: 'dot',
  mouth: 'smile',
  hairStyle: 'short',
  hairLength: 'short',
  hairColor: '#5a3825',
  bodyShape: 'regular',
  height: 'medium',
  top: 'tee',
  topColor: '#9fd0d8',
  bottom: 'pants',
  bottomColor: '#5a6a8a',
  shoes: 'sneakers',
  shoeColor: '#f6f1e9',
  hat: 'none',
  hatColor: '#e8a5a0',
  glasses: 'none',
  jewelry: 'none',
  jewelryColor: '#f2c94c',
  detail: 'blush',
};

function pick<T>(list: readonly T[], rnd: () => number): T {
  return list[Math.floor(rnd() * list.length)] as T;
}

/** Randomise one field (or the whole character when `field` is omitted). */
export function randomizeAppearance(
  base: Appearance,
  field?: OptionKey | ColorKey,
  rnd: () => number = Math.random,
): Appearance {
  const next = { ...base } as Record<string, unknown>;
  const optionKeys = Object.keys(APPEARANCE_OPTIONS) as OptionKey[];
  const colorKeys = Object.keys(COLOR_FIELDS) as ColorKey[];
  const fields: (OptionKey | ColorKey)[] = field ? [field] : [...optionKeys, ...colorKeys];
  for (const f of fields) {
    if (f in APPEARANCE_OPTIONS) {
      next[f] = pick(APPEARANCE_OPTIONS[f as OptionKey], rnd);
    } else {
      next[f] = pick(COLOR_FIELDS[f as ColorKey], rnd);
    }
  }
  if (!field) {
    next.eyeSize = rnd() < 0.5 ? 1 : 2;
    // Keep full randomisation tasteful: hats and glasses are occasional, not on everyone.
    if (rnd() < 0.6) next.hat = 'none';
    if (rnd() < 0.6) next.glasses = 'none';
  }
  return next as unknown as Appearance;
}
