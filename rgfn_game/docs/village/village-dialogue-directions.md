# Village NPC Dialogue and Settlement Direction Hints

## What was added

The village menu now supports a lightweight dialogue flow:

1. Enter village.
2. Choose one of multiple NPCs in the **Village rumors** section.
3. Pick a settlement from the **Ask about location** dropdown (for example, `Oakhaven`).
4. Ask for directions.

NPCs can respond with different behavioral profiles:

- **silent**: refuses to answer;
- **truthful**: gives real direction and rough distance;
- **imprecise**: tries to help, but with imperfect direction/distance;
- **liar**: intentionally points opposite;
- **malicious**: intentionally misleads toward a bad route;
- **random**: gives an arbitrary direction.

## Logging behavior

The game log records:

- which NPC was selected;
- short physical/behavioral description;
- exact question text from the player;
- NPC answer text;
- delivery/tone text;
- extra map-note line when a truthful answer is given.

This creates a traceable conversation history and a baseline for future quest / reputation systems.

## Architecture notes (future-ready)

- Dialogue generation is separated into `VillageDialogueEngine`.
- Village UI orchestration stays in `VillageActionsController`.
- Geographical truth source comes from `WorldMap` through `getVillageDirectionHintFromPlayer(...)`.

This split is designed so future features can be added without rewriting village commerce logic:

- NPC memory and trust tracking;
- quest-aware responses;
- branching dialogue trees;
- faction and relationship modifiers.

## Suggested next steps

- Rumor/dialogue NPC roster is now cached per village in `VillageActionsController`, so talkable villagers remain stable between re-entries.
- ✅ Village population persistence is now implemented per village name (villager roster remains stable across re-visits).
- Add confidence score to each answer and expose it in UI.
- Add optional follow-up line choices for persuasion, intimidation, bribery, and lore questions.
- Bind outcomes to quest journal entries (accepted hint, contradiction discovered, rumor confirmed).

## New: person-location rumors and reliability tuning

Village rumors now support asking about **people**, not only settlements.

### UX flow
1. Select an NPC in the rumor panel.
2. Pick a person name from quest text (example: `Olive` or generated escort/trader names) in the person dropdown.
3. Click **Ask about person**.

### Dropdown population rules (new)
- **Settlement list** is a union of:
  - discovered villages,
  - named locations known from quest descriptions (even if not discovered physically yet),
  - source/destination villages from escort and barter quest contracts.
- **Person list** is a union of:
  - trader names from active barter contracts,
  - escort person names from active escort contracts,
  - villagers/NPCs already observed in rumor rosters.
- Lists are deduplicated and sorted alphabetically.

### Button availability rule (RGFN UX)
- The following four dialogue/barter buttons are now always enabled in the village UI:
  - **Ask about location**
  - **Ask about person**
  - **Ask about barter**
  - **I have what you need, let's do our barter**
- Validation remains in action handlers, so if no NPC is selected or required input is missing, the game log explains what to do next.
- This preserves guidance via feedback while removing click-lock friction.

### Reliability model (intentionally lower than village directions)
- Person rumors have an explicit low knowledge chance (`26%`) before truthful/imprecise branches can trigger.
- This keeps person tracking useful over many conversations, but unreliable in one-off interactions.
- Result: players often receive:
  - refusal/no clue,
  - imprecise route,
  - occasional lie or malicious misdirection.

### Current data source behavior
- The system is **contract-driven**, not hardcoded to specific names.
- For each active barter quest leaf (`person` + `item` entities), the trader is bound to a persistent home village.
- Person-direction hints are resolved from this quest barter contract mapping.
- Unknown names return `exists: false`, then dialogue personality decides whether NPC admits ignorance or fabricates.

### Logging
- Person queries log:
  - exact player question text,
  - NPC answer with truthfulness label,
  - tonal line,
  - journal note when a truthful direction is received.
