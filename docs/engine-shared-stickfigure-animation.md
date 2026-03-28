# Engine Shared Stick-Figure Animation Pipeline

## Goal

Move reusable animation playback functionality (initially copied from EVA into RGFN) into `engine/`, so all games in the repository can consume the same implementation.

## New shared modules

### 1) `engine/animation/importedAnimation.js`
Responsibilities:
- Normalize animation progress.
- Interpolate imported animation params by keyframe time.
- Convert imported params to render pose coordinates (the mannequin pose used by renderers).

Exported APIs:
- `getPoseFromImportedAnimation(keyframes, meta, progress)`
- `getImportedAnimationParamsAt(keyframes, meta, progress)`

### 2) `engine/rendering/StickFigure.js`
Responsibilities:
- Draw mannequin pose on canvas.
- Keep rendering generic via style options.
- Delegate clip-to-pose conversion to shared animation module.

Exported API:
- `StickFigure.draw(ctx, x, y, pose, color, facingRight, scale?, style?)`
- `StickFigure.getPoseFromImportedAnimation(keyframes, meta, progress)`

### 3) `engine/animation/imported/walkImported.js`
Responsibilities:
- Shared walk clip data (`WALK_KEYFRAMES`, `WALK_META`) used by multiple games.

## Integration strategy in games

Use a **thin wrapper pattern** in each game:

- Local wrapper imports Engine `StickFigure`.
- Wrapper applies game-specific visual style (outline color, line widths).
- Game systems continue importing their local wrapper path, minimizing invasive changes.

This allows:
- Stable local API per game.
- Engine-level behavior reuse.
- Per-game aesthetics without forking math logic.

## TypeScript interop notes

Current repo state mixes TS game code + JS engine modules. To keep progress fast and low-risk:
- Runtime shared modules are JS under `engine/`.
- Game-level `engine.d.ts` declarations were extended for new Engine modules.

Future cleanup option:
- Introduce dedicated `engine/**/*.d.ts` (or migrate Engine animation modules to TS) for stronger typing in all games.

## Practical lessons learned

1. Shared math should be extracted before adding more clips to additional games.
2. Rendering style and animation math should stay decoupled.
3. Re-exporting shared assets from game-local paths can preserve compatibility while deduplicating data.
4. When mixing TS and JS modules, module declaration hygiene (`*.d.ts`) prevents friction.

## Suggested next steps

1. Move `ImportedAnimation` type contracts to Engine-level declarations.
2. Gradually re-export additional EVA clips from `engine/animation/imported/` as needed.
3. Add a tiny engine-level animation regression test validating interpolation endpoints and midpoints.
4. Add a lightweight “pose visualizer” helper that any game can enable in debug mode.
