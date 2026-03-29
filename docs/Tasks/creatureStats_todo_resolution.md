# Creature Stats TODO Resolution Notes

## Scope
- File updated: `rgfn_game/js/config/creatureStats.ts`.
- Goal: resolve all inline TODO markers and align formatting with Style Guide rule 17.

## What was changed
1. Removed all TODO comments from the file.
2. Converted compact object initializers/returns to single-line form where line length remains under rule 1 limits.
3. Converted two simple wrapper/formatter functions to arrow-function exports:
   - `deriveArchetypeStats`
   - `formatCreatureSkills`
4. Kept computational behavior unchanged (refactor-only, no balance formula changes).

## Rule references used
- Style Guide rule 17: prefer same-line collection/object initialization when it fits max line length.
- Style Guide rule 15: fewer lines for a statement when reasonable.
- Style Guide rule 8: remove comments when code is self-explanatory.

## Validation checklist used
- Run RGFN scoped TypeScript lint.
- Run repository tests.
- Confirm no TODO markers remain in `creatureStats.ts`.

## Reuse note for future tasks
When TODOs mention “rule 17”, prefer this decision order:
1. One-line object/collection literal if <= max line length.
2. Two-line brace wrap if one-line is too long.
3. Multi-line member split only when needed for line-length compliance.
