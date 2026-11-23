import { type Appearance, BASE_APPEARANCE } from './appearance';

// Starting points only. The editor lets the user change every field; nothing is locked to a template.

export const DEMO_A: Appearance = {
  ...BASE_APPEARANCE,
  faceShape: 'square',
  skin: '#e8b088',
  eyeShape: 'dot',
  eyebrows: 'thick',
  hairStyle: 'messy',
  hairColor: '#2b2024',
  bodyShape: 'regular',
  height: 'tall',
  top: 'hoodie',
  topColor: '#6d8a6f',
  bottom: 'pants',
  bottomColor: '#2f2b3a',
  shoes: 'sneakers',
  shoeColor: '#f6f1e9',
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

export interface Template {
  id: string;
  label: string;
  appearance: Appearance;
}

export const TEMPLATES: Template[] = [
  { id: 'blank', label: 'Blank base', appearance: BASE_APPEARANCE },
  { id: 'hoodie', label: 'Hoodie & sneakers', appearance: DEMO_A },
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
