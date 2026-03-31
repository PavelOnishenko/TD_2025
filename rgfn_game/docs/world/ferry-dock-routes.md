# World ferry dock routes (March 31, 2026)

## What changed

RGFN world-map ferry travel now uses an explicit **dock menu flow** instead of silent instant transport.

At a dock tile (a non-water tile adjacent to water), pressing the regular **Enter Village** world action now behaves like this:

1. If player is on a village tile: existing village entry prompt opens.
2. Else, if player is on a dock tile with connected ferry routes: ferry prompt opens.
3. Else: world log explains that player must stand on village or dock tile.

## Ferry route rules

- Destination list is **restricted** to villages that are actually reachable through water from the **current dock cell**.
- The list is built by:
  - identifying village tiles that also function as docks (village adjacent to water),
  - running water-only shortest-path search from current dock's adjacent water cells to candidate dock's adjacent water cells.
- If no valid water connection exists, destination is not shown.

This enforces the requirement: no arbitrary village teleporting.

## Price model

- Fare is tied to water-route length.
- Current formula:
  - `priceGold = max(1, round(waterPathLength * 0.75))`
- Prompt displays price for currently selected destination.

## Confirmation / cancel UX

Ferry popup includes:

- destination selector (`select`)
- explicit price line (`Price: X gold`)
- **confirm** (`✔`) and **cancel** (`✖`) action buttons

## Travel logs

On successful ferry travel, world log receives travel narration:

- payment + boarding line
- crossing summary line with water cell count and destination village name

If player lacks gold, a clear refusal message is logged and travel is not executed.

## Technical integration notes

- Ferry route discovery + execution are implemented in world-map layer (`WorldMapRoadNetwork`) so the world mode controller can request route options and execute travel.
- Ferry prompt rendering/positioning is implemented in `GameWorldInteractionRuntime`, matching existing world popup anchoring behavior.
- World UI model + factory now expose ferry popup elements.
- Runtime UI binder wires confirm/cancel/selection actions to game facade + world-mode ferry handlers.

## Known constraints / follow-ups

- Current destination set is limited to **village docks**. Non-village docks can be source, but destinations remain villages by design.
- Pathfinding uses cardinal water adjacency (no diagonal water hops).
- Potential future extension:
  - add route metadata (route names, operator NPC/faction, weather modifiers),
  - add dynamic fare multipliers (reputation, day/night, event state),
  - add visual highlighting of destination dock on world map while menu is open.
