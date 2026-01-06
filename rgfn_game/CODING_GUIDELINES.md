# RGFN Coding Guidelines

## Core Principle: Everything Must Be Themable

**The fundamental rule of RGFN development is that ALL visual elements in the game MUST be themable.**

This means:
- Every color used in the game must come from the theme system
- Every new UI element must support all existing themes
- Every new feature must be tested with different themes
- No hardcoded colors in CSS, TypeScript, or JavaScript files

## Theme System Architecture

### Theme Configuration

All themes are defined in `/js/config/ThemeConfig.ts`. The theme structure includes:

```typescript
interface Theme {
  name: string;
  ui: {
    primaryBg: string;        // Main background color
    secondaryBg: string;      // Secondary background
    canvasBg: string;         // Canvas background
    primaryAccent: string;    // Primary accent color
    secondaryAccent: string;  // Secondary accent color
    enemyColor: string;       // Enemy-related colors
    warningColor: string;     // Warnings and alerts
    disabledColor: string;    // Disabled UI elements
    systemMessageColor: string; // System messages
  };
  entities: {
    player: { /* ... */ };
    skeleton: { /* ... */ };
  };
  worldMap: {
    background: string;
    terrain: { /* ... */ };
    gridLines: string;
    playerMarker: string;
  };
  battleMap: {
    background: string;
    tileDark: string;
    tileLight: string;
    currentEntityPlayer: string;
    currentEntityEnemy: string;
    selectedEnemy: string;
    gridBorders: string;
  };
}
```

### Using Themes in TypeScript/JavaScript

**Always access theme colors through the ThemeManager:**

```typescript
import { themeManager } from '../config/ThemeConfig.js';

// Get current theme
const theme = themeManager.getTheme();

// Use theme colors
ctx.fillStyle = theme.ui.primaryAccent;
element.style.color = theme.battleMap.selectedEnemy;
```

**NEVER hardcode colors:**

```typescript
// ❌ WRONG - Hardcoded color
ctx.fillStyle = '#FF0000';
element.style.backgroundColor = 'blue';

// ✅ CORRECT - Using theme
ctx.fillStyle = theme.ui.enemyColor;
element.style.backgroundColor = theme.ui.primaryBg;
```

### Using Themes in CSS

**Always use CSS variables defined by the theme system:**

```css
/* ✅ CORRECT - Using CSS variables */
.my-element {
  background-color: var(--color-primary-bg);
  border-color: var(--color-primary-accent);
  color: var(--color-secondary-accent);
}

/* ❌ WRONG - Hardcoded colors */
.my-element {
  background-color: #1a1a2e;
  border-color: #0f3460;
  color: #e94560;
}
```

**Available CSS Variables:**

- `--color-primary-bg`
- `--color-secondary-bg`
- `--color-canvas-bg`
- `--color-primary-accent`
- `--color-secondary-accent`
- `--color-enemy`
- `--color-warning`
- `--color-disabled`
- `--color-system-message`

These variables are automatically updated when the user changes themes.

## Adding New Features - Checklist

When adding any new feature to RGFN, follow this checklist:

### 1. Plan Your Theme Integration

Before writing code, ask yourself:
- What colors does this feature need?
- Do existing theme properties cover these colors?
- Do I need to add new theme properties?

### 2. Add Theme Properties (if needed)

If your feature needs new colors:

1. Add properties to the `Theme` interface in `/js/config/ThemeConfig.ts`
2. Add values for ALL existing themes
3. Add corresponding CSS variables in the `applyThemeToCSS()` method

### 3. Implement Using Theme Colors

- In TypeScript/JavaScript: Use `themeManager.getTheme()`
- In CSS: Use CSS variables (`var(--color-*)`)
- NEVER use hardcoded colors

### 4. Test With Multiple Themes

Before committing:
1. Open the Theme Editor (click "Theme Editor" button)
2. Test your feature with at least 3 different themes
3. Verify all colors change appropriately
4. Check that text remains readable in all themes
5. Ensure UI elements are visible in all themes

### 5. Document Your Changes

If you added new theme properties:
- Document them in this file
- Add comments explaining their purpose
- Update theme interfaces if needed

## Examples of Themable Features

### Example 1: Battle Splash Screen

The battle splash screen is a perfect example of themable implementation:

**TypeScript Implementation:**
```typescript
private applyThemeColors(type: 'battle-start' | 'victory' | 'defeat'): void {
    const theme = themeManager.getTheme();

    // Base colors from theme
    this.modal.style.backgroundColor = theme.ui.primaryBg;
    this.modal.style.borderColor = theme.ui.primaryAccent;

    // Type-specific colors
    if (type === 'defeat') {
        this.title.style.color = theme.ui.enemyColor;
    } else {
        this.title.style.color = theme.ui.primaryAccent;
    }
}
```

**CSS Implementation:**
```css
.battle-splash-modal {
    background-color: var(--color-primary-bg);
    border: 4px solid var(--color-primary-accent);
}

.battle-splash-title {
    color: var(--color-primary-accent);
}
```

