# Quest progress tracking notes

## April 8, 2026 update: village dialogue contract visibility now follows known quest frontier

- Non-developer mode village dialogue dropdowns are now aligned with quest knowledge progression:
  - discovered map settlements still appear,
  - NPCs met in person still appear,
  - quest-linked settlement/person entries are now restricted to quest nodes that are **known by the frontier model** (in-progress or already completed),
  - future unknown quest branches no longer leak contract names into village dialogue controls.
- Developer mode remains intentionally permissive and continues exposing full debug contract pools.

### Runtime integration details

- `GameQuestRuntime.collectBarterContracts(...)` now filters using `collectKnownQuestNodes(...)` before emitting barter/deliver/recover contracts.
- `GameQuestRuntime.collectEscortContracts(...)` now applies the same known-node filter before exposing escort persons/villages.
- Contract refreshes now run after additional quest progression events so UI contract data stays synchronized as objectives change:
  - location-entry quest progression,
  - barter completion progression,
  - monster-kill progression.

### Regression coverage

- Added `GameQuestRuntime` test coverage to verify:
  - completed + current known objectives are exposed,
  - future unknown contract objectives are not exposed.

## March 30, 2026 update: strict runtime gating for unknown quest objectives

- We now use a single "known objective frontier" model not only in UI, but also in runtime logic:
  - objectives above/equal to the current known cutoff are considered **known/current**,
  - deeper objectives remain **unknown/future** until the frontier advances.
- Practical effect: quest-specific runtime influences are blocked for unknown nodes.

### What is now blocked until objective becomes known

- Quest monster progression:
  - kills no longer increment hidden future hunt/eliminate objectives.
- Quest monster encounter spawning:
  - hidden hunt/eliminate objectives no longer inject quest-mutant ambushes into world travel.
- Location/trade progression for future leaves:
  - entering villages or trading with NPCs no longer pre-completes future hidden objectives.

### Technical implementation notes

- Added shared quest-knowledge helpers:
  - `collectQuestPreorderNodes(...)`
  - `resolveKnownQuestCutoffIndex(...)`
  - `collectKnownQuestNodes(...)`
- `QuestUiMarkupBuilder` now reuses the same cutoff helper as runtime systems.
- `QuestProgressTracker` computes current known node-set per event and only allows updates for nodes in that set.
- `QuestMonsterProgress` and `QuestLocationTradeProgress` now receive an explicit `isObjectiveKnown(node)` guard for mutation-safe, testable gating.

### Why this matters

- Eliminates "spoiler encounters" (e.g., special quest mutants appearing before the player has learned that objective).
- Keeps quest world state coherent with the "Show only known/current quests" model.
- Prevents accidental future-objective completion from unrelated exploration/actions.

## March 28, 2026 update: alternate "known/current only" quest panel mode

- The Quests HUD panel now supports a second display mode controlled by a checkbox:
  - `Show only known/current quests`
- Default behavior is now **known-only ON** (checkbox checked) to avoid exposing future objectives unless the player opts in.
- When checkbox is ON, the panel hides future objectives that are still below the first currently incomplete objective in quest preorder:
  - keeps already completed objectives visible,
  - keeps the current first incomplete objective visible,
  - hides nodes after that cutoff ("future" nodes the player has not reached yet).
- Checkbox state is persisted in local storage:
  - key: `rgfn_quests_known_only_toggle_v1`
  - value `'1'` = checked (known-only mode), `'0'` = unchecked (full tree mode)
  - if no value is saved, default is checked (`true`).

### UI + implementation details

- Added quest mode toggle in HUD markup:
  - `#quests-known-only-toggle` in `index.html`.
  - initial HTML state is checked so first-time users start in spoiler-safe mode.
- Added toggle styling in `style.css`:
  - `.quest-mode-toggle`.
- `QuestUiController` now:
  - stores the last rendered quest (`lastRenderedQuest`),
  - restores saved toggle state on construction (`localStorage`) with a safe fallback when storage is unavailable,
  - persists toggle state on every user change event,
  - re-renders automatically when the checkbox changes,
  - computes preorder quest list and cutoff index in known-only mode,
  - conditionally hides nodes below cutoff unless they are already completed.
- Wiring updates:
  - `HudElements` type now includes `questsKnownOnlyToggle`,
  - `GameUiFactory` collects the checkbox element,
  - `Game` passes checkbox into `QuestUiController`.

### Why this mode exists

- Reduces cognitive load for long quest trees.
- Prevents "spoiler" visibility of deep future branches.
- Keeps an explicit toggle so players can still inspect the full quest structure whenever desired.

### Regression coverage

- Added automated test in `test/systems/questUiController.test.js`:
  - verifies known-only mode hides nodes below the first incomplete objective while keeping completed + current nodes visible.
