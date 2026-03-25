# RGFN HUD Panels Reference

## March 2026 HUD architecture (fullscreen map + hamburger menu)

The main view is now treated as true fullscreen gameplay space:

- The world/battle canvas (`#main-view-stage` + `#game-canvas`) fills the entire browser viewport area.
- The old full-width top HUD strip is removed from layout flow.
- A persistent **hamburger button** (`#hud-menu-toggle-btn`) is anchored at top-left over gameplay.
- Clicking the hamburger opens a left-side menu panel (`#hud-menu-panel`) with:
  - Brand + mode indicator.
  - Vertical list of all panel toggle buttons.
  - Utility actions (HP potion, mana potion, new character).
- Selecting any panel button closes the menu so the map is quickly visible again.

This satisfies the intended UX: the map always dominates the screen, and UI panels are summoned only when asked.

## Buttons and panel mapping

- `World Map` button → toggles `#world-sidebar` panel.
- `Log` button → toggles `#game-log-container` panel.

All panel buttons use the existing active-button behavior (`.action-btn.active`) so players can see which panel is currently visible.

## Developer notes

- Centralized panel toggling still flows through:
  - `GameUiEventBinder` (`onTogglePanel`)
  - `GameHudCoordinator.togglePanel(...)`
  - `HudController.togglePanel(...)`
- Menu open/close behavior is handled in `GameUiEventBinder`:
  - `bindHudMenuEvents()` toggles menu visibility from hamburger click.
  - `handlePanelToggle(...)` now routes panel toggles and auto-collapses the menu.
  - `setHudMenuOpen(...)` updates both visibility and `aria-expanded` for accessibility.
- This keeps panel behavior consistent and avoids one-off UI state code.

## Why this structure is useful

- The map is always the visual priority (supports exploration + combat readability).
- All informational panels share one interaction model.
- It reduces permanent HUD clutter while preserving fast access.
- Future panels can be added by extending:
  1. `index.html` button + panel DOM
  2. `GameUiTypes` + `GameUiFactory`
  3. `GameUiEventBinder` + `HudController` panel maps

## CSS notes that are easy to forget

- `#hud` uses `pointer-events: none`; interactive children (`.hud-menu-toggle`, `.hud-menu-panel`) re-enable pointer events.
- `#hud` has a high z-index so the hamburger is always clickable above map overlays.
- `#game-container` and `#main-view-stage` intentionally have no border/padding/radius in fullscreen mode.

If the menu ever appears but is not clickable, check pointer-event inheritance first.

## Suggested manual QA checklist

1. Start RGFN and verify the map view fills the window and hamburger is visible at top-left.
2. Click hamburger:
   - Vertical panel-button list appears along the left edge.
   - Utility action buttons are visible below panel toggles.
3. Click `World Map` and `Log`:
   - Their overlays toggle as expected.
   - Corresponding buttons receive active state.
   - Menu closes after each selection.
4. Re-open menu and click other panels (`Stats`, `Skills`, `Inventory`, etc.):
   - Correct panel opens in overlay stack.
   - Active states remain accurate.
5. Enter battle/village and return to world:
   - Hamburger remains accessible.
   - Previously opened panels preserve expected state behavior.

## Inventory drop recovery addendum

- Inventory now has a dedicated `Recover Last Dropped Item` button (`#undo-last-drop-btn`).
- Right-click drop is no longer strictly final: only the most recently dropped item is recoverable.
- Recovery uses normal inventory insertion rules, so it fails when inventory is full.
- The recover button remains disabled whenever there is no pending dropped item to restore.
