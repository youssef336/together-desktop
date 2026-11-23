import { create } from 'zustand';
import { store } from '../data/store';
import type { AppearancePreset, Character, Couple, WorldEvent, WorldSettings } from '../domain/models';
import { DEFAULT_SETTINGS } from '../domain/models';
import type { ActivityId } from '../domain/personality';
import { EVENTS, send, world, type WorldStatus } from '../platform/bridge';

export type View =
  | { name: 'home' }
  | { name: 'characters' }
  | { name: 'editor'; id: string | null; role?: 'me' | 'partner'; pairWith?: string }
  | { name: 'couple' }
  | { name: 'activities' }
  | { name: 'library' }
  | { name: 'scenes' }
  | { name: 'settings' };

interface AppState {
  ready: boolean;
  error: string | null;
  view: View;
  characters: Character[];
  couples: Couple[];
  presets: AppearancePreset[];
  settings: WorldSettings;
  events: WorldEvent[];
  status: WorldStatus;
  go(view: View): void;
  load(): Promise<void>;
  saveCharacter(c: Character): Promise<void>;
  deleteCharacter(id: string): Promise<void>;
  saveCouple(c: Couple): Promise<void>;
  deleteCouple(id: string): Promise<void>;
  savePreset(p: AppearancePreset): Promise<void>;
  deletePreset(id: string): Promise<void>;
  saveSettings(patch: Partial<WorldSettings>): Promise<void>;
  startActivity(id: ActivityId): Promise<void>;
  startGame(id: string, playerId?: string): Promise<void>;
  refreshEvents(): Promise<void>;
  wipe(): Promise<void>;
}

/** Tell the world window that the data changed. */
const notifyWorld = () => send(EVENTS.dataChanged, { from: 'main' });

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  view: { name: 'home' },
  characters: [],
  couples: [],
  presets: [],
  settings: DEFAULT_SETTINGS,
  events: [],
  status: { activity: null, game: null, step: '', paused: false, visible: true },

  go: (view) => set({ view }),

  async load() {
    try {
      const [characters, couples, presets, settings, events] = await Promise.all([
        store.listCharacters(),
        store.listCouples(),
        store.listPresets(),
        store.getSettings(),
        store.recentEvents(12),
      ]);
      set({ characters, couples, presets, settings, events, ready: true, error: null });
    } catch (e) {
      console.error('[app] load failed', e);
      set({ ready: true, error: 'Your saved data could not be opened.' });
    }
  },

  async saveCharacter(c) {
    const saved = { ...c, updatedAt: Date.now() };
    await store.saveCharacter(saved);
    const list = get().characters;
    const exists = list.some((x) => x.id === c.id);
    set({ characters: exists ? list.map((x) => (x.id === c.id ? saved : x)) : [...list, saved] });
    await notifyWorld();
  },

  async deleteCharacter(id) {
    // A character that belongs to a couple takes the couple with it — never leave a half couple behind.
    const couples = get().couples.filter((c) => c.characterAId === id || c.characterBId === id);
    for (const c of couples) await store.deleteCouple(c.id);
    await store.deleteCharacter(id);
    set({
      characters: get().characters.filter((c) => c.id !== id),
      couples: get().couples.filter((c) => !couples.includes(c)),
    });
    await notifyWorld();
  },

  async saveCouple(c) {
    const saved = { ...c, updatedAt: Date.now() };
    await store.saveCouple(saved);
    const list = get().couples;
    const exists = list.some((x) => x.id === c.id);
    set({ couples: exists ? list.map((x) => (x.id === c.id ? saved : x)) : [...list, saved] });
    if (!get().settings.activeCoupleId) await get().saveSettings({ activeCoupleId: saved.id });
    else await notifyWorld();
  },

  async deleteCouple(id) {
    await store.deleteCouple(id);
    const couples = get().couples.filter((c) => c.id !== id);
    set({ couples });
    if (get().settings.activeCoupleId === id) await get().saveSettings({ activeCoupleId: couples[0]?.id ?? null });
    else await notifyWorld();
  },

  async savePreset(p) {
    await store.savePreset(p);
    set({ presets: [p, ...get().presets.filter((x) => x.id !== p.id)] });
  },

  async deletePreset(id) {
    await store.deletePreset(id);
    set({ presets: get().presets.filter((x) => x.id !== id) });
  },

  async saveSettings(patch) {
    // Read-modify-write so positions saved by the world are never overwritten by a stale copy.
    const fresh = await store.getSettings();
    const next = { ...fresh, ...patch };
    await store.saveSettings(next);
    set({ settings: next });
    if (patch.monitorIndex !== undefined) await world.place(patch.monitorIndex);
    if (patch.hidden === true) await world.hide();
    if (patch.hidden === false) await world.show();
    await notifyWorld();
  },

  async startActivity(id) {
    if (get().settings.hidden) await get().saveSettings({ hidden: false });
    await send(EVENTS.activity, id);
  },

  async startGame(id, playerId) {
    if (get().settings.hidden) await get().saveSettings({ hidden: false });
    await send(EVENTS.game, { id, playerId });
  },

  async refreshEvents() {
    set({ events: await store.recentEvents(12) });
  },

  async wipe() {
    await store.wipe();
    set({ characters: [], couples: [], presets: [], events: [], settings: DEFAULT_SETTINGS, view: { name: 'home' } });
    await notifyWorld();
  },
}));

/** Couple currently living on the desktop. */
export function useActiveCouple(): { couple: Couple | null; a: Character | null; b: Character | null } {
  const couples = useApp((s) => s.couples);
  const characters = useApp((s) => s.characters);
  const activeId = useApp((s) => s.settings.activeCoupleId);
  const couple = couples.find((c) => c.id === activeId) ?? couples[0] ?? null;
  const find = (id?: string) => characters.find((c) => c.id === id) ?? null;
  return { couple, a: find(couple?.characterAId), b: find(couple?.characterBId) };
}