- Added persistence/default tests:
  - verifies known-only defaults to checked when there is no saved preference,
  - verifies stored `'0'`/`'1'` values are restored and updated as user toggles the checkbox.

## March 28, 2026 update: "is not discovered yet" quest-panel warning now auto-hides

### What changed
- The red feedback text shown after clicking an undiscovered quest location (for example, `Oakcross is not discovered yet.`) no longer remains stuck at the bottom of the quests panel.
- `QuestUiController` now auto-clears quest feedback after a configurable timeout.
- Timeout is controlled by balance config:
  - `balanceConfig.questUi.feedbackMessageDurationMs`
  - default value: `5000` (5 seconds)

### Runtime behavior details
- Every new feedback message resets the previous clear timer to avoid race conditions.
- Both error feedback (red "not discovered yet") and non-error feedback ("Showing ... on the world map.") now auto-hide after the configured delay.
- Setting timeout to `0` clears feedback immediately (useful for experiments/tests).

### Why this implementation
- Keeping the timeout in **balance** config makes tuning UX possible without touching controller logic.
- Timer cancellation on message replacement prevents older timers from clearing newer messages unexpectedly.

### Regression coverage
- Added automated test in `test/systems/questUiController.test.js` that verifies:
  1. timeout is scheduled with `5000` ms by default,
  2. scheduled callback clears feedback text,
  3. replacing feedback cancels the prior timeout.

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

## Quest data contract note
- `QuestNode` may carry optional structured runtime data in `objectiveData`.
- Current structured payloads in active use:
  - `objectiveData.deliver` for courier pickup and destination state.
  - `objectiveData.monster` for kill targets, required kill counts, mutation traits, and runtime kill progress.
- Important: monster mutation origin belongs inside `objectiveData.monster.mutatedFrom`, not as a required top-level field on `QuestObjectiveData`.
- If future quest types need machine-readable progression, add a new optional branch under `objectiveData` instead of encoding logic-critical state only in description text.

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

## March 26, 2026 update: courier objectives are now fully completable with explicit pickup source

### Problem
- Courier leaves only described destination + item carry condition.
- There was no explicit, enforced pickup source in objective state.
- Result: players lacked clear guidance on where to obtain courier items, and objective completion could be unclear.

### Fix
- Courier leaf generation now embeds complete pickup/delivery data in `objectiveData.deliver`:
  - source village
  - source trader
  - destination village
  - item name
  - pickup progress flag
- Courier description + condition now explicitly state:
  - who provides the item,
  - where pickup happens,
  - where delivery completes.
- Village barter contracts now include courier entries and preserve source village assignment.
- Village rumor logs now print courier-specific hints for villages that host pickup traders.
- Progress tracker now completes courier objectives only when:
  1. pickup happened via matching trader+item at matching source village,
  2. destination village is reached,
  3. required item is still in inventory.

### Verification checklist
1. Start a new run and locate a courier objective in the quest tree.
2. Confirm quest text includes source trader and source village.
3. Reach source village and barter with named trader for required item.
4. Travel to destination while carrying item.
5. Confirm courier leaf is marked complete in quest UI.

## April 11, 2026 update: dialogue location list now uses quest-knowledge + discovered-map knowledge

### Problem observed
- In non-developer mode, some NPC dialogue location dropdowns could include names from deeper future quest steps that the player had not unlocked yet.
- This was especially confusing in runs where only the first visible quest task was known, but dialogue controls still leaked additional settlement names.

### What changed
- `GameQuestRuntime` now exposes `getKnownQuestLocationNames()`:
  - collects location entities only from **known quest nodes** (same frontier model used for contract visibility),
  - returns sorted unique names,
  - used as a dedicated source for player-facing quest-location knowledge.
- `VillageActionsController` now consumes a new callback:
  - `getKnownQuestSettlementNames`,
  - non-developer mode settlement dropdown = union of:
    1) discovered map settlements,
    2) known quest settlements.
- Quest location registration on world map is now synchronized via `syncKnownQuestLocations()` during contract refresh:
  - newly unlocked quest locations become registerable as progress advances,
  - unknown future nodes are not proactively registered into dialogue-facing known lists.

### Why this is safer
- Dialogue UI is no longer forced to infer quest knowledge from world map internals only.
- The runtime has an explicit quest-knowledge API boundary for settlements.
- This keeps non-developer mode aligned with the intended rule:
  - show only what the current character can know from discovered map state + active/completed quest frontier.

### Regression coverage added
- `recoverQuestRuntime.test.js` now verifies known quest settlement extraction excludes unknown future contracts.
- `villageActionsController.test.js` now verifies non-developer settlement dropdown merges discovered map names with known quest names.
