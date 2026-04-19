# Village persistence hardening (NPC roster + market stock)

## Problem

A full browser refresh (`F5`) rebuilt village runtime state from scratch.
That caused:
- developer NPC roster panel to become empty,
- village NPC identities/roles/look to regenerate,
- market assortment to reroll.

For RGFN, this broke the expectation that discovered villages remain stable between launches until **New Character** is used.

## What was changed

1. **Village runtime persistence payload was introduced** and added to save snapshots.
   - Saved under `GameSaveState.village`.
   - Includes:
     - `npcPassportRoster` (full passport entries + life status),
     - `villageStockByName` (per-village offer assortment).
2. **Village NPC roster can now serialize/restore safely** via `VillageNpcRoster.getState()` and `VillageNpcRoster.restoreState(...)`.
3. **Village stock is now cached by village name** in `VillageActionsController`.
   - On entry, controller reuses cached stock if present.
   - Fresh random stock is generated only for previously unseen villages.
4. `GameFacadeLifecycleCoordinator` now passes village state into save/load flows:
   - save: `villageActionsController.getPersistentState()`
   - load: `villageActionsController.restorePersistentState(...)`

## Guarantees after this patch

- Refreshing page does **not** erase known NPC passports.
- NPC names/occupation/appearance/life-status remain stable after reload.
- Village market assortment remains stable for already-generated villages after reload.
- World/village persistence still resets on **New Character** (save key removal).

## Developer UX: World Info panel

- The previous **NPC Roster** developer HUD panel is now presented to users/testers as **World Info**.
- It remains developer-mode-only.
- Panel now shows:
  1. runtime NPC passport list (filterable by village),
  2. parsed saved localStorage payload (`rgfn_game_save_v1`),
  3. current runtime village payload (`getPersistentState`) that will be written on next save tick.
- This gives in-game visibility for validating persistence without opening browser DevTools.

## Regression coverage added

`villageActionsController.test.js` includes a round-trip test that:
1. visits a village and captures persisted state,
2. creates a fresh controller instance,
3. restores state,
4. re-enters the same village,
5. verifies roster and stock are identical,
6. verifies stock refresh randomizer is not called when persisted stock exists.

## Follow-up ideas

- Persist per-village side-quest offer roll history for exact offer-board continuity after refresh.
- Add optional save-version migration path (`v2`) if village payload schema expands.
- Add collapse/expand controls in World Info for large maps to avoid very long JSON blocks.
