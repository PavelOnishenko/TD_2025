# RGFN Lint Warning Playbook

This note captures patterns used to resolve the recurring TypeScript warnings in `rgfn_game`.

## Fast command loop

```bash
npm run lint:ts:rgfn:fix
npm run lint:ts:rgfn:eslint
npm test
```

## Warning patterns and preferred fixes

### 1) `style-guide/arrow-function-style`

When a class method only performs a single return/assignment statement, prefer an arrow property.

Example:

```ts
// before
public resolveAttackTarget(enemies: Skeleton[]): Skeleton | null {
    return this.resolveRangedTarget(enemies, this.player.getAttackRange());
}

// after
public resolveAttackTarget = (enemies: Skeleton[]): Skeleton | null => this.resolveRangedTarget(enemies, this.player.getAttackRange());
```

### 2) `style-guide/rule17-comma-layout`

- If a comma-separated list/object fits inside the configured width, keep the compact one-line form.
- If an internal member line exceeds the max width, split parameters/members over multiple lines.

### 3) `max-len`

Break long signatures/ternaries/chained calls into wrapped multiline form with stable indentation.

### 4) `indent`

Keep continuation indentation consistent (especially with wrapped arrow functions and typed return blocks).

## Practical tips

- Run eslint first, then fix style-guide warnings that eslint cannot auto-fix.
- Prefer local, surgical edits to avoid changing behavior.
- For dialogue/string-heavy files, watch both `max-len` and `rule17` at once; both can trigger on the same line.

## Rule 17 batch fix notes (2026-03-31)

These concrete edits were used in the latest RGFN warning cleanup pass:

- Convert single-return class methods to arrow properties when warned by `style-guide/arrow-function-style`.
  - Example pattern: `public method(args): Type { return value; }` → `public method = (args): Type => value;`
- Collapse short object literals passed as arguments when warned by `style-guide/rule17-comma-layout`.
  - Example pattern: multiline `onContractsReady({ ... })` objects that are under line length limits.
- Collapse short parameter lists that were manually wrapped but still fit on one line.
- For genuine `max-len` warnings, wrap only the outer signature/call boundary and keep body logic untouched.

Recommended verification loop after each small batch:

```bash
npm run lint:ts:rgfn:eslint
npm run style-guide:audit:rgfn
npm test
```
