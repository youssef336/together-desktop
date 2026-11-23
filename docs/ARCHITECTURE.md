# Architecture

## Goals that shape it

1. **Real desktop presence** — characters live outside the app window, on top of everything, without stealing clicks from the desktop.
2. **Full creative freedom** — any combination of parts must look right in every animation.
3. **Light** — fine to leave running while gaming or coding.
4. **Private** — local only.

## Processes and windows

```
┌──────────────── Rust (src-tauri) ────────────────┐
│ lib.rs    plugins: sql · autostart · dialog · fs │
│ world.rs  place world on a monitor's work area   │
│           hit-test loop → set_ignore_cursor_events
│           cursor feed (hover reactions)          │
│ tray.rs   tray menu → events / window show-hide  │
│ db.rs     SQLite migrations                      │
└───────────────┬───────────────────┬──────────────┘
         events │                   │ events
┌───────────────▼──────┐   ┌────────▼──────────────────────┐
│ main window (React)  │   │ world window (canvas, no React)│
│ src/app, features/*  │   │ src/world/*                    │
│ zustand app-store    │   │ World runtime + Renderer       │
└──────────┬───────────┘   └──────────┬─────────────────────┘
           └────── src/data/store.ts (SQLite) ─────┘
```

- **main** (`index.html`): the React app. Closing it hides it; the app keeps running in the tray.
- **world** (`world.html`): transparent, undecorated, always on top, skip-taskbar, all workspaces, `acceptFirstMouse`. Sized to the chosen monitor's **work area**. No React — a single canvas and one small DOM menu.

### Click-through

A window is either click-through or not, so Rust runs a loop (~30 Hz while visible, 4 Hz hidden): it reads the cursor, converts it to world CSS pixels and checks it against the **hitboxes** the world reports (character bodies + open menu). It calls `set_ignore_cursor_events` only when the answer changes. While dragging or while the menu is open, the world sets `capture = true` so the pointer is never lost.

### Events (`src/platform/bridge.ts` is the only module that touches Tauri)

| Event | From → to | Payload |
|---|---|---|
| `together://data-changed` | main ↔ world | `{ from }` — reload from the DB (each side ignores its own) |
| `together://activity` | main / tray → world | `ActivityId` |
| `together://command` | tray / Rust → world | `toggle-pause` · `shown` · `hidden` |
| `together://navigate` | tray / world → main | view id, e.g. `settings`, `editor:<id>` |
| `together://status` | world → main | `{ activity, step, paused, visible }` |
| `together://cursor` | Rust → world | `{ x, y }` (only when hover reactions are on) |

## Source layout

```
src/
  domain/      pure models + rules: appearance, personality, dialogue, factory, templates
  pixel/       procedural pixel art: buffer, layout, body/face/hair/accessories, compose, draw, caches
  engine/      animation + behaviour: clips, animator, actor, activity (steps + runner), activities, scheduler
  world/       desktop world: runtime (Stage), renderer, input, menu, behavior, bubbles, particles, daily
  data/        Store interface: SQLite in the app, localStorage in browser preview
  platform/    Tauri bridge
  stores/      zustand app store (main window)
  ui/          design-system controls, CharacterPreview, useHistory
  features/    home · characters · editor · couple · activities · library · scenes · settings
src-tauri/     Rust
tools/         sprite sheet + icon generators (Node, no browser)
```

Dependency direction: `features → stores/ui → engine/pixel/domain`, `world → engine/pixel/domain`, and only `platform/` and `data/` know about Tauri. `domain/`, `pixel/` (except the canvas helpers) and `engine/` are DOM-free and unit-tested.

## Character data model

```ts
Character {
  id, name, nickname, pronouns,
  appearance: Appearance,        // every field is a real layer
  personality: Personality,      // energy, playfulness, affection, shyness, chattiness, initiative, tone, traits
  preferences: { favoriteActivities, favoriteThings },
  sprite: { kind: 'procedural' },// imported sprite packs will add kinds here
  createdAt, updatedAt
}
```

