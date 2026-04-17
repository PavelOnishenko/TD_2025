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

## 2026-04-08: formations typed API checkpoint

### What was migrated
- Added `js/core/game/formations.ts` as a TypeScript compatibility layer over existing runtime module `formations.js`.
- Introduced explicit TS types for formation entities (`FormationShipDescriptor`, `FormationDefinition`, `FormationEvent`, `FormationPlan`) and manager contract (`FormationManager`, `FormationManagerConfig`).
- Kept runtime stability by preserving `formations.js` unchanged so all current JS imports/tests continue to work while TS code can adopt typed imports immediately.

### Why this step is useful
- Unblocks typed callers from using formation planning without waiting for full runtime rewrite.
- Establishes a single TS contract that can be reused when `formations.js` is later split into class-based TS services.
- Reduces migration risk: type adoption can proceed independently from behavior changes.

### Verification performed
- `npm run build` passed (TypeScript compile).
- `npx eslint js/core/game/formations.ts` passed with zero warnings.
- `node --test test/game/formations.test.js` passed (4/4).

### Follow-up implementation plan (next PR)
1. Introduce `FormationParser`, `WaveDifficultyResolver`, and `FormationPlanner` TS classes in separate files under `js/core/game/formations/` to satisfy OOP-first migration guidance while staying within style-guide length limits.
2. Make `formations.js` a thin adapter over the compiled TS implementation once all direct JS dependencies are migrated.
3. Add focused tests for parser failure modes (bad probability expressions, malformed ship tokens, minWave + endless interactions).

## 2026-04-17: formation runtime OOP TS migration checkpoint

### What was migrated
- Implemented formation runtime logic as typed class modules under `js/core/game/formations/`:
  - `FormationManager` (orchestration and wave planning API)
  - `FormationParser` (definition parsing flow)
  - `FormationPlanner` (selection and timeline building)
  - `WaveDifficultyResolver` (scheduled + endless difficulty resolution)
  - `FormationParserUtils` and `FormationNormalization` (focused helper logic)
  - `FormationTypes` (shared contracts)
- Updated `js/core/game/formations.ts` to use the new TS runtime classes instead of casting results from legacy `formations.js`.
- Kept legacy runtime path `js/core/game/formations.js` unchanged so existing JS importers/tests remain stable during mixed migration.

### Why this checkpoint matters
- This is the first full OOP runtime uplift for formations (not just typed facade contracts).
- Future migration work can move caller modules to TS without relying on `as` casts around formation planner behavior.
- Internal responsibilities are now split into smaller files, reducing future lint/style churn when changing individual formation concerns.

### Validation performed in this checkpoint
- `npx eslint js/core/game/formations.ts js/core/game/formations/*.ts` passed with zero warnings.
- `npm run build` passed (TypeScript compile).
- `node --test test/game/formations.test.js` passed (4/4).

### Important test-environment note
- Running root `npm test` currently fails for pre-existing reasons outside this checkpoint:
  - multiple `eva_game` and `rgfn_game` tests import from missing `dist/` outputs unless those project-specific builds run first;
  - several unrelated root projectile tests fail with `enemy.takeDamage is not a function`.
- Recommended scoped commands for Neon Void migration validation:
  1. `npm run build`
  2. `node --test test/game/formations.test.js`
  3. targeted lint for touched files.

### Follow-up opportunities
1. Add dedicated tests for parser edge-cases (invalid probability expression fallback, malformed ship tokens, offset parsing).
2. Add TS-native tests that import from `js/core/game/formations.ts` once TS test harness is introduced.
3. In a later migration step, move `js/core/game/formations.js` to a thin adapter over compiled output and retire duplicate runtime logic.
