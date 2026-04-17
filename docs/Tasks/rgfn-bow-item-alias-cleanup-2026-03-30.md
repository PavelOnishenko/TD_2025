# RGFN Bow Item Alias Cleanup (2026-03-30)

## What changed

- Removed the special-case `BOW_ITEM` alias (`id: "bow"`) from `rgfn_game/js/entities/Item.ts`.
- Bow tier 1 now uses the same generated ID scheme as every other weapon: `bow_t1`.
- Updated encounter/discovery balance config to reference `bow_t1` instead of legacy `bow`.
- Updated `ItemId` type to use `bow_t1` instead of `bow`.

## Why this was done

The old `bow` entry was a one-off item alias that duplicated generated weapon data and forced extra filtering logic in `ITEM_LIBRARY`.
Removing it:

- eliminates dead/special-case code,
- keeps weapon handling uniform,
- reduces the chance of ID drift between generated and manual definitions.

## Behavioral impact

- New item generation/discovery now yields `bow_t1` where `bow` was previously used.
- Shop inventory was already using `bow_t1..bow_t4`, so this aligns systems instead of diverging them.

## Compatibility note

If there are existing save files with item ID `bow`, those saves may no longer resolve that ID directly.
If backward compatibility is required, add an explicit migration at load time:

- map `bow` -> `bow_t1` before calling item restoration.

## Verification notes

- Type-check/tests should confirm no runtime references to `bow` remain in RGFN item flows.
- A targeted grep was used during the cleanup to validate references.
