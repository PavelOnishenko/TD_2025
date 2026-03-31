# RGFN escort quest overhaul + group panel (2026-03-31)

## What changed
- Escort leaf generation now includes **source village** and **destination village**.
- Escort objective text now explicitly tells the player where to recruit the NPC and where to deliver them.
- Escort objective data now persists runtime state (`hasJoined`, `isDead`) in quest objective metadata.
- Village NPC roster now injects escort targets into the source village roster so they can be selected and spoken to.
- Added a dedicated dialogue action: **Join my group**.
- Added a new HUD window panel: **Group**, with HUD menu toggle support and draggable panel behavior.
- Group panel now lists active escorted companions and HP/status.
- Escort completion now happens when entering destination village while escorted person is alive and following.
- Enemy turns can randomly hit an escorted companion instead of the player; escort NPCs do not take turns and never attack.

## Runtime flow notes
1. Quest generation creates escort contracts with source+destination.
2. Contracts are passed from quest runtime to village actions runtime.
3. In source village, escort person appears in NPC list.
4. Player selects NPC and uses **Join my group**.
5. Companion appears in Group panel and participates as a passive vulnerable companion in combat.
6. Reaching destination village with companion alive auto-completes escort objective.

## Logging behavior
- Recruitment writes a quest tracker log.
- Village entry that updates quest objectives writes a quest tracker log.
- If escort dies in combat, battle log notes mission failure context.

## Validation commands used in this task
- `npx tsc -p rgfn_game/tsconfig.json --noEmit` ✅
- `npm test` ⚠️ (repository has pre-existing failing suites expecting missing `dist` modules and unrelated game-level failures)
