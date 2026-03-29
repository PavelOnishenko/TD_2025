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

---

## Follow-up pass (same date): targeted 18-fix batch for RGFN

### Goal for this pass
- Fix exactly **18 additional Rule 17 warnings** in `rgfn_game` (formatting-only, low-risk).
- Keep scope limited to RGFN and avoid Neon Void/root game behavior changes.

### Commands used
- `npm run lint:ts:rgfn:eslint` (before + after).
- `npm test` (requested by custom instructions; known repository-wide instability remains).

### Outcome
- Rule 17 warnings went from **37 → 19** (**18 fixed**, as requested).
- No non-Rule-17 warning remains in the current `rgfn_game` lint output snapshot.

### Files updated in this 18-fix batch
- `rgfn_game/js/entities/Item.ts`
- `rgfn_game/js/systems/combat/BattleMapView.ts`
- `rgfn_game/js/systems/encounter/DeveloperEventController.ts`
- `rgfn_game/js/systems/encounter/EncounterResolver.ts`
- `rgfn_game/js/systems/encounter/EncounterSystem.ts`
- `rgfn_game/js/systems/game/runtime/GameModeStateMachine.ts`
- `rgfn_game/js/systems/magic/MagicSystem.ts`
- `rgfn_game/js/systems/quest/QuestLeafFactory.ts`
- `rgfn_game/js/systems/quest/QuestPatterns.ts`
- `rgfn_game/js/systems/quest/QuestProgressTracker.ts`
- `rgfn_game/js/systems/quest/QuestUiController.ts`
- `rgfn_game/js/systems/village/VillageActionsController.ts`
- `rgfn_game/js/systems/village/VillageDialogueEngine.ts`

### Remaining Rule 17 backlog after this pass
- `VillageDialogueEngine.ts`: 2 warnings
- `VillageLifeRenderer.ts`: 1 warning
- `VillagePopulation.ts`: 5 warnings
- `WorldMap.ts`: 6 warnings
- `WorldMapRenderer.ts`: 1 warning
- `BattleSplashView.ts`: 1 warning
- `GridMap.ts`: 2 warnings
- `StateMachine.ts`: 1 warning

### Test status note
- `npm test` still fails due to pre-existing repo-wide issues unrelated to this formatting pass:
  - missing `dist/` build artifacts for `eva_game` and `rgfn_game` test imports,
  - existing projectile tests expecting `enemy.takeDamage` in root game tests.

---

## Follow-up pass (same date): targeted final 16-warning cleanup for listed files

### Goal for this pass
- Resolve the remaining **16 explicitly reported Rule 17 warnings** by converting parameter lists to compact one-line signatures where the linter indicates they fit.
- Keep changes formatting-only (no logic/behavior modifications).

### Commands used
- `npm run lint:ts:rgfn` (verification that RGFN lint passes and no Rule 17 warnings remain in this batch).
- `npm run style-guide:audit:rgfn` (informational style audit report).
- `npm test` (requested by custom instructions; known unrelated failures remain).

### Outcome
- All 16 listed Rule 17 warnings were fixed in-place.
- `npm run lint:ts:rgfn` now succeeds for this scope.
- `npm test` still reports pre-existing failures unrelated to these formatting-only changes.

### Files updated in this 16-warning pass
- `rgfn_game/js/entities/monster/MonsterMutationEngine.ts`
- `rgfn_game/js/entities/monster/MonsterVisualRenderer.ts`
- `rgfn_game/js/entities/player/core/PlayerRenderer.ts`
- `rgfn_game/js/systems/combat/BattleMap.ts`
- `rgfn_game/js/systems/combat/BattleMapView.ts`
- `rgfn_game/js/systems/quest/QuestProgressTracker.ts`
- `rgfn_game/js/systems/quest/QuestUiController.ts`
- `rgfn_game/js/systems/world/WorldMapRenderer.ts`
- `rgfn_game/js/utils/StickFigure.ts`

### Notes / reusable knowledge
- Rule 17 regularly flags multiline function parameter lists that can fit on one line even at 150+ characters with indentation context; this frequently occurs in rendering and UI helper methods with many scalar arguments.
- Fastest low-risk workflow for future cleanup:
  1. Collapse only the warned function signature parameter list.
  2. Re-run `npm run lint:ts:rgfn`.
  3. Avoid touching method body formatting unless needed (reduces merge conflicts and risk).

---

## Follow-up pass: arrow-function-style warnings in quest/village cluster

### Why this pass was needed
- A targeted warning list flagged `style-guide/arrow-function-style` violations in quest and village systems where methods had a single return statement and should use concise arrow-function style.

### What was changed
- Converted the listed methods to property arrow functions with concise return bodies.
- Used parenthesized concise object returns (`=> ({ ... })`) where a literal object was returned.
- Kept behavior unchanged; this pass is style-only.

### Files updated
- `rgfn_game/js/systems/quest/QuestLeafFactory.ts`
- `rgfn_game/js/systems/quest/QuestPackService.ts`
- `rgfn_game/js/systems/quest/QuestRandom.ts`
- `rgfn_game/js/systems/quest/QuestUiController.ts`
- `rgfn_game/js/systems/village/VillageActionsController.ts`
- `rgfn_game/js/systems/village/VillageDialogueEngine.ts`

### Validation commands
- `npx eslint rgfn_game/js/systems/quest/QuestLeafFactory.ts rgfn_game/js/systems/quest/QuestPackService.ts rgfn_game/js/systems/quest/QuestRandom.ts rgfn_game/js/systems/quest/QuestUiController.ts rgfn_game/js/systems/village/VillageActionsController.ts rgfn_game/js/systems/village/VillageDialogueEngine.ts --ext .ts`
  - Result: clean for the targeted files (0 warnings / 0 errors).
- `npm run lint:ts:rgfn:eslint`
  - Result: existing repository-wide warnings remain outside this targeted scope.
- `npm test`
  - Result: existing repository-wide failures remain (missing `dist` imports and projectile fixture mismatch: `enemy.takeDamage is not a function`).
