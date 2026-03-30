# RGFN Red Test Fixes — Compatibility Adapters (2026-03-30)

## Why tests were red

The RGFN test suite expected legacy import paths in `dist/` that no longer existed after folder regrouping/refactors (e.g. `dist/entities/Player.js`, `dist/config/balanceConfig.js`, `dist/systems/world/WorldMap.js`).

Result: many tests failed before logic execution with `ERR_MODULE_NOT_FOUND`.

## What was done

### 1) Added compatibility adapter modules (legacy path shims)

Small TypeScript bridge files were added so legacy imports continue to work while preserving current folder layout:

- `js/config/balanceConfig.ts` -> re-exports `js/config/balance/balanceConfig.ts`
- `js/entities/Player.ts` -> re-exports `js/entities/player/Player.ts`
- `js/systems/quest/QuestLeafFactory.ts` -> re-exports `js/systems/quest/generation/QuestLeafFactory.ts`
- `js/systems/quest/QuestPackService.ts` -> re-exports `js/systems/quest/generation/QuestPackService.ts`
- `js/systems/world/WorldMap.ts` -> re-exports `js/systems/world/worldMap/WorldMap.ts`
- `js/systems/world/WorldMapRenderer.ts` -> re-exports `js/systems/world/worldMap/WorldMapRenderer.ts`
- `js/systems/WorldModeController.ts` -> re-exports `js/systems/world/worldMap/WorldModeController.ts`
- `js/systems/magic/MagicSystem.ts` -> re-exports `js/systems/controllers/magic/MagicSystem.ts`

### 2) Added test helper compatibility path

- Added `test/systems/helpers/testUtils.js` that re-exports from `test/helpers/testUtils.js`.

This resolves a scenario test importing `../helpers/testUtils.js` relative to `test/systems/scenarios`.

### 3) Restored compatibility methods expected by tests

- `VillageActionsController` regained `getPersonDirectionHint(personName)` as a private compatibility proxy to `VillageBarterService.getPersonDirectionHint(...)`.
- `BattleLootManager` now exposes a public `collectLoot(...)` wrapper (internally unchanged behavior).
- `BattleCommandController` now exposes `collectLoot(target)` and forwards to `BattleLootManager`, matching legacy controller API expected by tests.

## Behavior policy reinforced

- Keep refactored internals, but preserve thin compatibility surfaces for legacy/dist import paths and widely used controller methods.
- Avoid changing game behavior when fixing test infrastructure breakages.
- Prefer adapter modules over deep rewrites when failures are pure path/API drift.

## Verification

- Build + full RGFN tests run green:
  - `npm run build:rgfn`
  - `node --test $(find rgfn_game/test -name '*.test.js' | sort)`

## Follow-up recommendation

When future folder reorganizations happen, add/update adapter files in the same PR and run the full RGFN suite to avoid widespread red tests from import-path drift.
