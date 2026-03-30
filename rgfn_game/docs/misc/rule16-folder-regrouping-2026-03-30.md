# RGFN Rule 16 Folder Regrouping (2026-03-30)

## Scope

This change reorganizes **RGFN folder hierarchy only** to satisfy Style Guide Rule 16
(max 10 immediate children per folder) without changing game behavior.

## Why this was done

The RGFN style-guide audit previously reported folder child-count violations in:

- `docs`
- `js`
- `js/systems`
- `js/systems/combat`
- `js/systems/game`
- `js/systems/quest`
- `js/systems/village`
- `js/systems/world/worldMap`
- `test/systems`

## What was regrouped

### Runtime code

- `js/engine.d.ts` -> `js/types/engine.d.ts`
- `js/global.d.ts` -> `js/types/global.d.ts`
- `js/systems/BattleUiController.ts` -> `js/systems/controllers/BattleUiController.ts`
- `js/systems/HudController.ts` -> `js/systems/controllers/HudController.ts`
- `js/systems/lore/*` -> `js/systems/controllers/lore/*`
- `js/systems/magic/*` -> `js/systems/controllers/magic/*`
- `js/systems/combat/BattleMapPainterUtils.ts` -> `js/systems/combat/map/BattleMapPainterUtils.ts`
- `js/systems/combat/BattleMapSelectionInfo.ts` -> `js/systems/combat/map/BattleMapSelectionInfo.ts`
- `js/systems/game/GameUi*.ts` -> `js/systems/game/ui/*`
- selected quest generation/pack files -> `js/systems/quest/generation/*`
- `VillageLife*` files -> `js/systems/village/life/*`
- selected world-map layer files -> `js/systems/world/worldMap/layers/*`

### Tests

Selected system tests moved to `test/systems/scenarios/*` to reduce immediate children in `test/systems`.

### Docs

RGFN docs were grouped by topic:

- `docs/refactors`
- `docs/world`
- `docs/village`
- `docs/quest`
- `docs/player`
- `docs/systems`
- `docs/misc`

And `docs/refactors/rule3/*` was further split by domain (`game`, `quest`, `village`, `combat`).

## Import/path updates

All TypeScript imports were updated to match moved files. The RGFN TypeScript build succeeds after path updates.

## Validation run

1. `npm run style-guide:audit:rgfn`
   - Rule 16 folder violations: **0**.
2. `npm run build:rgfn`
   - TypeScript build: **pass**.
3. `npm test`
   - still fails due existing monorepo baseline issues outside this folder regrouping
     (missing prebuilt `dist` modules in EVA/RGFN tests and unrelated root projectile assertions).

## Notes for follow-up

- Rule 3 / Rule 2 warnings remain in a few RGFN files and were not addressed in this folder-only pass.
- If desired, a follow-up can normalize test import paths for moved RGFN test files to reduce missing-module noise.
