# Recover Quest: Village Holder Confrontation (RGFN)

## What changed

`recover` objectives are now playable end-to-end:

1. The target artifact starts in a specific village.
2. Talking to villagers can reveal the exact person holding it.
3. Once confirmed, confronting that person starts a forced duel.
4. If player wins, the artifact is awarded and the objective completes.
5. If player flees, the holder escapes to another village and the quest text switches to a person-hunt state.

## Runtime behavior details

- Recover objectives now store dedicated recover metadata in quest objective data:
  - `itemName`, `personName`
  - `initialVillage`, `currentVillage`
  - `isPersonKnown`, `hasFled`
  - `enemyProfile` (persistent combat profile so stats stay stable between encounters)
- When any non-target NPC is selected in the right village, the system can reveal the holder identity.
- Recover confrontation is triggered from village dialogue confirmation flow.
- On `fled`, holder relocation can repeat endlessly; every flee picks a different village when possible.
- Person-location interrogation uses existing person-direction hint pipeline via quest contracts.

## Files and systems touched

- Quest generation now writes recover objective payload (`QuestLeafFactory`).
- Quest runtime now:
  - reveals holder identity,
  - starts recover confrontation battles,
  - resolves victory/flee outcomes,
  - refreshes contracts after recover state transitions.
- Village interaction now:
  - logs villager lead reveal,
  - starts confrontation battle from dialogue action.
- Battle runtime now exposes a battle-ended callback so recover outcomes are applied centrally.

## Edge cases

- If only one village exists in world data, flee relocation falls back to same village.
- Recover reward item uses type `quest` and is inserted through normal inventory add flow.
- Recover person contracts are discoverability-only (not converted into barter deals).

## Notes for future expansion

- Add dedicated UI button/text for confrontation to separate it from barter semantics.
- Add reputation or legal consequences for aggressive recovery in lawful settlements.
- Add bounty escalation for repeated flee cycles.