`Appearance` covers face shape, skin, eye shape/size/colour, eyebrows, nose, mouth, details (blush/freckles/mole), hair style/length/colour, body shape, height, top/bottom/shoes (+ colours), hat (+ colour), glasses, jewelry (+ colour). Every colour is free (picker) with curated swatches.

## Couple data model

```ts
Couple {
  id, characterAId, characterBId,
  relationship: { dynamic, customDynamic, together, progressionEnabled, stage },
  favoriteActivities, enabledActivities,
  dialogue: { customLines: DialogueLine[], disabledCategories },
  behavior: { mode: stationary|relaxed|active|playful|couple, interactionEverySec },
}
```

Settings hold the active couple, scale, pause/hide/lock, mouse reactions, bubble time, low-performance mode, monitor and saved positions (as fractions of the work area so they survive resolution changes). Events keep a capped (200) “recent moments” log.

SQLite stores each document as JSON with real columns for ids/names/timestamps — the model can grow without a migration per field.

## The pixel composer

A character frame is `composeCharacter(appearance, pose)` → a 28×40 `PixelBuffer`. Layers in order: back hair → legs/shoes → torso → skirt/dress → arms → head → face → front hair → hat → glasses → jewelry → cup → **auto outline**. A `Pose` is semantic (`legs: stepA`, `arms: hug`, `eyes: happy`, `mouth: open`, `bob`, `look`, `blush`), so new animations are new pose sequences, not new art. Frames are cached as 1× canvases (LRU, 600) and blitted at an integer scale with smoothing off.

## Animation system

- **Clip** = frames (pose + optional lift / lie-down) + fps + loop + priority + category. 19 clips today.
- **Animator** (one per actor): plays a clip, falls back to `then` after one-shots, refuses to interrupt a higher-priority one-shot unless forced, reports `nextChangeIn()` so the world can sleep.
- **Activity** = ordered **steps**, each a tiny state (`enter` / `update → done`): `meet`, `faceEachOther`, `play(clipA, clipB, sec)`, `exchange(category)`, `say`, `effect`, `walkTogether`, `rockPaperScissors`, `wait`. `ActivityRunner` advances them and `finish()` always returns both to free behaviour. Example — Hug: meet (gap 11) → face → partner happy → both hug → hearts → line → blush/happy → idle.
- **Synchronisation** is structural: both actors are driven by the same step, so they start the hug on the same tick.

## Behaviour

- **Free behaviour** (`world/behavior.ts`): per-mode tuning (idle range, stroll chance and distance, jump/sit/look chances) scaled by energy and playfulness. Couple mode drifts back to the partner.
- **Scheduler** (`engine/scheduler.ts`): next activity time = interval × mode pace × jitter. Choice = personality weights (e.g. hug ∝ affection, sleep at night, coffee in the morning) × couple favourites × each character's favourites × mode bias × history penalty, filtered by cooldowns and enabled list. Initiator by initiative.
- **Moments**: small spontaneous scenes between activities, rarer with low affection.

## Performance

- One canvas, dirty-rect clearing (only last frame's and this frame's boxes).
- Adaptive clock: 30 fps (15 low-perf) only while walking/dragging/particles; otherwise sleeps until the next animation frame change (4–12 fps); 1 Hz heartbeat when paused/hidden.
- Hitboxes are sent to Rust only when they change.
- Rust hit-test loop sleeps 250 ms while the world is hidden.

## Platform specifics

| | macOS | Windows |
|---|---|---|
| Transparency | `macOSPrivateApi` | native |
| Not stealing focus | `focus: false`, `acceptFirstMouse` | `focus: false`, skip taskbar |
| All desktops | `visibleOnAllWorkspaces` | n/a |
| Tray | template icon in menu bar | notification area |
| Autostart | LaunchAgent, `--background` | registry run key, `--background` |
| Work area | excludes menu bar + Dock | excludes taskbar |
