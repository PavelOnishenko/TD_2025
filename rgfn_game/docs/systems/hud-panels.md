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
- Village scene canvas title (`VillageName` text rendered directly on the map) is horizontally centered at the top (`x = canvas.width / 2`, `y = 20`) to avoid overlap with the top-left hamburger menu.
- Inside the `World Map` panel:
  - `Use HP Potion` uses a potion without leaving the panel.
  - `Enter Village (Space)` re-enters a village if the hero is currently standing on a village tile.
  - `Center on Character` recenters the map viewport on the hero.
  - Legacy world-map zoom/pan button cluster was removed from the UI (`#world-map-controls`), so map interaction now happens directly on canvas + keyboard.

All panel buttons use the existing active-button behavior (`.action-btn.active`) so players can see which panel is currently visible.

## World map mouse + keyboard camera controls (March 28, 2026)

- Zoom:
  - Mouse wheel over game canvas (world-map mode).
  - Fallback: `Ctrl + +` / `Ctrl + -` (including numpad `+` / `-`).
- Pan:
  - Hold middle mouse button and drag map.
  - Fallback keys: `I/J/K/L` and numpad `8/4/2/6`.

Implementation summary:

- Wheel is handled on canvas with `passive: false`; browser zoom default is prevented while world-map mode is active.
- Ctrl zoom hotkeys are intercepted on `keydown` and routed to map zoom callbacks.
- Middle-button drag captures pointer deltas and calls pixel-based panning (`WorldMap.panByPixels`).

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
     - Step onto a village tile on world map → village entry popup opens automatically near the tile.
     - Press `Space` on the world map or click `Enter Village` in world panel while still on tile → same popup can be reopened manually.
     - Click popup `Enter` → village mode opens directly into village actions (no additional Enter/Continue prompt inside village sidebar).
     - Click popup `Pass by` → popup closes and world movement continues.
   - Move to a non-village tile and test `Space` / `Enter Village (Space)`:
     - Game stays in world mode.
     - A guidance log line is shown instead.
   - In village mode on desktop width:
     - `Village rumors` appears left of the right sidebar (closer to map center), not below stock/sell.
     - Right sidebar still keeps `Village Actions` content on the right edge.
     - Village name at the top of the scene is centered and no longer clipped by the hamburger button in the top-left corner.
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

## Quests panel resize cap fix (March 29, 2026)

Issue observed in RGFN desktop HUD:

- When many draggable windows were opened, the **Quests** window could stop growing vertically during manual corner-resize.
- UX felt like an artificial hard limit, even though players expected free-form resize while arranging overlapping panels.

What was changed:

- Removed viewport clamp on `#quests-panel`:
  - `max-height: calc(100dvh - 32px)` → `max-height: none`
  - `max-block-size: calc(100dvh - 32px)` → `max-block-size: none`
- Kept safety constraints that still matter:
  - `min-height: 220px`
  - `min-width: 260px`
  - `resize: both`

Practical result:

- Quests window now continues stretching vertically beyond old viewport-capped maximum.
- Large quest trees remain easier to inspect when several HUD windows are open and stacked.

Quick manual QA:

1. Open 3-5 HUD windows (`Stats`, `Inventory`, `Log`, `Quests`, etc.).
2. Drag `Quests` panel to a non-top position.
3. Grab bottom-right resize handle and increase height repeatedly.
4. Confirm panel keeps expanding instead of stopping near the previous `100dvh - 32px` limit.

## Quests panel parity fix: remove stack-coupling side effects (March 29, 2026, follow-up)

Additional user-reported behavior after the first resize-cap patch:

- If `Quests` was open and another panel was toggled on, `Quests` could appear to "disappear".
- After closing the other panel, `Quests` reappeared in the same place.
- Vertical stretching still felt constrained in multi-window setups.

Root cause (layout coupling):

- Draggable HUD windows were still using `position: absolute` inside overlay stack containers.
- That made window geometry indirectly dependent on parent stack layout and containing-block sizing.
- In practice this can produce overlap/hide illusions and resize limits tied to container bounds, especially when many panels are simultaneously visible.

Fix applied:

- Switched `.draggable-panel` to `position: fixed` (desktop flow).
- Kept existing transform-based drag model and per-panel offsets (`--panel-offset-x`, `--panel-offset-y`), so drag UX remains unchanged.
- Kept mobile fallback (`max-width: 920px`) where panels return to normal static flow for readability.

Why this improves parity:

- `Quests` now follows the exact same floating-window mechanics as other draggable panels without parent-stack geometry side effects.
- Opening/closing sibling panels no longer reinterprets `Quests` positioning through stack layout.
- Manual resize behavior is now constrained by viewport mechanics only, not by overlay-stack container box calculations.

Focused manual QA:

1. Open `Quests`, drag it somewhere non-default.
2. Open `Stats` and `Inventory` while `Quests` stays open:
   - `Quests` should remain visible (unless intentionally covered by z-order overlap).