### Example 2: Theme Editor UI

The theme editor itself demonstrates overlay patterns:

```css
.theme-editor-overlay {
    background-color: rgba(0, 0, 0, 0.85); /* Semi-transparent black is OK */
}

.theme-editor-modal {
    background-color: var(--color-primary-bg);
    border: 2px solid var(--color-primary-accent);
}
```

Note: Semi-transparent overlays can use fixed colors, but all UI elements must use theme colors.

## Common Patterns

### Pattern 1: Canvas Drawing

```typescript
draw(ctx: CanvasRenderingContext2D): void {
    const theme = themeManager.getTheme();

    // Background
    ctx.fillStyle = theme.ui.canvasBg;
    ctx.fillRect(0, 0, width, height);

    // Entity
    ctx.fillStyle = theme.entities.player.bodyColor;
    ctx.fillRect(x, y, w, h);
}
```

### Pattern 2: Dynamic UI Elements

```typescript
createButton(): HTMLButtonElement {
    const theme = themeManager.getTheme();
    const button = document.createElement('button');

    button.style.backgroundColor = theme.ui.secondaryBg;
    button.style.color = theme.ui.primaryAccent;
    button.style.borderColor = theme.ui.primaryAccent;

    return button;
}
```

### Pattern 3: Responsive to Theme Changes

When users change themes, some elements need to update:

```typescript
updateTheme(): void {
    const theme = themeManager.getTheme();
    // Reapply theme colors to existing elements
    this.applyThemeColors();
}
```

For most elements, CSS variables handle this automatically.

## Special Cases

### When Hardcoded Colors Are Acceptable

In rare cases, hardcoded colors are acceptable:

1. **Semi-transparent overlays**: `rgba(0, 0, 0, 0.85)` for modal backgrounds
2. **Pure black/white for readability**: When absolutely necessary for contrast
3. **Temporary debugging**: But must be removed before commit

### Adding New Themes

To add a new theme:

1. Copy an existing theme object in `ThemeConfig.ts`
2. Modify all color values
3. Add to the `themes` array
4. Test thoroughly with all game features

## Code Review Requirements

All pull requests must:

1. ✅ Use theme colors exclusively (except approved special cases)
2. ✅ Work correctly with all existing themes
3. ✅ Include screenshots/videos showing multiple themes
4. ✅ Update this document if adding new theme properties
5. ✅ Pass the "Theme Test Checklist" below

## Theme Test Checklist

Before submitting code, verify:

- [ ] Feature works with "Dark Neon" theme
- [ ] Feature works with "Cyberpunk" theme
- [ ] Feature works with "Forest Night" theme
- [ ] Feature works with at least one custom theme
- [ ] All text is readable in all themes
- [ ] All UI elements are visible in all themes
- [ ] No console errors when switching themes
- [ ] Animations work correctly in all themes
- [ ] No hardcoded colors (except approved cases)

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Mixing Hardcoded and Themed Colors

```typescript
// WRONG - Inconsistent color sources
ctx.fillStyle = theme.ui.primaryBg;  // Themed
ctx.strokeStyle = '#FF0000';         // Hardcoded
```

### ❌ Anti-Pattern 2: Theme Colors Only in Some States

```typescript
// WRONG - Only themed when visible
show(): void {
    const theme = themeManager.getTheme();
    this.element.style.color = theme.ui.primaryAccent;
}

hide(): void {
    this.element.style.color = 'gray'; // Hardcoded!
}
```

### ❌ Anti-Pattern 3: Skipping Theme Testing

```typescript
// WRONG - Didn't test with multiple themes
// New feature looks great in Dark Neon theme
// But text is invisible in Forest Night theme
```

## Accessibility Considerations

When using theme colors, ensure:

1. **Sufficient contrast**: Text must be readable against backgrounds
2. **Color isn't the only indicator**: Don't rely solely on color to convey information
3. **Consistent color meanings**: Use `enemyColor` for enemies, `warningColor` for warnings, etc.

## Performance Notes

The theme system is optimized for performance:

- CSS variables update instantly without reflow
- ThemeManager caches the current theme
- Theme changes are batched and applied once

Don't create custom theme caching - use the existing system.

## Questions?

If you're unsure whether your feature is properly themable:

1. Can you switch between all themes without any visual breaks?
2. Are all colors coming from the theme system?
3. Does your feature look good in all existing themes?

If you answered "yes" to all three, you're good to go!

## Summary

**Remember: In RGFN, if it's visible, it must be themable.**

This isn't just a nice-to-have - it's a core design principle that makes RGFN unique and customizable. Every player should be able to enjoy the game in their preferred color scheme, and every feature you add must respect this principle.

When in doubt, look at existing features like `BattleSplash.ts`, `ThemeEditor.ts`, or `BattleMap.ts` for reference implementations.

---

*Last Updated: 2026-01-06*
*Maintainer: RGFN Development Team*
