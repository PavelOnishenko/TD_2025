# BattleCommandController Rule-3 Refactor (2026-03-30)

## Goal
Apply Style Guide Rule 3 (`Files not longer than 200 lines`) to `rgfn_game/js/systems/game/BattleCommandController.ts` by extracting cohesive behavior into dedicated classes.

## What was extracted

1. **Target selection logic** moved to `BattleTargetResolver`.
   - Resolves attack target selection from selected enemy + range fallback.
   - Resolves spell target selection with spell-specific range policy (`slow` range override).
   - Resolves directional combat melee target selection.

2. **Directional exchange execution** moved to `BattleDirectionalCombatResolver`.
   - Handles enemy directional move roll with weighted probabilities.
   - Executes directional exchange resolution and log sequencing.
   - Applies post-exchange directional bonus lifecycle for both entities.
   - Applies actor/opponent directional damage outcomes and retaliation callback.

3. **Kill rewards + loot pipeline** moved to `BattleLootManager`.
   - XP + level-up reward log flow.
   - Pending loot queue lifecycle (`resolvePendingLoot`, `clearPendingLoot`).
   - Loot collection from enemy-defined loot and random discovery drop pool.
   - Selected target cleanup on enemy death.

## Current file sizes after refactor

- `BattleCommandController.ts`: **199 LOC**
- `BattleTargetResolver.ts`: **44 LOC**
- `BattleDirectionalCombatResolver.ts`: **98 LOC**
- `BattleLootManager.ts`: **104 LOC**

## Notes for future work

- `js/systems/game` now has **11** immediate children; this exceeds Style Guide Rule 16 and should be handled by folder-level regrouping in a follow-up refactor.
- The style audit still reports broader legacy violations in other files/folders. This change focuses only on requested Rule 3 extraction for the battle command flow.
- `battleCommandController.test.js` currently depends on `rgfn_game/dist/config/balanceConfig.js`, but only `dist/config/balance/balanceConfig.js` exists after `build:rgfn`. The test import path mismatch is pre-existing and should be fixed in a dedicated test-infra patch.
