# WorldMap.ts Rule 3 Refactor (2026-03-30)

## Goal
Apply Style Guide Rule 3 (`files not longer than 200 lines`) to `rgfn_game/js/systems/world/WorldMap.ts` by extracting behavior into **meaningfully named classes** with clear responsibilities and preserving runtime behavior.

## Final structure (responsibility-driven)
`WorldMap.ts` is now a thin façade over a staged world-map subsystem chain in `rgfn_game/js/systems/world/worldMap/`:

1. `WorldMapCore.ts`
   - Shared types/consts + state fields + constructor/init flow.
2. `WorldMapTerrainModeling.ts`
   - Climate generation, terrain classification, lakes.
3. `WorldMapWaterAndSettlements.ts`
   - Rivers, player spawn, village placement, terrain-color/pattern helpers.
4. `WorldMapNoiseAndVisibility.ts`
   - Noise/hash/seed helpers, fog-state visibility refresh and terrain queries.
5. `WorldMapMovementAndViewport.ts`
   - Movement, path interpolation, zoom/pan/resize/viewport centering.
6. `WorldMapVillageNavigationAndRender.ts`
   - Village lookup APIs and main world-map draw pipeline orchestration.
7. `WorldMapNamedLocationAndVillageOverlays.ts`
   - Named-location focus/reveal and village/road overlay drawing hooks.
8. `WorldMapRoadNetwork.ts`
   - Road graph/link generation, sampling, segment visibility, road rendering helpers.
9. `WorldMapPersistenceAndSelection.ts`
   - Save/restore + map display config + selected-cell inspection/direction helpers.
10. `WorldMapFocusAndFogOverlay.ts`
   - Named-location focus highlighting and fog overlay draw logic.
11. `WorldMapTerrainCacheRenderer.ts`
   - Terrain-layer cache rendering.

## Why this approach
- Avoids brittle `Part1..Part18` naming and makes maintenance intent explicit.
- Preserves external API surface: `WorldMap.ts` still exports the same class entrypoint and re-exports `KnownVillage` / `WorldVillageDirectionHint`.
- Keeps each extracted file under 200 LOC while retaining method order and behavior.

## Verification and diagnostics
- LOC verification command:
  - `wc -l rgfn_game/js/systems/world/WorldMap.ts rgfn_game/js/systems/world/worldMap/*.ts`
- Build verification command:
  - `npm run build:rgfn`
- Test execution command:
  - `npm test`

### Observed test-suite realities (important context)
- Repository has pre-existing broad failures not scoped to this world-map refactor:
  - many tests expect built `dist` artifacts that are absent in this environment;
  - unrelated projectile/wave assertions fail in root test suites.
- Because of this, `npm test` is informative but not a clean gate for this isolated structural task.

## Knowledge captured for future refactors
- If a large class must satisfy Rule 3 quickly and safely, inheritance-based subsystem staging can preserve runtime API with minimal call-site churn.
- For long-term maintainability, prefer responsibility-based class names from the first extraction pass (as done here) instead of numeric sequencing.
- Keep this subsystem under a dedicated subfolder (`world/worldMap`) to avoid inflating immediate child count in `world/` and to preserve directory clarity.
