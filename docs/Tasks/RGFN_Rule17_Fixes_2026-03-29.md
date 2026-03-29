# RGFN: Rule 17 lint cleanup notes (2026-03-29)

## Scope
- Target only `rgfn_game` (not Neon Void in root), per task requirement.
- Main check command:
  - `npm run lint:ts:rgfn:eslint`

## Result snapshot
- Before this pass: **80 warnings** (Rule 17 + one existing `indent` warning in `Item.ts`).
- After this pass: **53 warnings** (Rule 17 + same existing `indent` warning in `Item.ts`).
- Net reduction: **27 warnings fixed**.

## What Rule 17 was flagging in practice
Rule 17 mostly flagged **comma-separated initializers** (objects/arrays/return literals) that were written over multiple lines even though they still fit safely into one line with current line-length budget and context indentation.

Typical transformations that consistently reduced warnings:
1. Small object literals in constants.
2. Small array literals where entries are short object literals.
3. Return objects in short methods.
4. Small inline config sub-objects (`viewport`, `showFogOverlay`, etc.).

## Practical heuristics (to speed future cleanup)
1. If object/array has only ~2-6 short fields and no nested multiline expressions, prefer one-liner.
2. For `return { ... }` in small methods, one-liner usually satisfies Rule 17.
3. For nested config blocks in long files, converting only the flagged literal (not surrounding logic) is safe and low-risk.
4. Re-run linter often after each batch to avoid accidental regressions.

## Caveats observed
- Not every multiline literal should be collapsed blindly: some are near threshold and may still warn due to indentation/context length math.
- Existing non-Rule-17 warning remained in `rgfn_game/js/entities/Item.ts` (`indent`) and was not addressed in this pass.

## Files touched in this cleanup
- `rgfn_game/js/config/ThemeConfig.ts`
- `rgfn_game/js/config/balance/itemsEncountersBalance.ts`
- `rgfn_game/js/config/balance/playerEnemyBalance.ts`
- `rgfn_game/js/config/balance/progressionBalance.ts`
- `rgfn_game/js/config/balance/worldMapBalance.ts`
- `rgfn_game/js/systems/magic/SpellEffects.ts`
- `rgfn_game/js/systems/world/WorldMap.ts`
- `rgfn_game/js/utils/NextCharacterRollConfig.ts`
- `rgfn_game/js/utils/RandomProvider.ts`

## Suggested next wave
- Continue with files that have 1-3 Rule 17 warnings first (quick wins): `Wanderer.ts`, `BattleUiController.ts`, `MagicSystem.ts`, `BattleSplashView.ts`, `StateMachine.ts`.
- Then handle medium clusters: `VillagePopulation.ts`, `BattleMap.ts`, `DirectionalCombat.ts`, `WorldMap.ts`.

---

## Follow-up pass (same date): targeted 15-fix batch for RGFN

### Goal for this pass
- Fix exactly **15 additional Rule 17 warnings** in `rgfn_game` with low-risk formatting-only edits.
- Keep scope away from Neon Void/root gameplay files.

### Commands used
- `npm run lint:ts:rgfn:eslint` (before + after validation).
- `npm test` (full repository test run requested by task custom instructions).

### Outcome
- Rule 17 warnings went from **53 → 38** (**15 fixed**, as requested).
- Existing non-Rule-17 warning in `rgfn_game/js/entities/Item.ts` (`indent`) still present and intentionally untouched in this pass.

### Files updated in the 15-fix batch
- `rgfn_game/js/entities/Skeleton.ts` (2 warnings)
- `rgfn_game/js/entities/Wanderer.ts` (1 warning)
- `rgfn_game/js/systems/BattleUiController.ts` (1 warning)
- `rgfn_game/js/systems/combat/BattleMap.ts` (5 warnings)
- `rgfn_game/js/systems/combat/DirectionalCombat.ts` (3 warnings)
- `rgfn_game/js/systems/encounter/DeveloperEventController.ts` (1 warning)
- `rgfn_game/js/systems/encounter/EncounterResolver.ts` (1 warning)
- `rgfn_game/js/systems/encounter/EncounterSystem.ts` (1 warning)

### Additional engineering notes
- Full `npm test` currently fails mainly due to pre-existing repository-wide issues outside this lint-only task:
  - missing built `dist` artifacts for `eva_game` and `rgfn_game` tests,
  - several existing projectile test fixture/runtime mismatches (`enemy.takeDamage is not a function`).
- Suggested stabilization sequence for future contributors:
  1. Build target games before test execution (`npm run build:eva` and `npm run build:rgfn`), then rerun tests.
  2. If projectile tests still fail, align test doubles with current enemy API in `test/projectiles.test.js`.
