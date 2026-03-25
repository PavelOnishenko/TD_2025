# World map performance notes (zoomed-out / small cell-size)

## March 2026 optimization pass

Context: when the world map is zoomed far out (small cell size, broad visible bounds), frame time was dominated by hot-path per-cell lookups.

### Changes implemented

1. Added O(1) array-backed caches in `WorldMap`:
   - `fogStatesByIndex`
   - `terrainByIndex`
   - `villageIndexSet`

2. Added a numeric index helper:
   - `getCellIndex(col, row) => row * columns + col`

3. Optimized draw-time access patterns:
   - draw loop now reads `GridMap.cells[index]` directly instead of repeated `getCellAt(col, row)` calls.
   - terrain/fog reads use index-based caches before falling back to string-key maps.

4. Optimized fog refresh flow:
   - transition `discovered -> hidden` now runs over index arrays (no per-cell key string construction in the hot loop).
   - map sync is kept after refresh for save compatibility.

5. Optimized village presence checks:
   - `isPlayerOnVillage` and selected-cell village checks use `villageIndexSet`.

6. Save/restore compatibility preserved:
   - restore now rebuilds index caches from serialized `fogStates` and `villages`.

## Why this is faster

- Avoids frequent string creation (`"col,row"`) during rendering-critical operations.
- Reduces Map/Set hash lookups in tight loops.
- Uses contiguous array access for terrain/fog state.
- Uses direct cell array indexing in the renderer path.

## Validation checklist

- Run:
  - `npm run build:rgfn`
  - `node --test rgfn_game/test/systems/worldMap.test.js`
- Manual smoke:
  - zoom all the way out,
  - pan in all directions,
  - toggle fog on/off in developer controls,
  - verify villages and selected-cell info still match behavior.

## Next-step ideas (if more speed is needed)

- Maintain fog only as an indexed array internally and generate serialized map form lazily only in `getState()`.
- Batch terrain rendering into chunked offscreen canvases and blit chunks at low detail.
- Introduce adaptive draw skipping for subpixel terrain textures when `cellSize <= 8`.

## March 2026 optimization pass #2 (actual frame-time impact)

The first pass reduced lookup overhead but still rendered every visible low-detail tile every frame.

### Additional change

- Added a **low-detail layer cache** for world-map rendering in `WorldMap`:
  - when detail level is `low`, we render the tile layer to an offscreen canvas once,
  - on following frames, we blit only the visible region via `drawImage`.

### Cache invalidation strategy

The low-detail cache is rebuilt when any of these change:
- `cellSize` (zoom changes),
- fog display config (`fogOfWar`, `everythingDiscovered`),
- `fogRevision` (visibility/discovery updates),
- `terrainRevision` (world/terrain regeneration).

### Why this matters

At low zoom, this removes thousands of per-frame canvas calls and style/state transitions from the main frame loop. Panning becomes primarily a cheap image blit + overlay draw instead of full per-cell repaint.

### Safety fallback

In non-browser/test contexts (no `document` or no `drawImage`), rendering falls back to the existing per-cell path to keep tests deterministic and environment-agnostic.
