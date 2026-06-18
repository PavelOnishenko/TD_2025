# Neon Void TypeScript Migration Remaining Work

## Current reality

- TypeScript builds from `js/` into `dist/` with `npm run build`.
- The browser still starts from `index.html` -> `js/main.js`.
- Tests still import Neon Void runtime modules from `js/**/*.js`.
- Existing TypeScript coverage includes configs, entities, formation runtime classes, state persistence, tutorial target/progress helpers, and scaling utilities.
- Source `.js` files are still runtime assets until the entrypoint, tests, and deployment use `dist/`.

## End state

- TypeScript source lives under `js/`.
- Browser runtime loads compiled JavaScript from `dist/`.
- Neon Void tests build first and import compiled modules from `dist/`.
- Source `.js` siblings are removed after all valid imports are moved to compiled output.
- Engine JavaScript remains outside this migration unless a later task explicitly migrates the engine.

## Migration completion status

Implemented in the 2026-06-18 migration pass:

- All Neon Void runtime modules under `js/` now have TypeScript sources.
- `index.html` now loads `dist/main.js`.
- Neon Void tests now build first and import runtime modules from `dist/`.
- Source `.js` runtime files under `js/` were removed after the cutover.
- Formation edge-case tests were added for malformed ship tokens, invalid probability fallback, and empty formation definitions.
- Compatibility was preserved for legacy `spawnEnemy(type)` callers and simple projectile enemy test doubles.

Remaining hardening work:

- Remove the temporary emit-first `noCheck` compiler setting after adding proper types to the large dynamic systems.
- Refactor long migrated files to satisfy the TypeScript style rules, especially `Game.ts`, `ui.ts`, `tutorial.ts`, and `gameConfig.ts`.
- Split stateful systems into smaller typed classes where the current migration kept legacy module shape for runtime safety.

## Phase checklist

1. Done: document this remaining-work plan before code migration continues.
2. Done: finish the formation checkpoint with edge-case tests and typed wave/tank scheduling callers.
3. Done: migrate remaining core systems to TypeScript in dependency order.
4. Done: migrate support, persistence, UI, audio, asset, developer, balance, and platform systems.
5. Done: migrate effects systems to TypeScript while preserving legacy module shape.
6. Done: migrate the main `Game` controller and `main` entrypoint.
7. Done: cut over browser and tests to `dist/`.
8. Done: remove source `.js` files that now have TypeScript replacements.
9. Done: verify build, targeted Neon Void tests, and stale import grep.

## Validation commands

Run these after each implementation phase:

```bash
npm run build
node --test test/game/formations.test.js
node --test test/game/tankSchedule.test.js
```

Run the broader Neon Void suite before final cutover sign-off:

```bash
npm run test:neon
rg "\\.\\./js/|\\.\\./\\.\\./js/|js/" test index.html
```

Known lint status after the runtime migration:

```bash
npm run lint:ts
npx eslint js --ext .ts
```

Both lint commands currently fail because legacy long-file/function debt is now visible in TypeScript. Treat this as the next cleanup track, not as a runtime cutover blocker.

## Deletion rule

Do not delete a source `.js` file only because a `.ts` file exists beside it. Delete source `.js` files only when:

- `npm run build` emits the compiled `dist/` module.
- Browser and tests no longer import the source `js/` path.
- A stale import grep confirms no runtime dependency remains.
- The file is not an intentional non-TypeScript runtime file.
