# RGFN Quest Generation Methodology

## Goal
Create a **central main quest** for each character that defines whether that run is considered "game completed".
The main quest is shown:
1. On page load (full text in a modal window).
2. Later in HUD via **Quests** button/panel.

## Core Data Model
- **Task**: universal quest node concept.
- Task can be:
  - **Composite** (contains subtasks).
  - **Elementary** (leaf, contains no subtasks).
- Completion rule:
  - Elementary task is complete when its condition is met.
  - Composite task is complete when all required child tasks are complete.
  - Main quest is complete when all top-level tasks are complete.

## Tree Structure Strategy
- Use a rooted tree (main quest root).
- Nesting depth is theoretically unbounded, but practical median depth target: **2-3**.
- Branch count per composite node target: **2-3 subtasks**.
- Keep generated structure readable for UI.

## Elementary Objective Families
Current implemented/target families:
- **Eliminate** (kill target).
- **Deliver** (bring item to destination).
- **Travel** (arrive at location).
- **Barter** (complete trade).
- **Scout** (investigate area, fallback universal objective).

## Parameter Questions (Generation Method)
For each objective family, produce parameters by answering question slots.

### 1) Eliminate
Questions:
- Who is target? (archetype: skeleton/zombie/..., or specific named unit)
- Quantity? (1..N)
- Any location restriction?
- Is kill type-specific? (melee only / any)

Condition template examples:
- "Kill 3 skeletons."
- "Kill Dark Knight in Burnt Orchard."

### 2) Deliver
Questions:
- Which item?
- To what location / NPC?
- Must item remain intact (not consumed)?
- Deadline or no deadline?

Condition template:
- "Reach destination while carrying X."

### 3) Travel
Questions:
- Which location?
- Is one-time visit enough?
- Must route include checkpoints?

Condition template:
- "Enter location X."

### 4) Barter
Questions:
- Which trader/NPC type?
- Exchange requirement (any deal / specific deal)?
- Required output item?

Condition template:
- "Complete barter and obtain X."

### 5) Scout (creative extension)
Questions:
- Which zone?
- What evidence/object must be inspected?
- One scan or multiple points?

Condition template:
- "Complete scouting investigation at X."

## Generation Pipeline
1. Create main quest root with narrative framing text.
2. Roll top-level branch count (1..3).
3. For each branch:
   - Decide composite vs elementary by depth-sensitive probability.
   - If composite: recurse, generate 2..3 children.
   - If leaf: roll objective family and fill parameter slots.
4. Build human-readable condition strings.
5. Render full tree in intro modal and quests panel.

## Tuning Rules
- Keep text concise but explicit.
- Favor mixed objective families for variety.
- Avoid too many leaves with identical type in one branch.
- If future telemetry appears, tune probabilities by completion rates.

## Future Expansion Ideas
- Specific named targets (boss IDs).
- Optional tasks that grant bonuses but are not required for completion.
- Logical operators for composite nodes (ALL / ANY / N-of-M).
- World-state reactive generation (biome, player build, encountered factions).
