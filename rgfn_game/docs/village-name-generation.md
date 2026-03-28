# Village Name Generation (RGFN)

## Why this exists

Village names previously repeated too quickly and also drifted toward overly long stitched compounds after the first expansion pass.

The current generator balances three constraints at once:

1. **High variety** (avoid repeats on medium/large worlds),
2. **Readable length** (mostly short names),
3. **Mixed spacing style** (single-word and multi-word names both common enough).

## Target output profile

The generator is tuned so that:

- **1–2 words** are the default in most cases,
- **3-word names** are rare,
- **4-word names** are very rare,
- names with spaces are not rare (roughly frequent enough to feel natural among compact names).

Inside compact words:

- 2 stitched parts are most common,
- 3 stitched parts are rare,
- 4 stitched parts are very rare.

## Implementation

Primary file:
- `js/systems/world/VillageNameGenerator.ts`

### Pattern layer (word-count control)

`NAME_PATTERNS` uses weighted templates over token classes:

- `COMPACT`
- `DESCRIPTOR`
- `PLACE`

This controls whether output tends to be one-word or spaced multi-word (e.g., `Oakridge`, `Silver Haven`, `Red Oakford`).

### Word-construction layer (anti-bulk control)

`COMPACT` words are built from:

- `COMPACT_START`
- optional `COMPACT_MID`
- `COMPACT_END`

with weighted part-count complexity:

- 2 parts: dominant,
- 3 parts: uncommon,
- 4 parts: very rare.

Optional linkers (`''`, `-`, `'`) keep style variation without forcing giant names.

## Determinism model

- World map calls the generator via a stable coordinate hash seed.
- Same world seed + same tile coordinates => same village name.
- Save/load stability remains intact.

## Runtime integration

- `WorldMap.getVillageName(...)` delegates to `generateVillageName(seed)`.
- `VillageLifeRenderer` fallback naming path uses the same generator, so fallback village names follow identical style rules.

## Regression checks

`test/systems/worldMap.test.js` now validates:

- large effective unique name space,
- mostly 1–2 word names,
- 4-word names remain rare,
- spaced names occur often enough,
- deterministic same-coordinate behavior.

## Future extension ideas

- Biome-sensitive token weighting (e.g., fewer river words in arid zones).
- Regional culture packs with different phonetic dictionaries.
- Protected canonical names for story-critical settlements.
