# Side-Quest Turn-In Reward Fix (2026-04-16)

## Symptom
- Side-quest turn-in logs displayed `"Reward received: <xp>, <gold>, <item>"`, but player progression did not change.
- XP, level progression, and gold stayed unchanged after successful side-quest turn-in.

## Root Cause
- `GameQuestRuntime.turnInSideQuest()` changed quest status to `completed` and returned reward text only.
- `GameFacade.turnInSideQuest()` forwarded runtime results without applying `rewardMetadata` to the player state.
- Result: reward messaging existed, but no gameplay state mutation happened for XP/gold.

## Fix
- `GameQuestRuntime.turnInSideQuest()` now returns `rewardMetadata` alongside reward text for successful turn-ins.
- `GameFacade.turnInSideQuest()` now applies:
  - `player.gold += rewardMetadata.gold`
  - `player.addXp(rewardMetadata.xp)`
- This ensures quest rewards are actually granted during hand-in, matching the log output and design intent.

## Notes
- Reward item names generated for side quests (`Repair Kit`, `Hunter Tonic`, `Scout Charm`, `Trail Rations`) are currently descriptive reward text, not wired to concrete inventory item IDs.
- XP and gold are now authoritative reward effects at turn-in.
