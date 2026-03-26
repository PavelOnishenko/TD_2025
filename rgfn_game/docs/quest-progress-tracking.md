# Quest progress tracking notes

## Problem fixed
- Some location-based objectives (for example `Scout Oakcross` with condition `Enter Oakcross.`) were not visibly marked as completed in the quest panel after entering the target village.

## Current behavior
- A dedicated progress tracker now marks leaf objectives as completed when the player enters a matching village name.
- Supported objective types for this automatic location completion are currently:
  - `travel`
  - `scout`
- Name matching is case-insensitive.
- Parent composite nodes automatically become completed when all children are completed.

## UI behavior
- Completed quest nodes render with:
  - a leading checkmark (`✓`)
  - a completed visual style (`.quest-node.is-completed`)
- The quest panel is re-rendered immediately after progress changes.
- Default quest boilerplate text is hidden at every tree level:
  - Root defaults:
    - `Complete every branch of this quest tree to prove your character can end the darkness over the region.`
    - `All child objectives are completed.`
  - Composite branch defaults:
    - `A composite objective. All listed subtasks must be completed.`
    - `Each subtask in this branch is completed.`
  - Custom descriptions and conditions still render as normal.

## Integration points
- `QuestProgressTracker` owns runtime completion evaluation.
- `Game` records location entry when entering village mode and forwards this to the tracker.
- `QuestUiController` renders completion state using `QuestNode.isCompleted`.
- `Game` now persists the full active quest tree (`title`, structure, entities, and `isCompleted` flags) inside `rgfn_game_save_v1`, then restores it on refresh so completed nodes remain completed.

## Persistence behavior
- Save payload now includes `quest: QuestNode | null`.
- Quest bootstrap now prefers the saved quest from localStorage and only generates a fresh quest when no saved quest exists.
- Existing saves from before this change remain compatible:
  - world/player/spell state still restores.
  - if the old save has no `quest`, the game generates a new quest once and future saves include quest state.

## Follow-up opportunities
- Expand tracker events for non-location objective types (`deliver`, `barter`, `escort`, etc.).
- Show quest completion notifications in battle log / village log.

## Update: barter objective tracking is now live

### What is now supported
- `QuestProgressTracker` now supports direct completion updates for **barter** leaves through:
  - `recordBarterCompletion(traderName, itemName)`.
- Matching is case-insensitive and requires both:
  - `person` quest entity == barter partner name
  - `item` quest entity == received item name
- Once matched, the barter leaf is marked complete and parent branches are recomputed immediately.

### Runtime integration
- `VillageActionsController` emits barter-complete callback after payment is consumed and reward item is granted.
- `Game` forwards this event to `QuestProgressTracker` and re-renders the quest UI instantly.
- If no node matches, a verbose system message explains that barter was registered but not tied to an active objective.
- `Game` also extracts all barter leaves (`person` + `item`) and configures village barter contracts dynamically, so runtime barter NPCs and reward artifacts follow generated quest data rather than fixed names.

### Practical example now solvable
- Quest text:
  - Title: `Barter with Olive`
  - Description: `Negotiate with Olive and exchange for Kator Kaesh.`
  - Condition: `Complete one barter deal and obtain Kator Kaesh.`
- Runtime:
  - Find Olive in her persistent home village.
  - Complete her barter transaction.
  - Quest node updates to completed immediately after the trade.

### Name-independence guarantee
- The barter pipeline does **not** depend on literal names such as `Olive` or `Kator Kaesh`.
- Any generated barter leaf with valid entities:
  - `person` = trader
  - `item` = reward artifact
  is automatically supported end-to-end with the same flow.

### Runtime safety note (constructor ordering)
- `Game.initializeQuestUi(...)` now runs **after** `VillageActionsController` is constructed and assigned.
- Reason: `initializeQuestUi` configures quest barter contracts through `villageActionsController.configureQuestBarterContracts(...)`.
- Calling it earlier can throw:
  - `TypeError: Cannot read properties of undefined (reading 'configureQuestBarterContracts')`.
- This ordering requirement is now part of the expected initialization contract.
