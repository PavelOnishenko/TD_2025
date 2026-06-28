# Neon Void TypeScript Migration Remaining Work

## Current reality

- TypeScript builds from `js/` into `dist/` with `npm run build`.
- The browser starts from `index.html` -> `dist/main.js`.
- Neon Void tests build first and import runtime modules from `dist/**/*.js`.
- There are no source runtime `.js` files left under `js/`.
- `tsconfig.json` no longer uses the temporary `noCheck` emit-first bridge.
- Neon Void scoped lint has 0 errors; legacy warning debt remains visible in TypeScript.

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

- Reduce warning-only style debt, especially long files/functions, Rule 17 formatting, curly warnings, and arrow-style warnings.
- Replace migration bridge `any` annotations with narrower shared runtime types in later focused passes.
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
| Objective | Keep Neon Void on real TypeScript checking and finish warning-only lint hardening. |
| Active pass | Pass 4: warning-only cleanup. Pass 2 lint errors are fixed and Pass 5 `noCheck` removal is complete. |
| Completed files | Pass 0 doc checkpoint done. Pass 1 added shared types in `js/types/config.ts`, `js/types/runtime.ts`, `js/global.d.ts`, and `js/howler.d.ts`. Pass 2 extracted render helpers into `js/core/renderBase.ts`, `js/core/renderGrid.ts`, `js/core/renderOverlays.ts`, and `js/core/renderProjectiles.ts`; the render cluster has 0 lint errors. UI helper modules now live under `js/systems/ui/`: diagnostics in `uiDiagnostics.ts`, HUD element/tutorial-target binding in `uiHud.ts`, button/restart handling in `uiButtons.ts`, canvas interaction helpers in `uiCanvas.ts`, `uiCanvasGeometry.ts`, and `uiCanvasPlacement.ts`, pause handling in `uiPause.ts`, leaderboard handling in `uiLeaderboard.ts`, and HUD rendering in `uiHudRender.ts`; the touched UI cluster has 0 lint errors. The last lint-error functions were split/typed in `js/systems/tutorial.ts`, `js/systems/developerPositionEditor.ts`, and `js/core/projectiles.ts`. TypeScript bridge annotations were added where legacy dynamic modules still need later precise typing. |
| Next files | Warning-only cleanup: start with the highest-warning files reported by full lint (`Game.ts`, `tutorial.ts`, `portal.ts`, `projectiles.ts`, `developerPositionEditor.ts`, `assets.ts`, and UI/system modules). Keep subpasses small and run build, targeted tests, and touched-file lint after each. |
| Latest commands/results | 2026-06-28 hardening pass: removed `noCheck` from `tsconfig.json`; `npm run build` passed with real TypeScript checking; targeted `node --test test/tutorial.test.js test/game/projectiles.test.js test/systems/simpleSaveSystem.test.js` passed 22/22; targeted `node --test test/assets.test.js test/audio.test.js test/crazyGamesIntegration.test.js test/viewportManager.test.js test/game/audioSettings.test.js test/hudTutorialOverlay.test.js` passed 23/23; touched-file lint reported 0 errors; `npm run test:neon` passed 180/180; full `npx eslint js --ext .ts --format json` reports 0 errors / 327 warnings across 51 warning files. |
| Known blockers | No current build, test, or lint-error blocker. Remaining work is warning debt and replacing migration bridge `any` types with narrower contracts. |

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
