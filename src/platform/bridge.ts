// The only module that talks to Tauri. UI and world code call these functions,
// so desktop specifics stay out of components and the engine.

import { invoke } from '@tauri-apps/api/core';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ActivityId } from '../domain/personality';

export const isTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const EVENTS = {
  /** Characters / couple / settings changed in the DB — reload. */
  dataChanged: 'together://data-changed',
  /** Start an activity in the world (payload: ActivityId). */
  activity: 'together://activity',
  /** Commands for the world: toggle-pause | shown | hidden | reload. */
  command: 'together://command',
  /** Start a mini game in the world (payload: { id, playerId? }). */
  game: 'together://game',
  /** Ask the main window to show a page (payload: view id). */
  navigate: 'together://navigate',
  /** World → main: status line for the dashboard. */
  status: 'together://status',
  cursor: 'together://cursor',
} as const;

export interface WorldStatus {
  activity: ActivityId | null;
  game: string | null;
  step: string;
  paused: boolean;
  visible: boolean;
}

export interface HitRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MonitorInfo {
  index: number;
  name: string;
  width: number;
  height: number;
  primary: boolean;
}

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | undefined> {
  if (!isTauri()) return undefined;
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    console.error(`[bridge] ${cmd} failed`, e);
    return undefined;
  }
}

export const world = {
  setHitboxes: (rects: HitRect[]) => safeInvoke<void>('world_set_hitboxes', { rects }),
  setCapture: (capture: boolean) => safeInvoke<void>('world_set_capture', { capture }),
  setCursorFeed: (enabled: boolean) => safeInvoke<void>('world_set_cursor_feed', { enabled }),
  monitors: async () => (await safeInvoke<MonitorInfo[]>('world_monitors')) ?? [],
  place: (index: number) => safeInvoke<void>('world_place', { index }),
  show: () => safeInvoke<void>('world_show'),
  hide: () => safeInvoke<void>('world_hide'),
  /** Keyboard focus for games (the world never takes focus otherwise). */
  focus: () => safeInvoke<void>('world_focus'),
  /** Dev only: prints to the `tauri dev` terminal. */
  log: (msg: string) => (import.meta.env.DEV ? safeInvoke<void>('world_log', { msg }) : Promise.resolve(undefined)),
};

/** Shows the main window, optionally on a page (e.g. `settings`, `editor:<id>`). */
export async function openMain(view?: string): Promise<void> {
  await safeInvoke<void>('app_open_main', { view: view ?? null });
}

export async function send(event: string, payload?: unknown): Promise<void> {
  if (!isTauri()) {
    window.dispatchEvent(new CustomEvent(event, { detail: payload }));
    return;
  }
  await emit(event, payload);
}

export async function on<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
  if (!isTauri()) {
    const fn = (e: Event) => handler((e as CustomEvent<T>).detail);
    window.addEventListener(event, fn);
    return () => window.removeEventListener(event, fn);
  }
  return listen<T>(event, (e) => handler(e.payload));
}

export const autostart = {
  async isEnabled(): Promise<boolean> {
    if (!isTauri()) return false;
    return (await safeInvoke<boolean>('plugin:autostart|is_enabled')) ?? false;
  },
  async set(enabled: boolean): Promise<void> {
    await safeInvoke<void>(enabled ? 'plugin:autostart|enable' : 'plugin:autostart|disable');
  },
};
