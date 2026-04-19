# Side-quest Regenerate Developer Tool (2026-04-17)

## What was added

A developer-only **Regenerate** button now appears in the **Quests → Side** panel on every visible side-quest card.

- The button is only rendered when persistent developer mode is enabled (`DeveloperModeConfig.enabled = true`).
- Clicking the button replaces that specific side quest with a newly generated random side quest from the same giver NPC and village.
- The replacement keeps the quest in the same panel bucket:
  - `available` quests remain `available`.
  - all other statuses are regenerated as `active` (so the regenerated quest is testable immediately).

## Why this helps

This removes the slow loop of waiting for village offer refreshes or manually reloading saves to get new side-quest variants.

It is especially useful for:

- validating objective text variants;
- quickly cycling reward metadata;
- testing location hint formatting;
- stress-testing quest progression and turn-in UX with many random templates.

## Runtime wiring summary

- `QuestUiController` now owns regenerate button rendering and click handling for side-quest cards.
- `GameRuntimeAssembly` wires UI callbacks:
  - `isDeveloperModeEnabled` (visibility gate),
  - `onRegenerateSideQuest` (action callback).
- `GameFacade.regenerateSideQuest` performs generation and replacement orchestration.
- `GameQuestRuntime` provides:
  - `getKnownSideQuest(questId)`,
  - `replaceKnownSideQuest(questId, replacement)`.

## QA notes

Recommended checks:

1. Enable developer mode in the developer modal.
2. Open Quests panel and switch to Side tab.
3. Confirm each side-quest card shows **Regenerate**.
4. Click regenerate on:
   - an available quest,
   - an active quest,
   - a ready/completed quest (if present in known list).
5. Verify the card updates to a new title/objectives and the success feedback message appears.
6. Disable developer mode and verify the button no longer appears.

## Known constraints

- Regeneration currently uses runtime random generation and does not pin seed per click.
- The regenerate action replaces quest identity (new quest id), so external references to old quest ids become stale.
