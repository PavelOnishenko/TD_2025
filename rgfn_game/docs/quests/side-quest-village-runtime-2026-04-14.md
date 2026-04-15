# Side Quest Village Runtime (2026-04-14)

## What was added

- Quest typing now supports side-quest metadata directly on `QuestNode` root objects:
  - `track: 'main' | 'side'`
  - `giverNpcName`, `giverVillageName`
  - `reward`
  - `status: 'available' | 'active' | 'readyToTurnIn' | 'completed'`
- `GameQuestRuntime` now includes side-quest runtime state:
  - `activeSideQuests: QuestNode[]`
  - per-villager offer registry keyed as `village::npc`
  - configurable per-villager side-quest cap (clamped to 1..3)
- New runtime APIs:
  - `registerVillageSideQuestOffer(quest)`
  - `getVillageSideQuestOffers(villageName, npcName)`
  - `acceptSideQuest(questId)`
  - `markSideQuestReadyToTurnIn(questId)`
  - `turnInSideQuest(questId, npcName, villageName)`

## Runtime behavior

1. **Offer registration**
   - A side quest must include `id`, `giverNpcName`, and `giverVillageName`.
   - Duplicate offers / duplicate active quest IDs are rejected.
   - Offer cap is enforced per villager.

2. **Accepting side quests**
   - Accept removes the quest from that villager's offer list and moves it into `activeSideQuests`.
   - Accepted side quests are normalized to `track='side'` and `status='active'`.

3. **Turn-in validation**
   - Turn-in requires:
     - quest exists in `activeSideQuests`
     - quest status is `readyToTurnIn`
     - NPC + village exactly match the quest giver metadata
   - On success, quest transitions to `completed` and `isCompleted=true`.

## Village controller integration

- On NPC selection, village logic now:
  - checks side-quest offers from that NPC
  - logs offer visibility in dialogue log
  - accepts offered side quests through callback contract
  - attempts turn-in for tracked side quests when revisiting an NPC
- Turn-in validation is delegated to runtime (`turnInSideQuest`) so giver-lock rules are centralized.

## Persistence integration

- Save state now stores `sideQuests` array.
- On load, active side quests are restored as `track='side'` entries.

## Notes / extension points

- The current integration auto-accepts offers on NPC selection for flow simplicity.
- If explicit UI acceptance is needed later, wire a dedicated village action button and call the same callbacks.
- Reward handling currently returns reward text; economic/item granting is expected to be layered by caller.

## 2026-04-15: Side quest generation expansion

- `QuestObjectiveType` now includes side-focused objective leaves:
  - `localDelivery`
  - `gather`
  - `repair`
  - `patrol`
- `QuestObjectiveData` now carries dedicated payload shapes for those types:
  - `localDelivery` → village + source NPC + recipient NPC + item + completion flag.
  - `gather` → village + item + required/current amount.
  - `repair` → village + structure + required/repaired materials + completion flag.
  - `patrol` → village + checkpoint list + visited checkpoints + completion flag.
- Leaf pools are now split:
  - **Main quest leaf pool** remains unchanged (existing quest objective family only).
  - **Side quest leaf pool** includes all existing objective leaves plus new side-only leaves.
- Side quest leaf generation supports local constraints:
  - A side quest can pass `villageName` and `giverNpcName`.
  - Existing objective types (`deliver`, `travel`, `barter`, etc.) still generate, but are anchored locally to the giver context when generated as side quests.
- Side quest root metadata now includes reward metadata:
  - `rewardMetadata: { xp, gold, itemName, requiresTurnIn: true }`
  - Human-readable `reward` text remains for dialogue/UI continuity.
- Reward claim timing remains unchanged:
  - Rewards are still represented as claimable on giver turn-in (`readyToTurnIn` → `completed`) and not auto-claimed at objective completion.

## 2026-04-15: Proximity-constrained side-quest generation and village NPC locality

- World map village navigation now exposes a proximity query API:
  - `getNearbyVillagesFromVillage(villageName, maxDistanceCells)`
  - Output is distance-sorted and includes direction + distance metadata per nearby village.
- Side quest generation now consumes map proximity context:
  - Side-quest generation path provides current village + nearby villages.
  - Candidate side-quest villages are restricted to:
    - the giver's village
    - nearby villages only (never arbitrary far settlements)
- New balance controls:
  - `balanceConfig.quest.sideQuestMaxVillageDistanceCells` controls maximum allowed side-quest target range from the giver village.
  - `balanceConfig.quest.sideQuestNearbyRosterDistanceCells` controls village roster injection locality for side-quest-related NPC references.
- Objective text now reuses map direction hints:
  - Quest leaf descriptions/conditions annotate nearby settlement names with distance-direction context when available, e.g. `VillageName (north-east, 3 cells)`.
  - Distance annotations are suppressed for zero-distance (same-village) objectives.
- Village action/dialogue locality behavior tightened:
  - Known-person dialogue options are filtered to current village + immediate nearby villages.
  - Accepted side quests can inject referenced NPCs only into local/nearby village rosters, never distant village rosters.
  - This keeps rumor, dialogue, and objective references spatially coherent for the active local play area.
