# WorldModeController Rule 3 Refactor (2026-03-30)

## Why this refactor happened
- `rgfn_game/js/systems/WorldModeController.ts` was 379 LOC, violating style-guide rule 3 (file must stay under 200 LOC).
- The class mixed input reading, village prompt UI state, travel/resource updates, random encounter flow, item discovery handling, and traveler barter logic.

## What was extracted
- `rgfn_game/js/systems/world-mode/WorldModeMovementInput.ts`
  - Owns world-map pan input and directional move-resolution logic.
- `rgfn_game/js/systems/world-mode/WorldModeVillagePromptController.ts`
  - Owns village prompt open/close/sync/confirm behavior and prompt-open state.
- `rgfn_game/js/systems/world-mode/WorldModeTravelEncounterController.ts`
  - Owns post-movement travel effects, encounter resolution, camp sleep ambush flow, traveler interaction, barter, and item discovery handling.
- `rgfn_game/js/systems/world-mode/WorldModeTypes.ts`
  - Centralized callback contract used by all world-mode helpers.

## Resulting LOC distribution
- `WorldModeController.ts`: 91 LOC
- `WorldModeMovementInput.ts`: 96 LOC
- `WorldModeVillagePromptController.ts`: 72 LOC
- `WorldModeTravelEncounterController.ts`: 193 LOC
- `WorldModeTypes.ts`: 14 LOC

All touched files remain below 200 LOC.

## Behavioral safety checks run
1. `npm run build:rgfn`
2. `node --test rgfn_game/test/systems/worldModeController.test.js`
3. `npm run style-guide:audit:rgfn`

## Notes and follow-up opportunities
- The style-guide audit still reports five rule-3 violations in other RGFN files (e.g., `WorldMap.ts`, `WorldMapRenderer.ts`).
- This refactor provides a reusable decomposition pattern:
  - Orchestrator class + focused input/prompt/encounter subcontrollers + shared callback types.
- If this pattern proves stable, similar extraction can be applied to `WorldMapRenderer` and `DirectionalCombat` next.
