# Development plan

Built in phases. Each phase ends verified (typecheck, tests, the real app run) before the next starts; earlier features must keep working.

## Vision in one line

Not a desktop pet: a personal pixel couple — two characters the user designs — living together on the desktop, with their own personalities, activities and words.

## MVP (done in v0.1)

The user can create their character and their partner, customise and save both, see both on the desktop, drag them, watch them idle and walk, trigger shared activities, read speech bubbles, and close the window while they stay running in the tray.

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Foundation — Tauri 2, React/TS, Tailwind, SQLite, architecture, navigation, design system | ✅ |
| 2 | Character creation — creator, editor, preview, save, library | ✅ |
| 3 | Couple system — partner, personalities, relationship, dashboard, basic dialogue | ✅ |
| 4 | Desktop companion — transparent world, always on top, click-through, drag, positions, scale, multi-monitor, tray | ✅ (needs Windows run) |
| 5 | Animation engine — clips, priorities, interruptions, lie-down, lift; **5b**: imported PNG / GIF / sprite sheets | ✅ / 5b ⏳ |
| 6 | Couple activities — coffee, hug, dance, walk, sit, sleep, play, talk, moments | ✅ |
| 6b | Play together — who's out, mini games, choice bubbles, mood, comfort | ✅ v0.2 |
| 7 | Dialogue & personality — engine, profiles, reactions, custom lines ✅; **optional AI provider layer** ⏳ |  🟡 |
| 8 | Scenes — optional backdrop window with objects | ⏳ |
| 9 | Settings & optimisation — shortcuts, special dates, perf budget checks | 🟡 |
| 10 | Testing & release — Windows + macOS matrix, multi-monitor, CPU/RAM measurements, signed installers | ⏳ |

## Next steps, in order

1. **Windows run** of the current build (transparency, click-through, tray, work area, DPI scaling on 125–175 %). Fix whatever differs.
2. **Measure**: CPU and RAM idle / walking / during an activity on both platforms; record numbers in `docs/perf.md`; set budgets.
3. **Phase 5b — imported characters**: `sprite.kind = 'sheet'` with a mapping from our clip ids to sheet rows; PNG (single frame + procedural bob), GIF (decoded to frames), sprite sheets with a grid editor.
4. **Phase 9 — special dates**: birthday / anniversary / Valentine's / custom dates on the couple; themed activity (cake, confetti) on the day.
5. **Phase 9 — global shortcuts** (`tauri-plugin-global-shortcut`), user-editable.
6. **Phase 7 — AI dialogue (optional, off by default)**: a `DialogueProvider` interface (`local` rule-based today) with an HTTP provider (local model first, e.g. Ollama; remote providers by user key). Prompts built from both personalities; rate-limited by the existing cooldowns; a visible “AI” mark on generated lines.
7. **Phase 8 — scenes**: a second, non-transparent mini-window per scene with objects as interaction points (`sit-spot`, `bed`, `coffee-table`).
8. **Release**: signing/notarisation (macOS), code signing (Windows), auto-update (`tauri-plugin-updater`).

## Risks and decisions

- **macOS private API** is required for transparent windows → direct distribution only (no Mac App Store) unless Apple's rules change.
- **Click-through polling** at 30 Hz is cheap but not free; if measurements show cost, move to OS hooks (`NSEvent` monitor / low-level mouse hook) behind the same command.
- **Procedural art first**: keeps every animation compatible with every design and the bundle tiny. Imported art arrives as a separate sprite kind and must provide (or fall back for) each clip.
