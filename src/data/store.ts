// Persistence. In the desktop app everything lives in a local SQLite file (tauri-plugin-sql).
// When the UI runs in a plain browser (`pnpm dev`, for design work) a localStorage
// adapter keeps the same API; the app shows a banner so it is never mistaken for the real thing.

import Database from '@tauri-apps/plugin-sql';
import type { AppearancePreset, Character, Couple, WorldEvent, WorldSettings } from '../domain/models';
import { DEFAULT_SETTINGS } from '../domain/models';
import { isTauri } from '../platform/bridge';

export interface Store {
  listCharacters(): Promise<Character[]>;
  saveCharacter(c: Character): Promise<void>;
  deleteCharacter(id: string): Promise<void>;
  listCouples(): Promise<Couple[]>;
  saveCouple(c: Couple): Promise<void>;
  deleteCouple(id: string): Promise<void>;
  listPresets(): Promise<AppearancePreset[]>;
  savePreset(p: AppearancePreset): Promise<void>;
  deletePreset(id: string): Promise<void>;
  getSettings(): Promise<WorldSettings>;
  saveSettings(s: WorldSettings): Promise<void>;
  logEvent(e: WorldEvent): Promise<void>;
  recentEvents(limit: number): Promise<WorldEvent[]>;
  wipe(): Promise<void>;
}

class SqliteStore implements Store {
  private db: Promise<Database> | null = null;
  private conn(): Promise<Database> {
    this.db ??= Database.load('sqlite:together.db');
    return this.db;
  }

  async listCharacters(): Promise<Character[]> {
    const rows = await (await this.conn()).select<{ data: string }[]>('SELECT data FROM characters ORDER BY created_at');
    return rows.map((r) => JSON.parse(r.data) as Character);
  }
  async saveCharacter(c: Character): Promise<void> {
    await (await this.conn()).execute(
      `INSERT INTO characters (id, name, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET name = $2, data = $3, updated_at = $5`,
      [c.id, c.name, JSON.stringify(c), c.createdAt, c.updatedAt],
    );
  }
  async deleteCharacter(id: string): Promise<void> {
    await (await this.conn()).execute('DELETE FROM characters WHERE id = $1', [id]);
  }
  async listCouples(): Promise<Couple[]> {
    const rows = await (await this.conn()).select<{ data: string }[]>('SELECT data FROM couples ORDER BY created_at');
    return rows.map((r) => JSON.parse(r.data) as Couple);
  }
  async saveCouple(c: Couple): Promise<void> {
    await (await this.conn()).execute(
      `INSERT INTO couples (id, character_a_id, character_b_id, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET character_a_id = $2, character_b_id = $3, data = $4, updated_at = $6`,
      [c.id, c.characterAId, c.characterBId, JSON.stringify(c), c.createdAt, c.updatedAt],
    );
  }
  async deleteCouple(id: string): Promise<void> {
    await (await this.conn()).execute('DELETE FROM couples WHERE id = $1', [id]);
  }
  async listPresets(): Promise<AppearancePreset[]> {
    const rows = await (await this.conn()).select<{ data: string }[]>('SELECT data FROM presets ORDER BY created_at DESC');
    return rows.map((r) => JSON.parse(r.data) as AppearancePreset);
  }
  async savePreset(p: AppearancePreset): Promise<void> {
    await (await this.conn()).execute(
      'INSERT OR REPLACE INTO presets (id, name, data, created_at) VALUES ($1, $2, $3, $4)',
      [p.id, p.name, JSON.stringify(p), p.createdAt],
    );
  }
  async deletePreset(id: string): Promise<void> {
    await (await this.conn()).execute('DELETE FROM presets WHERE id = $1', [id]);
  }
  async getSettings(): Promise<WorldSettings> {
    const rows = await (await this.conn()).select<{ value: string }[]>("SELECT value FROM settings WHERE key = 'world'");
    return { ...DEFAULT_SETTINGS, ...(rows[0] ? (JSON.parse(rows[0].value) as Partial<WorldSettings>) : {}) };
  }
  async saveSettings(s: WorldSettings): Promise<void> {
    await (await this.conn()).execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('world', $1)", [JSON.stringify(s)]);
  }
  async logEvent(e: WorldEvent): Promise<void> {
    const db = await this.conn();
    await db.execute('INSERT INTO events (id, type, timestamp, data) VALUES ($1, $2, $3, $4)', [e.id, e.type, e.timestamp, JSON.stringify(e)]);
    // Keep the log small: it is a "recent events" feed, not an activity tracker.
    await db.execute('DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY timestamp DESC LIMIT 200)');
  }
  async recentEvents(limit: number): Promise<WorldEvent[]> {
    const rows = await (await this.conn()).select<{ data: string }[]>('SELECT data FROM events ORDER BY timestamp DESC LIMIT $1', [limit]);
    return rows.map((r) => JSON.parse(r.data) as WorldEvent);
  }
  async wipe(): Promise<void> {
    const db = await this.conn();
    for (const t of ['characters', 'couples', 'presets', 'settings', 'events']) await db.execute(`DELETE FROM ${t}`);
  }
}

class BrowserStore implements Store {
  private read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`together:${key}`);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
  private write(key: string, value: unknown): void {
    try {
      localStorage.setItem(`together:${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('[store] write failed', e);
    }
  }
  private upsert<T extends { id: string }>(key: string, item: T): void {
    const list = this.read<T[]>(key, []);
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item;
    else list.push(item);
    this.write(key, list);
  }
  private remove(key: string, id: string): void {
    this.write(key, this.read<{ id: string }[]>(key, []).filter((x) => x.id !== id));
  }
  async listCharacters() { return this.read<Character[]>('characters', []); }
  async saveCharacter(c: Character) { this.upsert('characters', c); }
  async deleteCharacter(id: string) { this.remove('characters', id); }
  async listCouples() { return this.read<Couple[]>('couples', []); }
  async saveCouple(c: Couple) { this.upsert('couples', c); }
  async deleteCouple(id: string) { this.remove('couples', id); }
  async listPresets() { return this.read<AppearancePreset[]>('presets', []); }
  async savePreset(p: AppearancePreset) { this.upsert('presets', p); }
  async deletePreset(id: string) { this.remove('presets', id); }
  async getSettings() { return { ...DEFAULT_SETTINGS, ...this.read<Partial<WorldSettings>>('settings', {}) }; }
  async saveSettings(s: WorldSettings) { this.write('settings', s); }
  async logEvent(e: WorldEvent) { this.write('events', [e, ...this.read<WorldEvent[]>('events', [])].slice(0, 200)); }
  async recentEvents(limit: number) { return this.read<WorldEvent[]>('events', []).slice(0, limit); }
  async wipe() {
    for (const k of ['characters', 'couples', 'presets', 'settings', 'events']) localStorage.removeItem(`together:${k}`);
  }
}

export const store: Store = isTauri() ? new SqliteStore() : new BrowserStore();
export const isBrowserPreview = !isTauri();
