# VillageLifeRenderer.ts Rule 3 Refactor (2026-03-30)

## Goal
Apply Style Guide Rule 3 (`files <= 200 LOC`) to `rgfn_game/js/systems/village/VillageLifeRenderer.ts` by extracting cohesive responsibilities into new classes while keeping runtime behavior stable.

## What changed
- `VillageLifeRenderer.ts` is now orchestration-only (state updates, villager drawing, projection, color mixing).
- Extracted house drawing into `VillageHouseRenderer.ts`.
- Extracted layout and village spot generation into `VillageLifeLayoutBuilder.ts`.
- Extracted shared village renderer types into `VillageLifeTypes.ts`.

## Why this split
- **Single responsibility**: geometry/layout generation and canvas rendering are now separate.
- **Lower cognitive load**: each class can be inspected independently.
- **Future testability**: spot generation and house rendering can now be tested in isolation with small harnesses.

## LOC snapshot (post-change)
- `VillageLifeRenderer.ts`: 114 LOC
- `VillageHouseRenderer.ts`: 105 LOC
- `VillageLifeLayoutBuilder.ts`: 62 LOC
- `VillageLifeTypes.ts`: 26 LOC

All touched files satisfy Rule 3.

## Verification run
- `npm run build:rgfn` ✅
- `npm run style-guide:audit:rgfn` ✅ (informational audit; this change removes `VillageLifeRenderer.ts` from Rule 3 violations)
- `npm run test` ⚠️ fails due to unrelated pre-existing repository issues (missing `dist` modules for eva/rgfn tests and unrelated assertion/type failures in root tests).

## Notes for future work
- Largest remaining Rule 3 village targets from audit:
  - `js/systems/village/VillageActionsController.ts` (746 lines)
  - `js/systems/village/VillagePopulation.ts` (220 lines)
  - `js/systems/village/VillageDialogueEngine.ts` (211 lines)
- If continuing this backlog, use the same pattern:
  1. keep orchestration in parent class,
  2. move deterministic data shaping to builder/service classes,
  3. move canvas draw chunks to dedicated renderer classes.
