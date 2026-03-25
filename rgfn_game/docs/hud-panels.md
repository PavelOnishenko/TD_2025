# RGFN HUD Panels Reference

## What changed

The **World Map** utility card and **Log** panel now behave like regular HUD panels (same UX as Stats/Skills/Inventory):

- They are toggled from the top HUD menu buttons.
- They open in the **left overlay stack** with the other panel windows.
- They are no longer always visible in the right/bottom overlay area.
- Entering world mode now keeps the World Map panel closed by default, so it only opens when the player asks for it.

## Buttons and panel mapping

- `World Map` button → toggles `#world-sidebar` panel.
- `Log` button → toggles `#game-log-container` panel.

Both buttons use the existing active-button behavior (`.action-btn.active`) so players can see which panel is currently visible.

## Developer notes

- Centralized panel toggling still flows through:
  - `GameUiEventBinder` (`onTogglePanel`)
  - `GameHudCoordinator.togglePanel(...)`
  - `HudController.togglePanel(...)`
- New panel keys introduced in toggle unions:
  - `worldMap`
  - `log`
- This keeps panel behavior consistent and avoids one-off UI state code.

## Why this structure is useful

- All informational panels now share one interaction model.
- It reduces permanent HUD clutter while preserving fast access.
- Future panels can be added by extending:
  1. `index.html` button + panel DOM
  2. `GameUiTypes` + `GameUiFactory`
  3. `GameUiEventBinder` + `HudController` panel maps

## Suggested manual QA checklist

1. Start RGFN and verify World Map and Log are hidden by default.
2. Click `World Map`:
   - Panel opens on the left.
   - Button gets active state.
3. Click `Log`:
   - Log opens on the left.
   - New log entries still append and auto-scroll.
4. Enter battle/village and return to world:
   - World panel should remain closed unless reopened by button.
   - Log toggle continues to work.

## Inventory drop recovery addendum

- Inventory now has a dedicated `Recover Last Dropped Item` button (`#undo-last-drop-btn`).
- Right-click drop is no longer strictly final: only the most recently dropped item is recoverable.
- Recovery uses normal inventory insertion rules, so it fails when inventory is full.
- The recover button remains disabled whenever there is no pending dropped item to restore.
