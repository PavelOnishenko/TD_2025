# Village Bone Animation Integration (RGFN)

## What changed in this refactor

This integration now uses **shared Engine modules** for animation playback and stick-figure rendering, instead of keeping a local RGFN-only copy of EVA logic.

### Previously
- RGFN had its own local `StickFigure.ts` implementation copied from EVA.
- Walk clip data (`walkImported.ts`) was duplicated in RGFN.

### Now
- Shared animation interpolation + pose conversion lives in `engine/animation/importedAnimation.js`.
- Shared stick-figure renderer lives in `engine/rendering/StickFigure.js`.
- Shared walk clip is centralized in `engine/animation/imported/walkImported.js`.
- RGFN wrapper `rgfn_game/js/utils/StickFigure.ts` only provides RGFN visual style (line widths, outline color), while core math/runtime is from Engine.

## Runtime behavior (RGFN village)

- Villagers render as skeletal mannequins.
- Walking villagers animate over normalized progress `[0..1]` with `WALK_KEYFRAMES/WALK_META`.
- Idle villagers use frame `0` of walk clip as neutral standing pose.
- Facing direction is derived from village movement vector (`fromSpot -> toSpot`).

## RGFN file map

- `rgfn_game/js/systems/village/VillageLifeRenderer.ts`
  - consumes shared walk animation through local re-export and draws via wrapper.
- `rgfn_game/js/utils/StickFigure.ts`
  - thin wrapper over `engine/rendering/StickFigure.js` with RGFN style overrides.
- `rgfn_game/js/animations/imported/walkImported.ts`
  - re-export from engine shared walk asset.

## Why this is better

1. **Single source of truth for animation math**
   - Interpolation and imported-rig-to-pose conversion are now one implementation used by multiple games.
2. **Safer long-term maintenance**
   - Bug fixes in shared animation playback happen once in Engine and apply everywhere.
3. **Visual flexibility remains local**
   - Drawing style remains game-specific through wrapper-level style config.
4. **Asset deduplication**
   - Shared walk data is no longer duplicated between EVA and RGFN.

## Tuning knobs for RGFN visuals

- `LIMB_LINE_WIDTH`, `CORE_BONE_LINE_WIDTH`, `OUTLINE_WIDTH` in `rgfn_game/js/utils/StickFigure.ts`.
- `outlineColor` currently uses `theme.ui.primaryBg`.
- Village placement constants in `VillageLifeRenderer` still control mannequin anchoring and scale.

## Caveats

- Imported animation typing is still declared at game level (`eva_game/js/animations/types.ts`, `rgfn_game/js/animations/types.ts`), while runtime math is shared in Engine JS.
- If a third game adopts these animations heavily, adding Engine-level `.d.ts` files (or converting Engine animation modules to TS) will improve IntelliSense and type strictness.

## Verification checklist

- `npm run build:rgfn`
- `npm run build:eva`
- `node --test rgfn_game/test/**/*.test.js`
- `node --test eva_game/test/*.test.js`
- Manual visual pass in village scene: walkers animate and face movement direction.
