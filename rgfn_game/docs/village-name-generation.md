# Village Name Generation (RGFN)

## Why this exists

Village names were previously generated from only 10 prefixes x 10 suffixes (`100` total combinations), which led to frequent repeats in medium/large worlds.

This document explains the newer generator and the constraints we keep for gameplay consistency.

## Goals

- Keep names deterministic for world coordinates + world seed.
- Dramatically increase combinatorial variety without external APIs.
- Keep names readable and "settlement-like" (not random noise strings).
- Reuse pattern-based generation style already used in quest/item/NPC naming systems.

## Generator design

Implementation file:
- `js/systems/world/VillageNameGenerator.ts`

### Building blocks

`VillageNameGenerator` uses:

- **Template patterns** (token sequences):
  - `PREFIX + STEM + SUFFIX`
  - `PREFIX + STEM + STEM + SUFFIX`
  - `PREFIX + STEM + LINK + SUFFIX`
  - `STEM + SUFFIX`
  - and other variants.
- **Large token dictionaries**:
  - `PREFIX` (terrain/cultural starts like `ash`, `oak`, `raven`, `storm`, ...)
  - `STEM` (toponymic cores like `brook`, `crest`, `haven`, `ridge`, ...)
  - `SUFFIX` (settlement endings like `ford`, `meadow`, `ward`, `wich`, ...)
  - `LINK` (`-` and `'`) for rare stylistic compounds.

### Determinism model

- World map calls generator with a **hashed coordinate seed**:
  - `hashSeed((col+11)*..., (row+17)*..., 14057)`
- Same world seed + same coordinates => same village name forever.
- Different world seed can produce different naming distribution.

### Formatting rules

- Capitalize each lexical part.
- If previous piece ends with `-` or `'`, next piece is appended directly with capitalized start.
- Rarely insert a space between first and remaining chunks for extra variety while keeping readability.

## Runtime integration

- `WorldMap.getVillageName(...)` now delegates to `generateVillageName(seed)`.
- `VillageLifeRenderer` fallback random name generation also uses `generateVillageName(...)` to keep naming style consistent if village name is absent.

## Test strategy

- Added world map regression test proving larger effective name space:
  - Sample 225 coordinate-based names (15x15 area).
  - Assert more than 100 unique names.
- This intentionally guards against accidental rollback to tiny two-list concatenation.

## Future extension ideas

- Biome-aware weighting (e.g., desert villages avoid `brook/ford` tokens).
- Culture packs for region-specific phonetics.
- Reserved-name collision avoidance for story-critical settlements.
