# VillageActionsController Rule 3 refactor (2026-03-30)

## Request
Apply Style Guide Rule 3 (`files not longer than 200 lines`) to:
- `rgfn_game/js/systems/village/VillageActionsController.ts`.

Constraint requested by user:
- Extract code into new classes so neither the original file nor new files have 200+ LOC.

## What was changed

### Controller split
- Reduced `VillageActionsController.ts` to orchestration-only responsibilities.
- Kept public API method names stable so existing binders can continue calling the same controller methods.

### New extracted classes
A new subfolder was introduced to keep folder child count manageable:
- `rgfn_game/js/systems/village/actions/`

New files:
1. `VillageActionsTypes.ts`
   - Shared village action types (`VillageUI`, callbacks, barter/payment/offer types).
2. `VillageStockService.ts`
   - Offer generation and sell-price logic.
3. `VillageBarterService.ts`
   - Quest barter contract storage, assignment, deal construction, payable option checks, and verification trace generation.
4. `VillageUiPresenter.ts`
   - UI rendering and updates (buy/sell buttons, NPC list panel, shared log appending).
5. `VillageTradeInteractionService.ts`
   - Wait/sleep/buy/sell action flows.
6. `VillageDialogueInteractionService.ts`
   - Ask-about-settlement/person/barter and confirm-barter flows.

## Rule 3 status for touched files
All newly added files and the target original file are below 200 LOC.

## Verification commands and outcomes
- `npm run build:rgfn` ✅
  - TypeScript build for RGFN scope succeeded.
- `npm test` ❌
  - Repo-wide tests fail due pre-existing environment/repo baseline issues unrelated to this refactor (missing `dist` artifacts in EVA/RGFN tests + unrelated projectile/wave assertion failures).
- `npm run style-guide:audit:rgfn` ✅ (informational)
  - Confirms current backlog; touched `VillageActionsController.ts` is no longer over Rule 3 line limit.

## Useful implementation notes learned during this refactor
1. **Keep village folder child count in check**
   - Extracted files were placed under `village/actions` instead of directly in `village/`.
2. **Preserve external integrations by keeping controller method names**
   - Event binder code can stay untouched when controller public API remains stable.
3. **Separate concerns by runtime role**
   - Contract/deal state (`VillageBarterService`) is easier to maintain separately from UI presentation (`VillageUiPresenter`) and user action flows.
4. **Use presenter to centralize DOM updates**
   - Prevents duplicate button and panel logic across action handlers.

## Follow-up opportunities
- Continue Rule 3 backlog in village files still over 200 LOC:
  - `VillageDialogueEngine.ts`
  - `VillageLifeRenderer.ts`
- Consider extracting a lightweight `VillageNpcRosterService` if roster creation grows further.
