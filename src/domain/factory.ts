import type { Appearance } from './appearance';
import { BASE_APPEARANCE } from './appearance';
import { type Character, type Couple, newId } from './models';
import { ACTIVITY_IDS, DEFAULT_PERSONALITY } from './personality';

export function createCharacter(name: string, appearance: Appearance = BASE_APPEARANCE): Character {
  const now = Date.now();
  return {
    id: newId(),
    name,
    nickname: '',
    pronouns: '',
    appearance: { ...appearance },
    personality: { ...DEFAULT_PERSONALITY, traits: [] },
    preferences: { favoriteActivities: [], favoriteThings: [] },
    sprite: { kind: 'procedural' },
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateCharacter(c: Character): Character {
  const now = Date.now();
  return { ...structuredClone(c), id: newId(), name: `${c.name} (copy)`, createdAt: now, updatedAt: now };
}

export function createCouple(characterAId: string, characterBId: string): Couple {
  const now = Date.now();
  return {
    id: newId(),
    characterAId,
    characterBId,
    relationship: { dynamic: 'cute', customDynamic: '', together: '', progressionEnabled: false, stage: 'comfortable' },
    favoriteActivities: ['coffee', 'hug'],
    enabledActivities: [...ACTIVITY_IDS],
    dialogue: { customLines: [], disabledCategories: [] },
    behavior: { mode: 'relaxed', interactionEverySec: 150 },
    createdAt: now,
    updatedAt: now,
  };
}

/** Export format for sharing a character between installs. */
export interface CharacterFile {
  format: 'together-desktop/character';
  version: 1;
  character: Character;
}

export function exportCharacter(c: Character): string {
  const file: CharacterFile = { format: 'together-desktop/character', version: 1, character: c };
  return JSON.stringify(file, null, 2);
}

export function importCharacter(json: string): Character {
  const parsed = JSON.parse(json) as Partial<CharacterFile>;
  if (parsed.format !== 'together-desktop/character' || !parsed.character) {
    throw new Error('This file is not a Together Desktop character.');
  }
  const c = parsed.character;
  const now = Date.now();
  return {
    ...createCharacter(c.name ?? 'Imported'),
    ...c,
    appearance: { ...BASE_APPEARANCE, ...c.appearance },
    personality: { ...DEFAULT_PERSONALITY, ...c.personality },
    id: newId(), // never overwrite an existing character
    createdAt: now,
    updatedAt: now,
  };
}
