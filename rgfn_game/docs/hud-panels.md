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
- Inside the `World Map` panel:
  - `Use HP Potion` uses a potion without leaving the panel.
  - `Enter Village (Space)` re-enters a village if the hero is currently standing on a village tile.
  - `Center on Character` recenters the map viewport on the hero.

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
- Village mode now uses a **split actions layout**:
  - Main action stack (`Wait`, stock, sell, leave) remains in the right village sidebar.
  - `Village rumors` is rendered as a floating block that is horizontally offset into the center gameplay space (`.village-floating-rumors`).
  - On narrow screens (`max-width: 920px`) the rumors block automatically falls back to normal in-flow layout to avoid overlap.
- `#village-actions` must stay `position: relative` + `overflow: visible`; removing either clips or detaches the floating rumors block.

If the menu ever appears but is not clickable, check pointer-event inheritance first.

## Battle readability note: player avatar marker (March 2026)

To improve battle readability, the player now renders as a full mini-avatar (shadow + body + head + shoulders) instead of only relying on the highlighted battle cell.

- Rendering lives in `js/entities/PlayerRenderer.ts`.
- The avatar is intentionally simple vector art so it scales with battle cell size and does not need sprite assets.
- The HP bar remains above the avatar and still uses existing theme colors/thresholds.

### Why this matters

- The active-turn cell highlight can shift between combatants, so the player can otherwise feel "missing" at a glance.
- A persistent avatar significantly improves target acquisition in crowded battles and obstacle-heavy terrain.
- This makes player/enemy visual language more consistent (enemies already render with visible sprites).

## Suggested manual QA checklist

1. Start RGFN and verify the map view fills the window and hamburger is visible at top-left.

2. Click hamburger:
   - Vertical panel-button list appears along the left edge.
   - Utility action buttons are visible below panel toggles.

3. Click `World Map`:
   - Panel opens on the left.
   - Button gets active state.
   - Menu closes after selection.

4. Click `Log`:
   - Log opens on the left.
   - New log entries still append and auto-scroll.
   - Menu closes after selection.

5. Re-open menu and click other panels (`Stats`, `Skills`, `Inventory`, etc.):
   - Correct panel opens in overlay stack.
   - Active states remain accurate.

6. Enter battle/village and return to world:
   - Hamburger remains accessible.
   - Panels preserve expected state behavior.
   - World panel should remain closed unless reopened explicitly.

7. Village interaction checks:
   - Stand on a village tile, leave the village, then re-enter:
     - Press `Space` on the world map → village entry prompt opens.
     - Click `Enter Village (Space)` in the world panel → same behavior.
   - Move to a non-village tile and test `Space` / `Enter Village (Space)`:
     - Game stays in world mode.
     - A guidance log line is shown instead.
   - In village mode on desktop width:
     - `Village rumors` appears left of the right sidebar (closer to map center), not below stock/sell.
     - Right sidebar still keeps `Village Actions` content on the right edge.
   - On narrow viewports/mobile width:
     - `Village rumors` returns beneath the rest of village actions (single-column fallback).

## Inventory drop recovery addendum

- Inventory now has a dedicated `Recover Last Dropped Item` button (`#undo-last-drop-btn`).
- Right-click drop is no longer strictly final: only the most recently dropped item is recoverable.
- Recovery uses normal inventory insertion rules, so it fails when inventory is full.
- The recover button remains disabled whenever there is no pending dropped item to restore.
