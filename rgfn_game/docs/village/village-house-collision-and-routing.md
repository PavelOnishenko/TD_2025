# Village house base collision + villager routing (RGFN)

Date: 2026-04-03

## Problem addressed

Villagers were moving in straight lines between random spots.
That allowed feet trajectories to cut through house visuals, including through the house base area.

## What changed

### 1) House base is treated as a physical blocker for villagers

- Village navigation now builds a graph of walkable spot-to-spot edges.
- Every candidate edge is tested against expanded house **footprint rectangles** (house base only).
- If a segment intersects a house footprint, that edge is removed from navigation.
- A small collision padding is used so legs do not visually clip walls.

Implementation: `VillagePopulation`.

### 2) Villagers route around houses instead of moving direct-line only

- At movement start, villager picks a target spot.
- A BFS route is built through the allowed navigation graph.
- Villager follows route segment-by-segment (`routeSpotIndices`) until destination.
- This ensures movement can go around houses when direct movement is blocked.

Implementation: `VillageVillagerMotion` + `VillagePopulation` route callback.

### 3) Added perimeter navigation spots around each house

- `VillageLifeLayoutBuilder` now adds ring/perimeter spots around each house footprint.
- These spots serve as waypoints so pathfinding can produce natural detours.
- All spots now carry both projected coordinates (`x/y`) and world coordinates (`worldX/worldY`) for geometric checks.

## Why this matches the requested behavior

- Collision logic checks house **base/footprint** only (not full roof sprite projection).
- Feet trajectory uses route segments that avoid blocked house footprints.
- Villagers can no longer reliably tunnel through house bases on direct paths and instead choose bypass routes.

## Tuning knobs

Inside `VillagePopulation`:

- `HOUSE_COLLISION_PADDING` (default `0.2`):
  - Increase to make villagers keep larger distance from walls.
  - Decrease if paths feel too conservative/tight.
- `MAX_EDGE_LENGTH` (default `4.2`):
  - Higher = denser connectivity, more route options, potentially less local “street-like” behavior.
  - Lower = more constrained movement and clearer laneing.

Inside `VillageLifeLayoutBuilder`:

- House perimeter spot margin (`margin = 0.45`) controls detour ring distance from house bases.

## Validation performed

- Full RGFN build passes.
- Full RGFN test suite passes (`124/124`).
- Village population scenario tests pass with updated spot shape and initialize signature.
