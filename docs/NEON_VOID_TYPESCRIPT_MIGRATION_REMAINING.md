# Neon Void TypeScript Migration Remaining Work

## Current reality

- TypeScript builds from `js/` into `dist/` with `npm run build`.
- The browser starts from `index.html` -> `dist/main.js`.
- Neon Void tests build first and import runtime modules from `dist/**/*.js`.
- There are no source runtime `.js` files left under `js/`.
- `tsconfig.json` still uses `noCheck: true` as a temporary emit-first bridge.
- Neon Void scoped lint is not clean yet; legacy large-file/function debt is now visible in TypeScript.

## End state

- TypeScript source lives under `js/`.
- Browser runtime loads compiled JavaScript from `dist/`.
- Neon Void tests build first and import compiled modules from `dist/`.
- Source `.js` siblings have been removed after all valid imports moved to compiled output.
- Engine JavaScript remains outside this migration unless a later task explicitly migrates the engine.
- `noCheck` is removed, `npm run build` performs real checking, and `npx eslint js --ext .ts` is clean.

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

## Remaining TS hardening plan

### Current checkpoint

| Field | Status |
| --- | --- |
| Objective | Remove the emit-first bridge, restore real TypeScript checking, and make Neon Void scoped lint clean. |
| Active pass | Pass 2: highest lint-error files. `render.ts` projectile extraction subpass is complete; continue with the remaining render helpers before moving to `ui.ts`. |
| Completed files | Pass 0 doc checkpoint done. Pass 1 added shared types in `js/types/config.ts`, `js/types/runtime.ts`, `js/global.d.ts`, and `js/howler.d.ts`. Pass 2 started by extracting projectile rendering from `js/core/render.ts` into `js/core/renderProjectiles.ts`. |
| Next files | Continue `js/core/render.ts`: split base/grid/energy popup/merge helpers into nearby render modules, then run validation before starting `js/systems/ui.ts`. |
| Latest commands/results | 2026-06-19 Pass 2 render projectile subpass: `npm run build` passed; `npm run test:neon` passed 180/180; scoped `npx eslint js/core/render.ts js/core/renderProjectiles.ts --format stylish` failed with 7 errors / 24 warnings, all 7 errors still in `render.ts`; full `npx eslint js --ext .ts --format json` reported 75 errors / 442 warnings. |
| Known blockers | `tsconfig.json` has `noCheck: true`; `ui.ts`, remaining `render.ts` helpers, `Game.ts`, and `tutorial.ts` need conservative splits and typed state slices before it can be removed. |

### Passes

1. **Pass 0: Documentation checkpoint**
   - Keep this table current before and after every long pass.
   - Record build/test/lint status and the exact next files before stopping.

2. **Pass 1: Shared types foundation**
   - Add shared runtime/config/game slice types under `js/types/`.
   - Type global browser, CrazyGames, Howler, canvas, and DOM shims in declaration files.
   - Do not refactor gameplay behavior in this pass.

3. **Pass 2: Highest lint-error files**
   - Clean `ui.ts`, `render.ts`, `Game.ts`, and `tutorial.ts` in small subpasses.
   - Split oversized logic into nearby modules while preserving public exports.
   - Run `npm run build`, `npm run test:neon`, and `npx eslint js --ext .ts` after each subpass.

4. **Pass 3: Remaining error files**
   - Clean portal, Tower, projectiles, developer editor, balance/hud/simple-save/game systems.
   - Prefer small extractions and typed adapters over architecture redesign.

5. **Pass 4: Warning-only cleanup**
   - Fix Rule 17 formatting, arrow-style warnings, unused imports, curly warnings, and warning-range functions.
   - Stop when `npx eslint js --ext .ts` is clean.

6. **Pass 5: Remove emit-first bridge**
   - Remove `noCheck` from `tsconfig.json`.
   - Fix real TypeScript errors until `npm run build` passes.
   - Keep `strict: false`; strict-mode migration is separate.

### Resumption rule

If work pauses or limits run out, resume from the `Active pass` and `Next files` rows above. Do not start a new file group until the previous group has an updated command/result entry.

## Deletion rule

Do not delete a source `.js` file only because a `.ts` file exists beside it. Delete source `.js` files only when:

- `npm run build` emits the compiled `dist/` module.
- Browser and tests no longer import the source `js/` path.
- A stale import grep confirms no runtime dependency remains.
- The file is not an intentional non-TypeScript runtime file.
