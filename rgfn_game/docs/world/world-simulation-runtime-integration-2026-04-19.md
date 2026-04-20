# World Simulation Runtime Integration (2026-04-19)

## What was added

- Added `WorldSimulationRuntime` with required API:
  - `initialize(initialState?)`
  - `tick(deltaMinutes)`
  - `getState()`
  - `restoreState(state)`
- Added deterministic stage pipeline order per tick:
  1. `movement`
  2. `taskAssign`
  3. `taskProgress`
  4. `conflicts`
  5. `villages`
- Added persistence support for world simulation snapshot in save payload.
- Added world simulation ticking from gameplay time progression (`advanceTime`), which is triggered by world/village player actions.
- Added a developer-only World Info section with an `Overview` tab in the Developer Event Queue modal.

## Runtime contract

`WorldSimulationRuntime.getState()` returns:

```ts
{
  worldTick: number;
  lastDelta: number;
  pendingEvents: string[];
  lastStageOrder: Array<'movement' | 'taskAssign' | 'taskProgress' | 'conflicts' | 'villages'>;
}
```

### Notes

- `worldTick` is monotonic and increments once per `tick(...)` call.
- `lastDelta` stores the sanitized non-negative delta from the latest call.
- `pendingEvents` is currently a capped rolling buffer (up to 64 entries), safe for debug/inspection.
- `lastStageOrder` is updated every tick and is used to assert pipeline sequencing in tests.

## Why ticking is integrated via `advanceTime`

In the current architecture, most meaningful player actions in world/village modes route through `onAdvanceTime(...)` callbacks (travel, ferry, village interactions, rest/wait, trade actions, etc.).

Hooking `WorldSimulationRuntime.tick(deltaMinutes)` into `GameFacade.advanceTime(...)` ensures:

- one consistent integration point,
- no duplicate ticking scattered across UI handlers,
- easy persistence and inspection.

## Developer UI: World Info / Overview

A new block was added to Developer Event Queue modal:

- Section title: `World Info`
- Tablist (currently one tab): `Overview`
- JSON output fields:
  - `worldTick`
  - `lastDelta`
  - `pendingEvents`
  - `pendingEventsCount`
  - `capturedAt`

## Automated test coverage

Added minimal automated checks for:

1. `worldTick` growth across sequential ticks.
2. exact stage order execution in one tick.

These tests live in:

- `rgfn_game/test/systems/worldSimulationRuntime.test.js`

## UI manual verification checklist (issue checklist)

- [ ] Start RGFN build and launch game UI.
- [ ] Open Developer Event Queue (press `~`).
- [ ] Confirm new **World Info** section is visible.
- [ ] Confirm **Overview** tab exists and is active.
- [ ] Verify initial snapshot shows numeric `worldTick` and `lastDelta`.
- [ ] Perform one action that advances time (e.g., move on world map to trigger travel time).
- [ ] Re-open/refresh World Info Overview and verify `worldTick` increased.
- [ ] Perform another distinct time-advancing action (e.g., village interaction / ferry travel / wait/rest).
- [ ] Verify `worldTick` increased again.
- [ ] Verify `lastDelta` updates according to action time cost.
- [ ] Verify `pendingEvents` is non-empty and includes stage-tagged entries.
- [ ] Save/reload (if using persistent save flow) and verify simulation snapshot restores without reset when save exists.

## Extra implementation notes for future phases

- Current pipeline stage handlers intentionally provide lightweight placeholders/events.
- Domain-specific logic for assignments/conflicts/villages can be incrementally injected into each stage while preserving API.
- If UI payload grows large, consider:
  - pagination/virtualization,
  - partial event projection,
  - compact mode in the Overview tab.
