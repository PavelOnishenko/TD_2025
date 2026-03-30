# WorldMapRenderer Rule 3 Refactor (2026-03-30)

## Goal
Apply style guide rule 3 (file under 200 LOC) to `rgfn_game/js/systems/world/WorldMapRenderer.ts` while preserving behavior.

## What was extracted
- `WorldMapColorUtils.ts`: alpha conversion, color mixing, brightness, deterministic seed RNG.
- `WorldMapGeometryUtils.ts`: rectangle/rounded-rectangle path builders and terrain path helper.
- `WorldMapTerrainPatternRenderer.ts`: terrain textures and terrain glyph icons.
- `WorldMapCellRenderer.ts`: fog/terrain cell rendering flow with detail-level branching.
- `WorldMapFeatureRenderer.ts`: named locations, village glyphs, and road path rendering.
- `WorldMapOverlayRenderer.ts`: background, grid, marker/focus/cursor overlays, scale legend.

## Architectural note
`WorldMapRenderer.ts` now works as a thin facade/composition root:
1. Creates shared utility classes.
2. Wires them into focused renderers.
3. Delegates existing public methods to extracted classes.

This keeps the API stable for callers (`WorldMap.ts`) while enabling smaller, testable files.

## Rule 3 verification strategy
Run:

```bash
node scripts/style-guide-audit.mjs --scope rgfn_game/js/systems/world
```

Then verify all new/edited world renderer files stay below 200 LOC.

## Risk notes
- Behavior-preserving extraction depends on preserving draw order and alpha blending values.
- `createTerrainPath` remains full-cell by design to avoid anti-alias seam artifacts at certain zoom levels.

## Follow-up opportunities
- Add focused unit tests around color math and deterministic seed usage.
- Add snapshot/visual tests for renderer delegates for future safe refactors.
