# Village enterability fallback (April 13, 2026)

## Issue summary

A world-map village tile could be visible and selectable as a village, but stepping onto it would not always open the village entry popup (`Enter` / `Pass by`).

Observed player symptom:
- selected panel identified tile as a mapped village;
- hero stood on the tile;
- no village entry popup appeared, so village mode could not be entered from that tile.

## Root-cause class

Village enterability checks depended primarily on the location-feature cache (`locationFeatureIndexMap` via `hasLocationFeatureAt(..., 'village')`).

If that cache ever became temporarily inconsistent with the canonical village sets (`villages` and `villageIndexSet`), village prompt logic could reject a valid village tile.

## Fix implemented

`WorldMapVillageNavigationAndRender` now exposes `isVillageAt(col, row)` that treats a tile as village when **any** village source confirms it:

1. location feature cache has `village`, OR
2. `villageIndexSet` contains tile index, OR
3. `villages` set contains tile key.

`isPlayerOnVillage()` now uses this unified method.

`WorldMapPersistenceAndSelection.getSelectedCellInfo()` now also uses `isVillageAt(...)` to keep selected-panel classification aligned with the enterability gate.

## Regression test

Added test scenario in `rgfn_game/test/systems/worldMap.test.js`:
- place player on generated village tile,
- clear location-feature cache intentionally,
- assert `worldMap.isPlayerOnVillage()` is still `true`.

This protects the core invariant:

> Any village tile represented in world village state must remain enterable.

## Follow-up guidance

When adding new location features:
- avoid single-source assumptions for critical interactions;
- keep prompt gates and HUD selected-cell labels powered by the same village predicate;
- include tests that simulate stale/missing caches.
