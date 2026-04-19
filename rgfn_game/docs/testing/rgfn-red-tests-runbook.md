# RGFN red-tests runbook

## Why RGFN tests sometimes fail all at once

RGFN tests import compiled files from `rgfn_game/dist/**`, not TypeScript source files.
If the dist output is missing or stale, many tests fail with `ERR_MODULE_NOT_FOUND` (for example, missing `rgfn_game/dist/entities/Skeleton.js`).

This is expected behavior for the current production layout: runtime code is consumed from built JS artifacts.

## Canonical test command

Use the script that always rebuilds first:

```bash
npm run test:rgfn
```

That command performs:
1. `npm run build:rgfn`
2. `node --test rgfn_game/test/**/*.test.js`

## Fast diagnosis checklist

1. Confirm dist exists:
   ```bash
   test -f rgfn_game/dist/entities/Skeleton.js && echo "dist ok" || echo "dist missing"
   ```
2. Rebuild:
   ```bash
   npm run build:rgfn
   ```
3. Re-run tests:
   ```bash
   node --test rgfn_game/test/**/*.test.js
   ```

## Typical failure signatures and meaning

- `Error [ERR_MODULE_NOT_FOUND]: ... rgfn_game/dist/...`
  - Meaning: build artifacts missing/outdated.
  - Fix: rebuild RGFN (`npm run build:rgfn`) and rerun tests.

- Assertion failure in an individual `*.test.js`
  - Meaning: behavior mismatch between test expectation and current product logic.
  - Fix: align test expectations to current production behavior or patch code intentionally (only if product behavior is truly incorrect).

## Notes for contributors

- Running repo-wide `npm test` may still fail for non-RGFN suites unless other build prerequisites are satisfied.
- For RGFN-specific validation, prefer `npm run test:rgfn`.

## Behavior contract reminder: `recordLocationEntry` return value

Current `GameQuestRuntime.recordLocationEntry(...)` behavior returns a structured object, not a bare boolean:

```js
{ changed: boolean, logs: string[] }
```

- `changed` indicates whether quest state advanced.
- `logs` contains user-facing messages generated during objective/side-quest state updates.

When writing or updating tests around location-entry quest progression (especially side-quest delivery/recover flows), assert on `result.changed` and optionally on log content instead of asserting `result === true`.

## Scenario-suite command (high signal for runtime wiring regressions)

If unit-level suites pass but integration-like behavior still looks broken, run scenario tests directly:

```bash
npm run build:rgfn && node --test rgfn_game/test/systems/scenarios/*.test.js
```

This catches contract drift in controller wiring/mocks (callbacks, world-map accessors, turn-manager helpers, UI adapter behavior).

## Common scenario test stub contracts to keep in sync

When tests use lightweight stubs instead of full game runtime objects, these methods are currently expected by production controllers:

- `BattleCommandController` turn manager:
  - `getPlayerSideParticipantCount()`
- `BattleTurnController` AI actor stubs:
  - `shouldSkipTurn()`
- `GameBattleRuntimeFlow` callbacks:
  - `onBattleEnded(result)`
- `GameFacadeLifecycleCoordinator` HUD/world-map wiring:
  - `worldMap.getSelectedCellInfo()`
  - `hudCoordinator.updateSelectedCell(info)`
- `VillageActionsController` callbacks used from NPC selection flow:
  - `onAdvanceTime(minutes, fatigueScale)`

Keeping test doubles aligned with these runtime contracts avoids false-red failures caused by outdated mock shapes.

## DOM-stub parity notes for UI-heavy tests

For DOM-lite test objects, mimic browser behavior for `innerHTML` writes (clear existing children/options) before repopulating UI collections. Without this, list/select assertions can accumulate stale entries across re-renders and fail even when runtime logic is correct.
