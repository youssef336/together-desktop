# Tasks

Legend: `[x]` done and verified · `[~]` done, not yet verified on every platform · `[ ]` to do

## Phase 1 — Foundation
- [x] Tauri 2 + React 19 + TypeScript + Vite + Tailwind 4 + Zustand
- [x] SQLite via tauri-plugin-sql with migrations
- [x] Architecture (domain / pixel / engine / world / data / platform / ui / features)
- [x] Navigation: Home, My Characters, My Couple, Activities, Scenes, Animation Library, Settings
- [x] Design system: buttons, cards, chips, sliders, toggles, swatches, empty states
- [x] README, DEVELOPMENT_PLAN, TASKS, ARCHITECTURE

## Phase 2 — Character creation
- [x] Procedural pixel composer (28×40, auto outline) — every appearance field is a real layer
- [x] Editor: face, hair, body, outfit, accessories; free colour picker + swatches
- [x] Live animated preview (9 poses), pin-to-compare
- [x] Undo / redo (buttons + ⌘Z/⇧⌘Z, Ctrl+Z/Ctrl+Y), randomize all, randomize one part, reset
- [x] Templates as optional starting points; saved looks (presets); save as version
- [x] Identity (name, nickname, optional pronouns), personality sliders + tone + traits, likes
- [x] Library: duplicate, export (native save dialog), import, delete (with couple cleanup)
- [ ] Click a body part on the preview to jump to its tab
- [ ] Optional AI-assisted creation from a description / reference image

## Phase 3 — Couple system
- [x] Two-step first run: you → your partner (built from scratch, never copied) → couple
- [x] Relationship dynamic (+ custom words), together since, optional stage label
- [x] Behaviour mode, frequency, enabled activities, shared favourites
- [x] Custom dialogue lines with opener; built-in categories on/off
- [x] Multiple couples + active couple switch
- [x] Home dashboard: couple, current activity, quick actions, recent moments

## Phase 4 — Desktop companion
- [~] Transparent, borderless, always-on-top world over the monitor work area (macOS verified)
- [~] Click-through except over characters / menu (Rust hit-test loop)
- [x] Drag with pick-up / drop reactions, partner reaction; positions persisted
- [x] Integer scaling 2–6
- [~] Monitor picker (multi-monitor) — needs a two-screen test
- [~] Tray: open, show, hide, pause/resume, activities, settings, quit
- [x] Closing main window keeps the world running; Dock reopen on macOS
- [~] Open at login (`--background` keeps the main window closed)
- [ ] Windows 10/11 run

## Phase 5 — Animation engine
- [x] Clips (19) with fps, loop, priority, category, lift, lie-down
- [x] Animator: priorities, interruptions, fall-back clips, next-change timing
- [x] Animation library page (preview any clip on any character)
- [ ] 5b: imported PNG / GIF / sprite sheets / animation packs

## Phase 6 — Couple activities
- [x] Coffee, hug, dance, walk together, sit together, nap, rock-paper-scissors, talk
- [x] Step state machine + runner; cancel on drag
- [x] Spontaneous moments: wave, glance, gift (rare)
- [x] Scheduler: personality, favourites, mode, cooldowns, history, time of day
- [ ] Chase / catch / jump games

## Phase 6b — Play together (v0.2)
- [x] Who's out: both, or only one of the couple (Home, right-click menu, tray); solo mode turns couple features off cleanly
- [x] Mini games on the desktop: ☕ Coffee Catch (mouse / ←→, combos, hearts, broken mugs), 💗 Heart Pop (click hearts, avoid gray), 🪞 Copy Me (Simon), ✊ Rock Paper Scissors vs you (best of 3)
- [x] Game controller: capture mode + dim, keyboard focus, Esc / Stop, compact result bar with ✕, high scores, events
- [x] Choice bubbles: they ask, you answer Yes / No in their bubble; answers change words, animation, mood and can start an activity or a game
- [x] Your own questions (Couple page) with “No hurts” option
- [x] Mood (0–100) per character: answers, games, being tossed around, ignoring a question; drifts back to calm; sad face + cloud; the partner comes to comfort a sad one (hug + hearts)
- [x] Rename on the desktop (right-click → Rename) and name fields at the top of the editor
- [x] Verified on macOS: tray submenus, Coffee Catch, right-click menu, question bubble → answer → pout + reply
- [ ] More games: chase / tag, “feed them” (drag snacks to them), memory cards
- [ ] Game sounds (off by default)

## Phase 7 — Dialogue & personality
- [x] Pixel speech bubbles: wrap, size to text, stay on screen, stack, fade
- [x] Categories: casual, romantic, funny, teasing, supportive, activity, thoughts, reactions, greetings, morning, night, special
- [x] Tone-weighted lines, no recent repeats, `{you}` / `{me}` tokens
- [x] Personality-weighted click reactions; hover look + wave
- [x] Good morning / good night (once per day)
- [ ] AI provider abstraction (off by default; local / rule-based / AI)

## Phase 8 — Scenes
- [ ] Scene window + objects (bedroom, coffee shop, park, beach, rainy window, night sky, cozy room, Valentine's)

## Phase 9 — Settings & optimisation
- [x] Size, bubble time, mouse reactions, lock, pause, hide, low-performance, delete all data
- [x] Adaptive frame rate, dirty-rect rendering, sprite cache
- [ ] Special dates (birthday, anniversary, Valentine's, custom)
- [ ] Customisable global shortcuts
- [ ] Measured CPU/RAM budgets (`docs/perf.md`)

## Phase 10 — Testing & release
- [x] Unit tests: composer, animator, dialogue, import/export, scheduler, every activity runs to completion
- [ ] Windows + macOS manual matrix, multi-monitor, HiDPI
- [ ] Signed installers (dmg, msi/nsis), notarisation, updater
