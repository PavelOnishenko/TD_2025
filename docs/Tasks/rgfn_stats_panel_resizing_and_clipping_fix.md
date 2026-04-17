# RGFN HUD Panel Resizing + Overflow Clipping Fix (2026-04-11)

## Problem report
- Stats panel content could render past the panel border when formulas or long stat rows pushed beyond available height.
- Stats panel had lost desktop resize behavior.

## What changed
- Updated `rgfn_game/style.css` so all draggable HUD panels use:
  - desktop resizing (`resize: both`),
  - viewport-bound dimensions (`max-height/max-width` guards),
  - clipped/scrollable content (`overflow: auto`) so text does not bleed outside borders.
- Included stats, skills, inventory, magic, quests, group, lore, selected, world map, battle, village, and log-related draggable panels in the shared rule set.
- Kept responsive behavior: on narrow/mobile viewports, panel resizing is disabled (`resize: none`) and fixed mobile heights remain enforced.

## Regression tests
- Added `rgfn_game/test/systems/scenarios/panelStyles.test.js` to assert CSS keeps:
  - desktop panel clipping + resizing,
  - mobile resize disablement.

## Notes for future UI work
- Prefer a single shared panel sizing/overflow rule for draggable HUD windows to avoid panel-specific drift.
- If adding a new draggable panel id, include it in both:
  1) desktop shared panel selector,
  2) mobile `@media (max-width: 920px)` selector.
