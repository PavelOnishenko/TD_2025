# BattleUiController Rule 3 Refactor (2026-03-30)

## Objective
Apply Rule 3 from `docs/Style_Guide.txt` (files must be under 200 LOC) to `rgfn_game/js/systems/BattleUiController.ts` while keeping behavior unchanged.

## What was changed
- `BattleUiController` was reduced to orchestration + battle log + encounter description responsibilities.
- Enemy targeting, directional selection, and click-based enemy detection were extracted to:
  - `rgfn_game/js/systems/battle-ui/BattleUiTargeting.ts`
- Action visibility / button availability logic was extracted to:
  - `rgfn_game/js/systems/battle-ui/BattleUiActionAvailability.ts`
- Shared UI and selection types were extracted to:
  - `rgfn_game/js/systems/battle-ui/BattleUiTypes.ts`

## Why this split is useful
- Keeps each file below Rule 3 threshold.
- Improves single responsibility boundaries:
  - target detection and enemy display now evolve independently from spell/button visibility rules.
- Makes future tests easier to isolate:
  - `BattleUiTargeting` can be validated against map/position scenarios.
  - `BattleUiActionAvailability` can be validated against mana/range/potion scenarios.

## Behavior notes
- `updateEnemyDisplay` still refreshes action availability before updating displayed target.
- Directional combat selection still prioritizes an enemy in that direction before movement.
- Slow spell range still uses `balanceConfig.combat.spellRanges.slow` fallback behavior.
- Button disabling behavior remains centralized in `setButtonsEnabled`.

## Follow-up opportunities
- Add unit tests for:
  - click-to-enemy hit radius behavior (currently hardcoded at 20).
  - per-spell visibility toggles when mana costs are unavailable.
- Consider extracting `describeEncounter` logic to a small formatter if more enemy-specific text rules are added.
