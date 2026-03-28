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
- Village sidebar heading now includes current settlement name via `#village-title` (format: `Village: <name>`), so players always see which village they are interacting with.
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
- Village title binding follows the same pattern:
  1. Add ID in DOM (`#village-title`),
  2. expose it in `VillageUI`,
  3. bind in `GameUiFactory`,
  4. update text in village runtime controller (`VillageActionsController.enterVillage`).

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

## Skills panel dev shortcut: GOD +20 ALL (March 2026)

- A temporary dev-only button now exists in the Skills panel: `#god-skills-btn` (`GOD +20 ALL`).
- Behavior when clicked:
  - Adds **+20** to each player skill (`vitality`, `toughness`, `strength`, `agility`, `connection`, `intelligence`).
  - Clears pending skill allocations so the panel does not show stale unsaved deltas.
  - Adds a battle/system log line: `[DEV] GOD boost applied: +20 to all skills.`
  - Triggers an immediate save call from `Game.bindUi(...)` so localStorage reflects the boosted stats right away.
- Implementation path:
  1. DOM button in `index.html`,
  2. wired in `GameUiTypes` + `GameUiFactory`,
  3. click handler in `GameUiEventBinder`,
  4. stat application in `GameHudCoordinator.handleGodSkillsBoost`,
  5. immediate save via `Game.saveGameIfChanged()`.

## Draggable HUD windows with close button (March 28, 2026)

Hamburger-opened HUD panels are now interactive floating windows:

- A compact header is injected at runtime for each panel:
  - `Stats`, `Skills`, `Inventory`, `Magic`, `Quests`, `Lore`, `Selected`, `World Map`, `Log`.
- Header contains:
  - a **drag handle** (panel title area),
  - a **close button** (`✕`) that closes only that panel.
- Dragging details:
  - Drag uses pointer events on `.panel-drag-handle`.
  - Panel offset is stored in `data-offset-x` / `data-offset-y`.
  - Visual position is applied via CSS transform variables:
    - `--panel-offset-x`
    - `--panel-offset-y`
  - Last interacted panel gets higher `z-index` so overlap feels natural.
- Mobile behavior:
  - On narrow layout (`max-width: 920px`), transforms are disabled (`transform: none`) so stacked mobile flow remains stable and readable.

### Implementation map

1. `GameUiEventBinder.initializeHudPanelWindows()` prepares panel metadata.
2. `decorateHudPanelWindow(...)` prepends header + close button to panel DOM.
3. `bindPanelDragEvents(...)` handles drag lifecycle (`pointerdown` → `pointermove` → `pointerup/cancel`).
4. Existing `onTogglePanel(...)` callback is reused to preserve active-button state logic in `HudController`.

### Manual QA for draggable windows

1. Open hamburger menu and toggle `Stats`.
2. Grab `Stats` header and drag panel:
   - panel should move,
   - cursor should switch grab → grabbing while dragging.
3. Click `✕` in panel header:
   - panel hides,
   - corresponding hamburger button deactivates.
4. Open 2-3 panels (e.g. `World Map`, `Log`, `Inventory`) and drag them:
   - panels can overlap,
   - last dragged panel should appear above previous ones.
5. Resize viewport below `920px`:
   - panels return to normal stacked flow (no shifted transforms),
   - close button still works.

## HUD panel height/scroll policy update (March 28, 2026, follow-up)

To match the new draggable-window workflow, **HUD content panels no longer auto-clamp their height** and no longer force internal panel scrollbars:

- `Stats`, `Skills`, `Inventory`, `Magic`, `Quests`, `Lore`, `Selected`:
  - keep fixed panel width styling,
  - no `max-height` viewport clamp,
  - no forced `overflow: auto` scrollbar behavior.
- If several open panels overlap, the intended flow is:
  1. drag panels to reposition, or
  2. close unneeded ones from hamburger menu / panel `✕`.

This keeps panel size/content natural and avoids the old "single-column fallback" scrollbar tuning that is no longer needed for desktop draggable windows.

### Important exception

`World Map` sidebar and `Log` keep scroll constraints by design because they can contain intentionally long content and controls with high update frequency.

### Quick regression checklist for this follow-up

1. Open `Stats`, `Inventory`, `Magic` together on desktop:
   - no panel-internal scrollbar should appear unless content itself defines one for a nested element.
2. Verify panel height does not auto-shrink to viewport clamp when opening multiple panels.
3. Drag overlapping panels and confirm usability still comes from dragging/closing (not from panel auto-scroll resizing).
4. Confirm `Log` panel still scrolls as messages accumulate.

## Default spawn placement for draggable HUD windows (March 28, 2026, follow-up #2)

Problem addressed:

- Panels were opening at legacy stack-based coordinates (including right-column origins), then becoming draggable.
- This felt like they still "belonged" to the old two-column/stack flow.

New behavior:

- Each draggable HUD panel now receives a **one-time spawn offset** the first time it becomes visible.
- Spawn anchor is intentionally near the **left edge** of the viewport.
- Panels are vertically staggered with a small Y step, so opening several panels does not place every window at the exact same Y coordinate.

Implementation details:

1. `GameUiEventBinder` defines spawn constants:
   - `panelSpawnOrigin = { x: 24, y: 96 }`
   - `panelSpawnStepY = 34`
2. During panel decoration, binder attaches `bindPanelSpawnPositioning(panel, panelIndex)`.
3. A `MutationObserver` watches panel class changes (`hidden` ↔ visible).
4. On first visible state, binder computes offset from current DOM position to spawn target and writes:
   - `data-offset-x`, `data-offset-y`
   - CSS vars `--panel-offset-x`, `--panel-offset-y`
5. After first placement, `data-spawn-positioned=true` prevents re-applying spawn (player drag position is preserved for later open/close toggles in the same session).

Why this is better:

- Opened panels now feel consistent and predictable: they always appear near the left gameplay edge first.
- The player still retains full manual control via drag.
- Existing draggable implementation (transform via CSS variables) is reused; no separate absolute-positioning mode was introduced.

### Regression checklist for spawn behavior

1. Open `Inventory` from hamburger:
   - panel appears near left edge, not at right stack origin.
2. Open `Stats`, `Magic`, `Skills`:
   - each opens near left edge with visible Y staggering.
3. Drag `Magic` to a custom location, close it, reopen it:
   - it should keep the moved position (spawn offset should not be re-applied).
4. Verify close button and drag interactions still work exactly as before.

## Resizable Log window (March 28, 2026, follow-up #3)

The `Log` panel (`#game-log-container`) now supports manual resize on desktop:

- Uses native CSS resizing (`resize: both`) so players can widen/tall the log while playing.
- Enforces a minimum inline size (`260px`) to prevent collapsing into unreadable widths.
- Keeps log internals stable by setting panel overflow to `hidden` while the inner `#game-log` element continues to own scroll behavior.
- On narrow/mobile layout (`max-width: 920px`), resizing is intentionally disabled (`resize: none`) so the stacked single-column flow remains predictable.

### Why this change helps

- The log is one of the highest-frequency information streams during world traversal, village actions, and battles.
- Fixed-size height was often too small when tracking long combat sequences or dialogue-heavy village interactions.
- Draggable windows + resizable log together improve readability without forcing global font/layout changes.

### Quick QA checklist

1. Open HUD menu → `Log`.
2. Drag the lower-right resize affordance of the log window:
   - width should increase/decrease;
   - height should increase/decrease.
3. Add several new log entries (combat, movement, village actions):
   - inner log should still auto-scroll to newest entries.
4. Reduce viewport below `920px`:
   - resize affordance should be disabled;
   - log should follow normal mobile stacked flow.
