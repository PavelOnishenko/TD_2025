# GameUiTypes Rule 3 Refactor (2026-03-30)

## Goal
Apply Style Guide Rule 3 (`files not longer than 200 lines`) to `rgfn_game/js/systems/game/GameUiTypes.ts` by extracting cohesive declarations into dedicated class-based modules while preserving runtime behavior.

## What changed
- Replaced the large monolithic type file with a lightweight export barrel:
  - `rgfn_game/js/systems/game/GameUiTypes.ts`
- Extracted HUD element members into:
  - `rgfn_game/js/systems/game/GameUiHudElementsModel.ts`
- Extracted scene-specific UI structures into:
  - `rgfn_game/js/systems/game/GameUiSceneModels.ts`
- Extracted developer/log/bundle structures into:
  - `rgfn_game/js/systems/game/GameUiDeveloperModels.ts`

## Design notes
- New modules use **class declarations** with definite assignment fields (`!`) to satisfy the request to extract into classes.
- Existing consumers continue to import `HudElements`, `BattleUI`, `WorldUI`, `VillageUI`, `DeveloperUI`, `GameLogUI`, and `GameUiBundle` from `GameUiTypes.ts` without path changes.
- Compatibility is retained by exporting type aliases (`export type X = XModel`) from class-bearing modules.

## Rule 3 LOC verification
- `GameUiTypes.ts`: 11 LOC
- `GameUiHudElementsModel.ts`: 107 LOC
- `GameUiSceneModels.ts`: 69 LOC
- `GameUiDeveloperModels.ts`: 51 LOC

All touched files satisfy Rule 3 (`< 200 LOC`).

## Validation checklist
- Run targeted lint for RGFN scope.
- Run project tests.
