# Village Bone Animation Integration (RGFN)

## What was changed

We replaced the old primitive village NPC rendering (rectangles + circles + sine-wave limbs) with the same bone-animation rendering pipeline used in `eva_game`:

- Imported animation data model (`ImportedAnimationMeta`, `ImportedKeyframe`, etc.).
- Imported walk animation asset (`WALK_KEYFRAMES`, `WALK_META`) copied from `eva_game`.
- Imported stick-figure bone renderer and keyframe interpolation/conversion logic.
- Wired `VillageLifeRenderer.drawVillageVillager()` to render villagers via `StickFigure.getPoseFromImportedAnimation(...)` and `StickFigure.draw(...)`.

## Runtime behavior

- Villagers now render as skeletal mannequins.
- When `villager.isWalking === true`, animation progress advances through the walk cycle.
- When a villager is paused/idle, frame 0 of the walk animation is used as a neutral standing pose.
- Facing direction is derived from movement vector (`fromSpot -> toSpot`) so mannequins flip toward travel direction.

## File map

- `rgfn_game/js/systems/village/VillageLifeRenderer.ts`
  - switched village human rendering to animation-driven mannequin rendering.
- `rgfn_game/js/utils/StickFigure.ts`
  - local copy of eva stick-figure renderer + imported keyframe interpolation.
- `rgfn_game/js/animations/types.ts`
  - imported animation type definitions.
- `rgfn_game/js/animations/imported/walkImported.ts`
  - walk animation keyframes/metadata from eva.

## Notes for future iteration

1. **Theme linkage**
   - Outline color now uses `theme.ui.primaryBg`.
   - Body color is currently a blend of villager shirt and pants colors.
   - If we need richer per-part coloring (skin/hair/hat), extend `StickFigure.draw()` to accept a palette object and render head/limbs/core separately.

2. **Animation state machine**
   - Current implementation only uses the walk clip.
   - We can add imported `idle` animation from `eva_game` and switch clips instead of freezing walk frame 0.

3. **Scale/offset tuning**
   - Current values were tuned for village iso projection:
     - `drawY = villager.y + (villager.size * 2.2)`
     - `renderScale = villager.size * 0.75`
   - If mannequins look too high/low on some resolutions, tweak these two constants first.

4. **Cross-game sync strategy**
   - Right now animation files are copied from `eva_game` into `rgfn_game`.
   - If we plan many shared clips, consider a common package/module for animation assets to avoid divergence.

## Verification checklist

- Build RGFN TypeScript target: `npm run build:rgfn`.
- Run RGFN tests (they rely on `rgfn_game/dist`): `node --test rgfn_game/test/**/*.test.js`.
- Visual check in village scene: villagers should move with skeletal walking animation and face movement direction.
