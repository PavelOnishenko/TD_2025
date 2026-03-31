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
