# Neon Void TypeScript Migration Notes

## Runtime compatibility checklist (important)

When converting a module from `*.js` to `*.ts`, always complete this checklist in the same PR:

1. **Reference audit**
   - Run: `rg "<moduleName>\\.js" -n js test`
   - Update or provide compatibility for **all** remaining JS imports.

2. **Runtime path verification**
   - Verify source-runtime imports still resolve (legacy JS entrypoints/tests).
   - Verify built-runtime imports resolve (`npm run build`, then run the affected flow).

3. **Compatibility bridge if mixed JS/TS remains**
   - If non-migrated JS files still import the old path, keep a JS-compatible runtime file at that path
     (or migrate all importers in the same change).

4. **Validation**
   - `npm run build`
   - Targeted grep check for stale references.

## Why this note exists

A previous migration removed `js/config/*.js` while many JS modules and tests still imported `config/*.js`,
causing runtime module resolution errors. This checklist prevents that regression.

## 2026-04-08: statePersistence migration checkpoint

### What was migrated
- Added TypeScript source for state persistence at `js/core/game/statePersistence.ts`.
- Kept runtime compatibility by preserving existing JS imports/entrypoints (no breaking import path changes in this step).

### Type safety improvements added
- Added explicit saved-state types (`SavedGameState`, `SavedTowerState`) to encode accepted persisted payload shape.
- Added `GridCell` typing in persistence helpers to make cell resolution and tower restore flows clearer.
- Added helper split for restore flow (`applyScoreState`, `applyWaveState`, `resetWaveObjects`) so future migrations can type each part independently.

### Verification performed
- `npm run build` (root TypeScript compile) passed after the migration.
- `node --test test/game/stateManagement.test.js` passed (10/10).
- `npx eslint js/core/game/statePersistence.ts` passed with zero warnings.

### Useful follow-ups
1. Migrate `js/core/game/formations.js` next; it is already isolated by unit tests (`test/game/formations.test.js`) and has low runtime coupling.
2. Introduce a shared `GameLike` interface slice for persistence/tower/wave state to remove remaining `any` usage.
3. Expand `SavedGameState.version` handling to explicit migration map when version 2 format is introduced.

## OOP-first migration clarification (added 2026-04-08)

For Neon Void TS migration steps, a "meaningful migration" now means more than adding `*.ts` extension:

- Prefer class-based architecture when migrating modules with stateful behavior (services, coordinators, managers, mappers).
- Introduce explicit domain types and use them in class method signatures; avoid leaving business logic in untyped free functions.
- Keep backward-compatible module adapters only as thin shells over typed classes.
- In PR descriptions, explicitly mention which classes were introduced and what responsibilities were split.

This requirement should be treated as default guidance for all future Neon Void migration PRs unless a task explicitly asks for a different style.
