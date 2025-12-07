# Coding Checklist for TD_2025 Project

## CRITICAL: Always follow these steps when coding

### 1. Localization
- **ALWAYS add localization** when adding new user-facing text
- Localization files are in `assets/locales/`
  - `en.json` - English
  - `ru.json` - Russian
- Tutorial text goes under `tutorial.{stepId}.title` and `tutorial.{stepId}.text`
- Use `nameKey` and `textKey` in tutorial configs to reference localization keys

### 2. Update Task Lists
- **ALWAYS mark tasks as DONE** in the relevant task file when complete
- Task files are in `docs/Tasks/Tasks_Iteration_*.txt`
- Format: `DONE N. Task description`

### 3. Testing
- **ALWAYS run tests** after making changes: `npm test`
- Test files are in `test/` directory
- All tests must pass before considering task complete

### 4. Tutorial System (when adding tutorial steps)
- Add helper functions at top of `js/config/gameConfig.js` if needed
- Tutorial steps are in `gameConfig.js` under `tutorial.steps`
- Each step needs:
  - `id` (unique identifier)
  - `name` and `nameKey` (for localization)
  - `wave` (when it appears)
  - `text` and `textKey` (for localization)
  - `highlightTargets` (array of DOM element IDs)
  - `checkComplete` function (returns true when step is complete)
  - Optional: `picture`, `sound`

### 5. Code Quality
- Read files before editing them
- Use existing patterns and helper functions
- Keep code simple and focused
- Don't over-engineer solutions

## Tutorial Step Example

```javascript
// 1. Add helper function (if needed)
const hasFeature = (game) => {
    // Check game state
    return game?.someCondition;
};

// 2. Add tutorial step
{
    id: 'feature-name',
    name: 'Feature Title',
    nameKey: 'tutorial.featureName.title',
    wave: 1,
    highlightTargets: ['elementId'],
    text: 'Instruction text',
    textKey: 'tutorial.featureName.text',
    picture: 'assets/image.png',
    sound: 'assets/sound.mp3',
    checkComplete(game, context) {
        return hasAcknowledged(context, 'feature-name') || hasFeature(game);
    },
}

// 3. Add to en.json
"tutorial": {
    "featureName": {
        "title": "Feature Title",
        "text": "Instruction text"
    }
}

// 4. Add to ru.json
"tutorial": {
    "featureName": {
        "title": "Название функции",
        "text": "Текст инструкции"
    }
}
```

## Remember
- **Localization is NOT optional** - always add it
- **Mark tasks as DONE** - keep task lists updated
- **Run tests** - ensure nothing breaks
