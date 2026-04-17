# GameUiFactory Rule 3 refactor (2026-03-30)

## Request context
- Target file: `rgfn_game/js/systems/game/GameUiFactory.ts`.
- Requested style rule: Rule 3 from `docs/Style_Guide.txt` (`Files not longer than 200 lines`).
- Additional user request: extract into new classes and keep both original and new files below 200 LOC.

## What was changed
- `GameUiFactory` now delegates HUD element construction to `GameHudElementsFactory`.
- `GameUiFactory` now delegates developer UI construction to `GameDeveloperUiFactory`.
- The auto-scrolling game log setup and battle/world/village builders remain in `GameUiFactory` to keep behavior intact.

## Resulting LOC snapshot
- `rgfn_game/js/systems/game/GameUiFactory.ts`: 120 lines.
- `rgfn_game/js/systems/game/runtime/GameHudElementsFactory.ts`: 109 lines.
- `rgfn_game/js/systems/game/runtime/GameDeveloperUiFactory.ts`: 47 lines.

## Verification commands and outcomes
- `npm run build:rgfn` ✅ passed.
- `npm run style-guide:audit:rgfn` ✅ passed as informational audit; confirms no Rule 3 violation for updated files.
- `npm test` ⚠️ fails due to existing repository-wide failures unrelated to this refactor (missing `dist` modules in multiple test files and pre-existing gameplay assertion failures in root test suite).

## Notes that may help future refactors
- Keeping large DOM binding objects in dedicated factories is low-risk and preserves wiring behavior.
- `runtime/` currently has enough room for additional focused UI factories without introducing new root-level system files.
- The style audit is already configured and useful for choosing the next Rule 3 targets (`GameUiEventBinder.ts`, `GameBattleCoordinator.ts`, etc.).