3. Close `Stats` / `Inventory`:
   - `Quests` should stay at its dragged position.
4. Resize `Quests` vertically with 2-4 other panels open:
   - resizing should continue smoothly and no longer "hard-stop" from stack coupling.

### Quests hardening fallback (March 30, 2026)

Follow-up from additional QA reports showed `Quests` could still behave differently in some sessions (unexpected downward jump + renewed vertical squeeze) while `Log` remained stable.

To harden against any runtime class-decoration mismatch, `#quests-panel` now also explicitly carries the floating-window geometry contract at ID level:

- `position: fixed`
- `top: 0`
- `left: 0`
- `transform: translate(var(--panel-offset-x), var(--panel-offset-y))`

This keeps Quests anchored to the same coordinate model as other draggable windows even if `.draggable-panel` class decoration is not applied as expected in edge flows.

Practical intent:

- Prevent re-coupling of Quests to overlay stack layout.
- Keep resize behavior stable when opening additional panels (`Stats`, `Skills`, etc.).

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

## World Map panel decoupled from sibling auto-resize/scroll behavior while staying draggable (March 28, 2026, follow-up #3)

### User-visible issue

When other draggable HUD panels were opened, the **World Map** panel could become vertically compressed and start showing an internal scrollbar (including the browser-specific scrollbar chrome near the panel header). This made it look like the old panel auto-resize mechanism was still active for this specific panel.

### Root cause

Two systems were interacting in a bad way:

1. World Map panel intentionally uses the same draggable window decorator as other HUD panels (header + close button + drag handle). This behavior is desired and should remain enabled.
2. CSS base for sidebar/log panel pair (`#world-sidebar, #game-log-container`) applied shared `max-height` + `overflow:auto`, so when overlay stack space became constrained by other open panels, `#world-sidebar` could shrink and force a scrollbar.

### Fix implemented

- `worldMap` remains a normal draggable HUD window with runtime header injection and close button.
- `#world-sidebar` now opts out of shared sidebar clamping:
  - `flex-shrink: 0;`
  - `max-height: none;`
  - `overflow: visible;`

### Resulting behavior contract

- Opening/closing other HUD panels should no longer resize the World Map panel.
- World Map panel should not auto-add an internal scrollbar due to sibling panel visibility.
- World Map controls stay stable and independent of concurrent panel count.
- World Map panel keeps the same draggable behavior and `✕` close interaction as other HUD windows.

### Focused manual regression checklist

1. Open `World Map` panel only → verify full intended panel height with no forced internal scrollbar.
2. Open `Stats`, `Skills`, `Inventory`, `Log` while keeping `World Map` open.
3. Confirm World Map panel dimensions remain stable while other windows are toggled.
4. Confirm `World Map` still closes/reopens correctly from hamburger toggle button.
5. Confirm World Map remains draggable (header drag handle) and closable via `✕`, and that other panels (`Stats`, `Skills`, `Inventory`, `Log`) still behave the same.

## Draggable panel parity fix: remove flow-coupling drift (March 28, 2026, follow-up #4)

### Symptom observed after follow-up #3

- World Map could still "disappear" when another panel was opened from hamburger menu.
- Toggling the second panel back off made World Map appear again near its previous location.
- This made World Map feel different from other panels even though it had drag/close controls.

### Technical root cause

- `.draggable-panel` used `position: relative` with transform offsets.
- Relative-positioned elements **still occupy normal flex layout space** in `#left-overlay-stack` / `#right-overlay-stack`.
- When another panel was shown/hidden, stack layout reflow shifted each panel’s base box.
- Because drag/spawn uses transform deltas from that base, visual position could jump off-screen without losing stored offset.

### Final fix

- Switched `.draggable-panel` to out-of-flow positioning:
  - `position: absolute; top: 0; left: 0;`
  - kept transform-offset model unchanged (`--panel-offset-x/y`).
- On mobile fallback (`max-width: 920px`), explicitly reset draggable panels to in-flow:
  - `position: static; transform: none;`

### Why this resolves parity issues

- Open/close of any panel no longer changes another panel’s layout origin.
- World Map now uses the exact same drag/close + spawn mechanics as other panels without reflow side effects.
- Existing drag persistence/session offset behavior remains intact.

### Regression checklist (important)

1. Open `World Map` only; drag to custom location.
2. Open `Stats`, `Skills`, `Inventory`, `Log` one-by-one:
   - World Map should stay where dragged.
   - no vanish/jump when siblings are toggled.
3. Close each sibling panel:
   - World Map should not snap/reappear from hidden offset.
4. Confirm `✕` closes World Map and hamburger toggle reopens it at the same session position.
5. Resize below `920px`:
   - stacked layout returns,
   - no absolute overlap issues on mobile flow.

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
- Allows near-fullscreen expansion on desktop by setting explicit viewport caps:
  - `max-width: calc(100vw - 32px)`
  - `max-height: calc(100dvh - 32px)`
