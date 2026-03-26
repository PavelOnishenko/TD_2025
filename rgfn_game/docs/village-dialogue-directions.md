# Village NPC Dialogue and Settlement Direction Hints

## What was added

The village menu now supports a lightweight dialogue flow:

1. Enter village.
2. Choose one of multiple NPCs in the **Village rumors** section.
3. Type a settlement name from a quest (for example, `Oakhaven`).
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
