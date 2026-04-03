# Village NPC Dialogue Modal Integration

## Goal

Move NPC conversations into a dedicated popup dialogue window (classic RPG style), while still reusing the same runtime dialogue log stream used in other game systems.

## What was changed

- Added a new modal window in `rgfn_game/index.html`:
  - `#village-dialogue-modal`
  - `#village-dialogue-log`
  - `#village-dialogue-selected-npc`
  - `#village-dialogue-close-btn`
- Kept NPC list selection in the village rumors block, but moved talk actions into the modal.
- Added `Open NPC dialogue window` button in village rumors section.
- Integrated existing conversation controls into modal:
  - ask about location
  - ask about person
  - ask about barter
  - confirm barter
- Replaced free-text location/person fields with dropdowns:
  - `#village-ask-settlement-input` (`<select>`)
  - `#village-ask-person-input` (`<select>`)
  - This removes manual typing for repeated direction queries.

## Runtime behavior

- Player selects NPC from village rumors list.
- Player opens dialogue popup.
- The popup displays:
  1. selected NPC summary,
  2. dialogue log,
  3. response/action buttons.
- All newly generated dialogue lines are duplicated into:
  - global game log (`#game-log`), and
  - village dialogue modal log (`#village-dialogue-log`).
- Settlement dropdown is auto-filled from:
  - discovered villages from world map fog state,
  - named quest locations registered into world map metadata,
  - source/destination villages inferred from active barter/escort quest contracts.
- Person dropdown is auto-filled from:
  - active barter trader names,
  - active escort objective person names,
  - NPCs already seen in village rumor rosters.

This keeps one shared source of dialogue events while showing NPC conversation in a focused modal.

## Controller-level details

`VillageActionsController` now:

- exposes `openDialogueWindow()` / `closeDialogueWindow()`;
- closes dialogue popup automatically when entering/leaving village;
- updates modal NPC caption in `updateNpcPanel()`;
- disables dialogue controls unless an NPC is selected;
- mirrors each `addLog(...)` line to both log containers.

## UI wiring

`GameUiFactory` and `GameUiTypes` were extended with modal fields for village UI.

`GameUiEventBinder` now binds:

- open dialogue button,
- close dialogue button,
- backdrop click-to-close for dialogue modal.

## Test coverage added

A new test validates:

- modal opens/closes via controller,
- dialogue line mirroring to both logs works.

File: `rgfn_game/test/systems/villageActionsController.test.js`.

## Known pitfall fixed (March 28, 2026)

- Symptom: after selecting an NPC from rumors list, `Open NPC dialogue window` stayed disabled.
- Root cause: `handleSelectNpc(...)` refreshed labels and NPC buttons but did not recalculate button enabled/disabled state.
- Fix: call `updateButtons()` inside `handleSelectNpc(...)` right after selecting NPC and rerendering.
- Regression guard: test now checks the button is disabled before selection and enabled immediately after selection.

## Notes for future extension

- If needed, next step is to render only NPC conversation lines in modal (filter by tags), while keeping full system log in main log panel.
- Optional follow-up: keyboard shortcut (e.g. `T` or `Enter`) to open dialogue modal when NPC selected.
