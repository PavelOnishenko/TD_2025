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
