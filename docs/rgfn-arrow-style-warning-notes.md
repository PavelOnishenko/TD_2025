# RGFN arrow-style warning notes

This note captures the exact lint warning pattern fixed in this change and a repeatable workflow for future fixes.

## Warning pattern

Rule: `style-guide/arrow-function-style`

Typical warning text:

- `Arrow style: '<name>' has a single return/assignment statement; prefer an arrow function when possible`

## Practical fix strategy

When a function or class method is a single-expression return/assignment:

- Convert block-bodied declarations to arrow forms.
- Prefer concise expression bodies (`=> expr`) when possible.
- For object literals, wrap in parentheses (`=> ({ ... })`).
- For class members, use class-field arrows where rule-compliant and project-compatible.

## Verification command

Run lint on the exact touched files:

```bash
npx eslint \
  rgfn_game/js/systems/world/VillageNameGenerator.ts \
  rgfn_game/js/systems/world/WorldMap.ts \
  rgfn_game/js/systems/world/WorldMapRenderer.ts \
  rgfn_game/js/ui/BattleSplashView.ts \
  rgfn_game/js/utils/GridMap.ts \
  rgfn_game/js/utils/NextCharacterRollConfig.ts
```

## Notes

- This rule can conflict with `max-len`; wrap long object literals and long expression bodies.
- `eslint --fix` helps with indentation after converting method syntax.
