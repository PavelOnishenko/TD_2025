# RGFN village-defense: defender HP invariants + battle pacing fix (2026-04-14)

## Context
During village-defense quests, allied defenders could end up with inflated maximum HP values after repeated battles (for example, growing from ~20-30 to hundreds). Also, waiting in 12-hour increments effectively produced one battle per click, creating too many fights over multi-day defenses.

## What changed
1. **Defender max HP is now invariant across village-defense battles.**
   - Battle survivor payloads no longer overwrite stored defender `maxHp`.
   - Post-battle HP persistence clamps `currentHp` to stored `maxHp`.
   - Combat ally instantiation now forces runtime ally `maxHp` to stored defender `maxHp`, so derived combat-stat inflation cannot leak into persisted quest state.

2. **Village-defense battle pacing now targets 2-6 battles total per defense window.**
   - On defend start, runtime rolls `remainingBattles` in `[2, 6]`.
   - Cooldown to the next attack is scheduled from remaining time and remaining battle count (dynamic spacing), rather than fixed 4-12 hour rolls each cycle.
   - If `remainingBattles` reaches `0`, no more raids are spawned before objective completion.

3. **Reset/completion hygiene.**
   - On defense completion, collapse, or rollback, `remainingBattles` and cooldown state are reset.

## Why this fixes the reported issues
- **HP escalation bug:** removed the write path that copied ally battle `maxHp` back into defenders, and normalized ally runtime max HP to stored values.
- **Too many raids while waiting:** pacing now has a bounded battle budget (2-6) for the full defend duration, so 7-day quests no longer produce one battle every 12h click.

## Files touched
- `rgfn_game/js/game/runtime/GameQuestRuntime.ts`
- `rgfn_game/js/systems/quest/QuestTypes.ts`
- `rgfn_game/test/systems/recoverQuestRuntime.test.js`

## Verification added
- Updated defend runtime tests to assert:
  - Defend allies can enter with derived runtime `maxHp` from stats/skills.
  - Survivor-reported `maxHp` and `hp` are persisted directly in defend battle results.
  - Defend start rolls battle budget and does not always trigger on first 12h wait.

## Follow-up adjustment (same day)
- Per gameplay feedback, all **defense-side HP normalization** was removed:
  - Survivor `maxHp` is persisted directly.
  - Survivor `hp` is persisted directly (no clamping in defend persistence path).
  - Defend combatants use their **derived** runtime `maxHp` from stats/skills; when a defender enters at "full", they enter at the derived full HP.
- Battle pacing budget (2-6 total raids across defend duration) remains intact.
