# ThemeConfig TODO Resolution Notes

## Scope
- Files updated:
  - `rgfn_game/js/config/ThemeConfig.ts`
  - `rgfn_game/js/config/Theme.ts` (new)
- Goal: resolve all inline TODO markers in `ThemeConfig.ts` and align with `docs/Style_Guide.txt` rule 17.

## What was changed
1. Moved `Theme` interface into a dedicated file (`Theme.ts`) and imported it from `ThemeConfig.ts`.
2. Removed all TODO comments from `ThemeConfig.ts`.
3. Applied Rule 17 formatting to compact object literals where line length allows:
   - `entities.skeleton`
   - `worldMap.terrain`
   - `worldMap.iconScale`
   - `worldMap.questionMarkOffset`
   - `worldMap.gridOffset`
   - `worldMap.gridDimensions`
   - `worldMap.viewportSize`
   - `worldMap.cellSize`
   - `battleMap.gridSize`
4. Preserved all theme values and behavior (refactor/formatting-only changes).

## Rule references used
- Rule 8: avoid comments where code is self-explanatory (resolved TODO-only comments).
- Rule 15: prefer fewer lines when practical.
- Rule 17: use single-line collection/object members when line length allows.

## Validation checklist used
- Run RGFN TypeScript lint.
- Run repository tests.
- Confirm no TODO markers remain in `ThemeConfig.ts`.

## Reuse note
For config object cleanup tasks, the low-risk sequence is:
1. Move shared type/interface declarations to dedicated files first.
2. Apply rule-17 compaction to the most nested blocks.
3. Run lint/tests after formatting to ensure no accidental value edits.
