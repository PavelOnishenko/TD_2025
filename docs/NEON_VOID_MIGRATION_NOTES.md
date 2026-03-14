# Neon Void TypeScript Migration Notes

## Runtime compatibility checklist (important)

When converting a module from `*.js` to `*.ts`, always complete this checklist in the same PR:

1. **Reference audit**
   - Run: `rg "<moduleName>\\.js" -n js test`
   - Update or provide compatibility for **all** remaining JS imports.

2. **Runtime path verification**
   - Verify source-runtime imports still resolve (legacy JS entrypoints/tests).
   - Verify built-runtime imports resolve (`npm run build`, then run the affected flow).

3. **Compatibility bridge if mixed JS/TS remains**
   - If non-migrated JS files still import the old path, keep a JS-compatible runtime file at that path
     (or migrate all importers in the same change).

4. **Validation**
   - `npm run build`
   - Targeted grep check for stale references.

## Why this note exists

A previous migration removed `js/config/*.js` while many JS modules and tests still imported `config/*.js`,
causing runtime module resolution errors. This checklist prevents that regression.
