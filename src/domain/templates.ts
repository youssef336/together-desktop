import { type Appearance, BASE_APPEARANCE } from './appearance';
import type { Character } from './models';

// Starting points only. The editor lets the user change every field; nothing is locked to a template.

/** Bello — the creator's own character, shipped with every install: white messy hair, a light blue hoodie. */
export const BELLO: Appearance = {
  ...BASE_APPEARANCE,
  faceShape: 'square',
  skin: '#e8b088',
  eyeShape: 'round',
  eyeColor: '#8a6a3d',
  eyeSize: 1,
  eyebrows: 'thick',
  nose: 'dot',
  mouth: 'smile',
  hairStyle: 'messy',
  hairLength: 'long',
  hairColor: '#e8e4ea',
  bodyShape: 'broad',
  height: 'short',
  top: 'hoodie',
  topColor: '#9fd0d8',
  bottom: 'pants',
  bottomColor: '#f2c58c',
  shoes: 'sneakers',
  shoeColor: '#2f2b3a',
  hat: 'none',
  hatColor: '#f2c58c',
  glasses: 'none',
  jewelry: 'none',
  jewelryColor: '#d9d9e3',
  detail: 'none',
};

export const DEMO_B: Appearance = {
  ...BASE_APPEARANCE,
  faceShape: 'round',
  skin: '#f5c9a6',
  eyeShape: 'sparkle',
  eyeSize: 2,
  eyebrows: 'thin',
  nose: 'none',
  mouth: 'cat',
  hairStyle: 'long',
  hairLength: 'long',
  hairColor: '#8a5a36',
  bodyShape: 'slim',
  height: 'medium',
  top: 'dress',
  topColor: '#e8a5a0',
  bottom: 'none',
  shoes: 'slippers',
  shoeColor: '#f6f1e9',
  hat: 'flower',
  hatColor: '#f6f1e9',
  jewelry: 'earrings',
  detail: 'blush',
};

/** Malouka — Bello's partner: twin tails, a rose-red dress, gold earrings. */
export const MALOUKA: Appearance = {
  ...BASE_APPEARANCE,
  faceShape: 'round',
  skin: '#f0c09a',
  eyeShape: 'sparkle',
  eyeSize: 2,
  eyebrows: 'arched',
  nose: 'button',
  mouth: 'cat',
  hairStyle: 'twin-tails',
  hairLength: 'long',
  hairColor: '#3b2520',
  bodyShape: 'slim',
  height: 'short',
  top: 'dress',
  topColor: '#e8707f',
  bottom: 'none',
  shoes: 'boots',
  shoeColor: '#f6f1e9',
  hat: 'none',
  hatColor: '#f2c94c',
  jewelry: 'earrings',
  jewelryColor: '#f2c94c',
  detail: 'blush',
};

/** Malouka as 0.4.0 shipped her, with a crown. Characters still wearing exactly this look lose the crown. */
const MALOUKA_V1: Appearance = { ...MALOUKA, hat: 'crown' };

export interface Template {
  id: string;
  label: string;
  appearance: Appearance;
  /** Bello and Malouka: picking the template names the character, and the name is fixed. */
  signature?: Signature;
}

export const SIGNATURES = ['bello', 'malouka'] as const;
export type Signature = (typeof SIGNATURES)[number];
export const SIGNATURE_NAME: Record<Signature, string> = { bello: 'Bello', malouka: 'Malouka' };

export const TEMPLATES: Template[] = [
  { id: 'bello', label: 'Bello ✦', appearance: BELLO, signature: 'bello' },
  { id: 'malouka', label: 'Malouka ♥', appearance: MALOUKA, signature: 'malouka' },
  { id: 'blank', label: 'Blank base', appearance: BASE_APPEARANCE },
  { id: 'flower', label: 'Flower & dress', appearance: DEMO_B },
  {
    id: 'cozy',
    label: 'Cozy sweater',
    appearance: {
      ...BASE_APPEARANCE,
      hairStyle: 'bun',
      hairColor: '#c98b4b',
      top: 'sweater',
      topColor: '#f2c58c',
      bottom: 'skirt',
      bottomColor: '#5a6a8a',
      glasses: 'round',
      shoes: 'boots',
      shoeColor: '#8a5a36',
    },
  },
  {
    id: 'sporty',
    label: 'Sporty cap',
    appearance: {
      ...BASE_APPEARANCE,
      hairStyle: 'ponytail',
      hairLength: 'medium',
      hairColor: '#2b2024',
      skin: '#a66a43',
      top: 'tank',
      topColor: '#f6f1e9',
      bottom: 'shorts',
      bottomColor: '#a7b8e8',
      hat: 'cap',
      hatColor: '#d97b6c',
    },
  },
];

const sameLook = (a: Appearance, b: Appearance) => (Object.keys(b) as (keyof Appearance)[]).every((k) => a[k] === b[k]);

/** True when the character's name is fixed (Bello, Malouka). */
export const isNameLocked = (c: Pick<Character, 'signature'>): boolean => !!c.signature;

/**
 * Picks a template for a character. Bello / Malouka give it their name and lock it; any other
 * template unlocks it again (and clears the borrowed name so the user names it themself).
 */
export function applyTemplate(c: Character, t: Template): Character {
  if (t.signature) return { ...c, appearance: { ...t.appearance }, signature: t.signature, name: SIGNATURE_NAME[t.signature], nickname: '' };
  if (!c.signature) return { ...c, appearance: { ...t.appearance } };
  const { signature: _drop, ...rest } = c;
  return { ...rest, appearance: { ...t.appearance }, name: '' };
}

/**
 * Applied to every character read from or written to the database: keeps Bello's and Malouka's
 * names fixed, and recognises them in data saved before signatures existed (by name, or by
 * wearing exactly Malouka's look, from which the old crown is taken off).
 */
export function withSignature(c: Character): Character {
  let sig = c.signature;
  let appearance = c.appearance;
  if (!sig) {
    const n = c.name.trim().toLowerCase();
    if (n === 'bello') sig = 'bello';
    else if (n === 'malouka' || n === 'ملوكة' || n === 'ملوكه') sig = 'malouka';
    else if (sameLook(c.appearance, MALOUKA_V1) || sameLook(c.appearance, MALOUKA)) sig = 'malouka';
  }
  if (!sig) return c;
  if (sig === 'malouka' && sameLook(appearance, MALOUKA_V1)) appearance = { ...MALOUKA };
  const name = SIGNATURE_NAME[sig];
  if (c.signature === sig && c.name === name && c.nickname === '' && appearance === c.appearance) return c;
  return { ...c, signature: sig, name, nickname: '', appearance };
}

/** Credit line shown across the app. */
export const MADE_BY = 'Bello';
