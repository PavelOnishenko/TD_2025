# World Map lint warning fixes (2026-03-30)

## Scope
Resolved the warning set reported for the world map rendering/controller files:

- `rgfn_game/js/systems/world/WorldMapOverlayRenderer.ts`
- `rgfn_game/js/systems/world/WorldMapTerrainPatternRenderer.ts`
- `rgfn_game/js/systems/world/worldMap/WorldMapCore.ts`
- `rgfn_game/js/systems/world/worldMap/WorldMapRenderer.ts`
- `rgfn_game/js/systems/world/worldMap/WorldModeController.ts`

## What changed

### Overlay renderer
- Applied style-guide rule 17 by compacting a short constructor parameter list to one line.
- Split long `createRoundedRectPath(...)` calls so each line stays below `max-len`.

### Terrain pattern renderer
- Added braces to all single-line `if` statements in the pattern and icon dispatchers to satisfy `curly`.

### World map core
- Removed unused imports and an unused internal type (`ClimateCell`) that triggered `@typescript-eslint/no-unused-vars`.
- Converted `createWorldSeed` to an arrow property to satisfy `style-guide/arrow-function-style`.

### World map renderer
- Removed unused `theme` import.

### World mode controller
- Removed unused imports (`Item`, `Direction`, `balanceConfig`).
- Converted two single-return wrapper methods to arrow properties:
  - `tryEnterVillageAtCurrentPosition`
  - `confirmVillageEntryFromPrompt`

## Validation commands

```bash
npx eslint rgfn_game/js/systems/world/WorldMapOverlayRenderer.ts \
  rgfn_game/js/systems/world/WorldMapTerrainPatternRenderer.ts \
  rgfn_game/js/systems/world/worldMap/WorldMapCore.ts \
  rgfn_game/js/systems/world/worldMap/WorldMapRenderer.ts \
  rgfn_game/js/systems/world/worldMap/WorldModeController.ts
```

Result: no warnings for the targeted files.

```bash
npm run lint:ts:rgfn:eslint
```

Result: passes for these changed files; other warnings remain elsewhere in repo.

```bash
npm test
```

Result: fails at repo level due to pre-existing issues unrelated to this patch (notably missing built `dist` modules in `eva_game`/`rgfn_game`, and several failing gameplay unit tests in root `test/`).

## Follow-up opportunities
- Add a pre-test build step for projects whose tests import from `dist/`.
- Narrow CI test matrix so domain-specific failures do not mask focused lint/style work.
- Continue reducing style-guide warnings in remaining `rgfn_game` files.
