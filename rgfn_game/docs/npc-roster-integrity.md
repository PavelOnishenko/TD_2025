# NPC Roster Integrity (RGFN)

## Problem solved
Quest givers and other village NPCs could disappear between visits because village rosters were generated ad-hoc and cached per village without a hard source-of-truth model.

## New model
`VillageNpcRoster` is now the source of truth for all generated and quest-injected NPCs in a world.

- NPC passport fields are stable: id, name, village, occupation, personality, speech style, visual look.
- Runtime fields are mutable: life status (`alive` / `dead`), source tag, first-seen / last-updated ticks.
- Every generated NPC is added to the roster immediately.
- Village UI always pulls villagers from `VillageNpcRoster`.
- New character/new world naturally starts with an empty roster because the game reloads and rebuilds runtime state.

## Integrity checks
`VillageActionsController` performs integrity checks during village entry, NPC UI refresh, and NPC selection.

- Missing expected NPC in a village raises `VillageRosterIntegrityError`.
- `VillageIntegrityAlert` shows a copy-friendly modal with:
  - short message
  - full message
  - stack trace

## Roster visibility
Village rumors panel now includes:

- **NPC Roster (source of truth)** section
- village filter dropdown (`All villages` + known villages)
- roster entries showing name, occupation, village, personality, and life status

## Dead NPC behavior
Defenders marked as fallen are no longer removed from the world roster; they stay in roster and are marked `[DEAD]`.
This avoids silent disappearance while preserving narrative state.
