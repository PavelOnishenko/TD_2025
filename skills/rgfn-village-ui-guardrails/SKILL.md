# RGFN Village UI Guardrails

## Purpose
Use this skill when touching RGFN village HUD, panel persistence, or village mode transitions to prevent soft-lock regressions where village controls become unreachable.

## Trigger examples
- "Village actions panel disappeared"
- "Cannot leave village"
- "Village rumors not visible"
- Any change involving:
  - `GameUiHudPanelController`
  - `VillageActionsController`
  - `GameVillageCoordinator`
  - `WorldModeController`
  - `index.html` village panel layout/CSS

## Mandatory invariants
1. In **Village** mode, `#village-actions` and `#village-rumors-section` must be visible.
2. In **World** and **Battle** modes, both must be hidden.
3. Persisted layout restore must not place either panel fully off-screen.
4. Leaving village must always remain possible from visible UI controls.

## Implementation checklist
1. Verify mode transitions explicitly hide/show both village panels.
2. Verify HUD persistence does not keep village panels hidden in Village mode.
3. Clamp or nudge panel offsets on restore and/or drag.
4. Ensure no decorative shell panel is mistaken for actionable village UI.

## Test checklist (minimum)
- HUD controller test for off-screen restore correction.
- HUD controller test forcing village panel visibility while mode indicator is `Village`.
- Village actions controller test for entry/exit visibility toggling.
- Build and run focused scenario tests before full suite.

## Suggested commands
- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/scenarios/gameUiHudPanelController.test.js`
- `node --test rgfn_game/test/systems/scenarios/villageActionsController.test.js`
- `npm run test:rgfn`

## Documentation expectation
Record root cause + prevention notes in a dedicated markdown file under `rgfn_game/docs/village/` when a regression is fixed.
