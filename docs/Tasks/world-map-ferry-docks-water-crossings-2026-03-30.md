# World Map Ferry Docks for Water Crossings (2026-03-30)

## Goal
- Stop rendering roads directly over water tiles (the player cannot walk on water anyway).
- Add **dock points** at land↔water road transitions.
- Allow instant ferry travel between paired docks to keep inter-village routing usable.

## What was implemented
- Road rendering now suppresses water segments; only land road segments are drawn.
- Ferry dock pairs are generated from sampled road links whenever a road enters and exits a water body.
- Docks are drawn on the map as dedicated markers.
- Entering a dock cell now triggers automatic ferry transfer to the paired dock.
- Ferry transfer adds extra travel fatigue and writes a world-log message with approximate crossing minutes.

## Notes on time
- This iteration models travel cost through fatigue + textual travel minutes in logs.
- A full persistent global clock UI/system is not introduced in this patch; if needed, it should be added as a dedicated runtime service (single source of truth for world minutes, day phases, and sleep/travel consumers).

## Implementation files
- `rgfn_game/js/systems/world/worldMap/WorldMapCore.ts`
- `rgfn_game/js/systems/world/worldMap/WorldMapRoadNetwork.ts`
- `rgfn_game/js/systems/world/worldMap/WorldMapVillageNavigationAndRender.ts`
- `rgfn_game/js/systems/world/worldMap/layers/WorldMapNamedLocationAndVillageOverlays.ts`
- `rgfn_game/js/systems/world/worldMap/WorldMapRenderer.ts`
- `rgfn_game/js/systems/world/WorldMapFeatureRenderer.ts`
- `rgfn_game/js/systems/world-mode/WorldModeTravelEncounterController.ts`

## Follow-up opportunities
- Add ferry interaction prompt (choose destination when multiple routes exist).
- Add ticket pricing and NPC boatman economy hooks.
- Add persistent world time HUD and explicit time-skipping effects for ferry/sleep/village services.


## March 31, 2026 follow-up: visible ferry corridors over water

### Problem
- After the original ferry-dock rollout, roads crossing water disappeared completely in the visual layer.
- Result: players could see two dock markers but not the route between them, which made ferry connectivity unclear.

### Change
- Water-crossing road fragments are now rendered as a dedicated **dashed corridor** between dock endpoints.
- Land road fragments keep the existing solid gold style.
- Dashed ferry corridor style uses a cool blue tint to separate it from regular overland roads while preserving map readability.

### Technical notes
- Road sampling still comes from the same deterministic curved village-road link path; no path topology changes were introduced.
- Visibility rules remain fog-aware: unknown cells do not render either land or ferry corridor road fragments.
- Segment style switches dynamically while iterating sampled points:
  - `land` on non-water terrain
  - `waterCrossing` on water terrain
- Rendering now dispatches to separate draw functions for these two segment styles.

### Updated implementation files
- `rgfn_game/js/systems/world/worldMap/WorldMapRoadNetwork.ts`
- `rgfn_game/js/systems/world/worldMap/layers/WorldMapNamedLocationAndVillageOverlays.ts`
- `rgfn_game/js/systems/world/worldMap/WorldMapRenderer.ts`
- `rgfn_game/js/systems/world/WorldMapFeatureRenderer.ts`

### Quick verification checklist
1. Generate/restore a world where a village road crosses water.
2. Discover both docks and at least one water tile on the crossing.
3. Confirm a dashed line is visible between docks over water and solid line remains on land.
4. Confirm dock interaction/ferry prompt behavior is unchanged.
