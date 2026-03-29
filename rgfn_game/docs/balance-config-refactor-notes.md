# Balance Config Refactor Notes (March 2026)

## What changed

- `js/config/balanceConfig.ts` is now a composition root and stays small.
- Balance sections were extracted to `js/config/balance/` modules:
  - `creatureArchetypes.ts`
  - `worldMapBalance.ts`
  - `playerEnemyBalance.ts`
  - `progressionBalance.ts`
  - `itemsEncountersBalance.ts`
- `villageCreationRateMultiplier` is no longer a global key. It now lives at:
  - `balanceConfig.worldMap.villages.creationRateMultiplier`
- Quest UI + quest name generation settings moved from balance to theme:
  - `theme.quest.feedbackMessageDurationMs`
  - `theme.quest.nameGeneration.maxWordsByDomain`
  - `theme.quest.nameGeneration.wordLengthWeightsByDomain`

## Why this matters

- Meets the style-guide intent of splitting overly long files.
- Keeps balance-only data in balance config and non-balance UX settings in theme.
- Makes world generation settings easier to reason about by grouping all village-generation knobs together.
- Reduces coupling between quest systems and combat/economy balance constants.

## Migration map for future edits

- If a value changes encounter/combat/progression outcomes: use balance config.
- If a value changes timing/readability/visual UX only: use theme config.

### Quick references

- Village generation multiplier:
  - `balanceConfig.worldMap.villages.creationRateMultiplier`
- Quest feedback timeout:
  - `theme.quest.feedbackMessageDurationMs`
- Quest title word caps and weights:
  - `theme.quest.nameGeneration.*`

## Validation checklist used in this refactor

1. Update config ownership (balance vs. theme).
2. Update all call sites (`Quest*` systems + `WorldMap`).
3. Run lints/tests.
4. Confirm no remaining TODO markers in `balanceConfig.ts`.
