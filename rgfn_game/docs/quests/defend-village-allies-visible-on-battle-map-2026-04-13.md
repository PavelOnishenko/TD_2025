# Defend Village: allied defenders rendered as real battle-map combatants (2026-04-13)

## Issue observed

During **defend** quest battles, village defenders could:
- take turns,
- move/attack in logs,
- take/deal damage,

while not being visibly rendered as entities on the combat map.

This produced confusing behavior where only red/current-turn tile highlights moved around and logs referenced defender actions that seemed to happen "off-map".

## Root cause

`GameRenderRouter.renderBattleMode(...)` drew only:
- player
- active enemies

It did **not** include active allied defenders in `renderer.drawEntities(...)`, even though battle setup and turn order already included those allies.

## Fix

1. Updated `renderBattleMode` signature to accept `allies`.
2. Included active allies in draw list: `player + allies + enemies`.
3. Updated `GameFacadeLifecycleCoordinator.render()` battle call-site to pass `battleCoordinator.getCurrentAllies()`.

## Result

Allied village defenders now follow the same spatial/combat representation model as every other combatant:
- they occupy visible map cells,
- they move visibly,
- their attacks/damage correspond to on-map positions,
- turn highlights now match visible entity bodies.

## Regression-safety notes

- Turn/team logic was already correct (allies in `TurnManager` player-side team).
- This change is rendering integration only, with no combat balance/math modifications.
- If similar symptoms reappear, first verify render pipeline includes all active turn participants.
