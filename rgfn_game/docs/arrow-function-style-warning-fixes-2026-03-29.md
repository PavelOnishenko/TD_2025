# Arrow Function Style Warning Fixes (2026-03-29)

## Context
The custom lint rule `style-guide/arrow-function-style` reports warnings when a named function/method has a single return/assignment statement and can be expressed as an arrow function.

## What was changed
The following warning targets were converted to arrow-function forms:

- `WorldModeController.wasMoveTriggered`
- `BattleMap`:
  - `clearSelectedCell`
  - `isObstacle`
  - `getObstacles`
  - `getPlayerSpawnPosition`
  - `allEnemiesHaveMeleeLane`
  - `countAdjacentObstacles`
  - `getEntityGridPosition`
  - `isOccupiedByLivingEntity`
  - `getCellKey`
  - `randomInt`
  - `formatObstacleName`
- `BattleMapView.isEntityAtCell`
- `DirectionalCombat`:
  - `isAttackMove` (now exported as `const` arrow)
  - `createNoDamageResolution`
- `TurnManager.getActiveEnemies`
- `EncounterResolver`:
  - `clearForcedEncounters`
  - `getForcedEncounterQueue`
- `EncounterSystem`:
  - `getForcedEncounterQueue`
  - `setEncounterTypeEnabled`
  - `isEncounterTypeEnabled`
  - `getEncounterTypeStates`
  - `createInitialEncounterTypeStates`
  - `shouldSkipRandomEncounter`
  - `getEnabledEncounterTypes`
- `BattleCommandController`:
  - `clearPendingLoot`
  - `canUseBattleTurnInput`

## Verification commands
- Linted only touched files:
  - `npx eslint rgfn_game/js/systems/WorldModeController.ts rgfn_game/js/systems/combat/BattleMap.ts rgfn_game/js/systems/combat/BattleMapView.ts rgfn_game/js/systems/combat/DirectionalCombat.ts rgfn_game/js/systems/combat/TurnManager.ts rgfn_game/js/systems/encounter/EncounterResolver.ts rgfn_game/js/systems/encounter/EncounterSystem.ts rgfn_game/js/systems/game/BattleCommandController.ts --ext .ts`
- Built RGFN TypeScript output:
  - `npm run build:rgfn`

## Notes learned
- The `style-guide/arrow-function-style` warnings are currently informational and repo-wide; many existing warnings remain outside this focused fix.
- Converting class methods to arrow class fields can change binding semantics (usually favorable for callbacks) but increases per-instance function allocations.
- Some tests require prebuilt `dist` artifacts and fail with `ERR_MODULE_NOT_FOUND` when these artifacts are absent.