- Keeps log internals stable by setting panel overflow to `hidden` while the inner `#game-log` element continues to own scroll behavior.
- Removes legacy desktop-size clamp behavior (old `max-height` caps) that previously prevented growing the panel to large sizes.
- On narrow/mobile layout (`max-width: 920px`), resizing is intentionally disabled (`resize: none`) so the stacked single-column flow remains predictable.

### Why this change helps

- The log is one of the highest-frequency information streams during world traversal, village actions, and battles.
- Fixed-size height was often too small when tracking long combat sequences or dialogue-heavy village interactions.
- Draggable windows + resizable log together improve readability without forcing global font/layout changes.


### Implementation gotchas (helpful for future UI work)

- The log panel previously shared a grouped selector with `#world-sidebar`, which imposed a stricter `max-height` clamp suitable for static sidebars but too restrictive for freeform resize UX.
- Splitting those selectors is important: `#world-sidebar` keeps conservative height limits, while `#game-log-container` gets viewport-scale caps and resize affordance.
- In flex containers, `align-self: flex-start` helps resized windows avoid unintended stretch behavior from parent alignment rules.

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

## Resizable Quest window (March 28, 2026, follow-up #4)

The `Quests` panel (`#quests-panel`) now mirrors the desktop resize behavior of the `Log` panel:

- Enables native panel resizing with `resize: both`.
- Uses the same desktop safety bounds as log:
  - `min-width: 260px`, `min-height: 220px`
  - `max-width: calc(100vw - 32px)`, `max-height: calc(100dvh - 32px)`
- Keeps panel geometry stable with `overflow: hidden` + `align-self: flex-start` so the window expands from its own corner instead of stretching with parent layout rules.
- Moves scrolling responsibility fully into `.quests-body` (`flex: 1`, `min-height: 0`, `overflow: auto`) so objective lists stay scrollable at any panel size.
- On narrow/mobile layout (`max-width: 920px`), quest resizing is disabled (`resize: none`) just like log to preserve predictable stacked HUD flow.

### Why this helps

- Quest chains can become long; fixed-height panel states force extra scroll churn during active objective tracking.
- Matching log + quests resize behavior gives players consistent window ergonomics across the two most text-heavy HUD panels.
- The shared constraints reduce future maintenance risk (same viewport/min-size rules for both high-traffic windows).

### Quick QA checklist

1. Open HUD menu → `Quests`.
2. Drag bottom-right resize affordance:
   - panel width/height should change freely on desktop.
3. Fill/expand quest tree (multiple quest nodes):
   - inner quest list should scroll inside panel instead of overflowing viewport.
4. Drag/move panel after resizing:
   - drag behavior should remain unchanged.
5. Reduce viewport below `920px`:
   - resize affordance should disappear for quests (and still for log).

## Stats panel resize + draggable action micro-panels (April 8, 2026)

### What changed

- `Stats` HUD window (`#stats-panel`) is now desktop-resizable via native CSS corner resize (`resize: both`).
- Three high-frequency action clusters are now individually draggable on desktop:
  - `Village Actions` (`#village-actions`)
  - `Combat Actions` (`#battle-actions`)
  - `Village Rumors` (`#village-rumors-section`)
- These clusters receive lightweight runtime window headers with a drag handle title and use the same pointer-drag model as HUD floating windows (CSS transform offsets driven by JS updates).

### Implementation notes

- Runtime hookup lives in `GameUiActionPanelController` (bound from `GameUiEventBinder`):
  - `decorate()` finds target elements by ID and decorates each once.
  - `createHeader()` prepends a drag-handle-only header (`.panel-window-header.panel-window-header-aux`).
  - `applySeed()` computes first visible placement and stores offsets in `data-offset-x/y`.
- Drag updates use:
  - `--panel-offset-x`
  - `--panel-offset-y`
  - plus temporary `.panel-dragging` for cursor feedback.
- CSS class `.aux-draggable-panel` provides out-of-flow desktop behavior (`position: fixed; top: 0; left: 0; transform: translate(...)`) while preserving pointer interactivity.
- Mobile fallback (`max-width: 920px`) explicitly resets `.aux-draggable-panel` to in-flow static positioning and disables `Stats` resizing (`resize: none`) to avoid stacked-layout overlap.

### Why this is useful

- `Stats` can now be expanded when inspecting long derived formulas and stat blocks without forcing global zoom/font changes.
- Action-heavy play loops (battle turns, village shopping/dialogue loops) can be spatially arranged by the player to reduce panel travel and visual occlusion over the map.
- Rumor handling can be detached from village sell/buy controls, which improves readability during dialogue-heavy quest routing.

### QA checklist

1. Open HUD `Stats` panel and verify desktop corner resize works in both axes.
2. Enter village mode and drag `Village Actions` panel by its new header.
3. Drag `Village Rumors` panel independently and confirm interaction buttons/selects still work after moving.
4. Enter battle and drag `Combat Actions`; verify battle buttons remain clickable.
5. Switch viewport below `920px`:
   - action panels should return to normal in-flow stacked layout;
   - `Stats` should no longer be resizable.
