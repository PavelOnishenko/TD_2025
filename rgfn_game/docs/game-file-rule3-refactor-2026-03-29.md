# Game.ts Rule 3 Refactor (2026-03-29)

## What changed
- `rgfn_game/js/Game.ts` is now a thin entrypoint re-exporting `game/GameFacade.ts`.
- Core runtime responsibilities were split into dedicated classes:
  - `GameQuestRuntime` (quest state/progress orchestration)
  - `GamePersistenceRuntime` (save/load and snapshot checks)
  - `GameWorldInteractionRuntime` (world map interaction and village prompt UX)
  - `GameFactory` (runtime wiring and dependency assembly)

## Why
- Enforce style guide rule 3: keep files below 200 LOC.
- Improve maintainability and isolate concerns for future testing.

## Follow-up ideas
- Add focused unit tests for each runtime class.
- Remove type-casts around state machine and replace with explicit interface contracts.
- Break `GameFactory` event binding into composable binders if more callbacks are added.
