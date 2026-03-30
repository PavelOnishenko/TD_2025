# QuestUiController Rule 3 Refactor (2026-03-30)

## Goal
Apply Style Guide rule 3 (`files not longer than 200 lines`) to `rgfn_game/js/systems/quest/QuestUiController.ts` while keeping behavior and tests stable.

## What was extracted

### 1) `QuestUiMarkupBuilder`
- File: `rgfn_game/js/systems/quest/QuestUiMarkupBuilder.ts`
- Responsibility:
  - Build quest tree HTML markup.
  - Keep known-only filtering logic.
  - Keep default description/condition suppression logic.
  - Keep entity-to-markup conversion and HTML escaping.
- Injected dependency:
  - `isKnownOnlyEnabled: () => boolean` so the builder remains independent from direct DOM access.

### 2) `QuestUiFeedbackPresenter`
- File: `rgfn_game/js/systems/quest/QuestUiFeedbackPresenter.ts`
- Responsibility:
  - Create quest feedback elements.
  - Render error/success feedback text.
  - Clear feedback based on `theme.quest.feedbackMessageDurationMs`.
  - Manage timeout cancellation when a new message is shown.

## Compatibility choices
- `QuestUiController` keeps a runtime `setFeedback` method because tests intentionally call it via bracket access (`controller['setFeedback'](...)`).
- `QuestUiController` keeps `feedbackElements` as a property for tests that assert feedback content directly.
- The implementation delegates both compatibility hooks to `QuestUiFeedbackPresenter`.

## Current LOC status after refactor
- `QuestUiController.ts`: **157** lines
- `QuestUiMarkupBuilder.ts`: **116** lines
- `QuestUiFeedbackPresenter.ts`: **61** lines

All touched quest UI files are below 200 lines.

## Validation commands used
- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/questUiController.test.js`
- `node --test rgfn_game/test/systems/questUiController.test.js rgfn_game/test/systems/questGenerator.test.js rgfn_game/test/systems/questProgressTracker.test.js rgfn_game/test/systems/questPackService.test.js`
- `npm run style-guide:audit:rgfn`

## Notes for follow-up
- Rule 3 backlog still exists in other RGFN files (audit currently reports 16 violations overall).
- If we continue refactoring quest systems, good next targets are:
  - `QuestLeafFactory.ts` (260 lines)
  - `QuestPackService.ts` (222 lines)
  - `QuestProgressTracker.ts` (278 lines)
