# Engine UI Styles

Shared CSS styles used across multiple games in the TD_2025 project.

## Files

### `base.css`
Core CSS reset and base styles used by all games:
- CSS reset (margin, padding, box-sizing)
- HTML/body base layout
- `.hidden` utility class
- Focus styles for accessibility

### `overlay.css`
Overlay system used by Eva Game and Neon Void:
- `.overlay` - Fullscreen overlay container
- `.overlay-content` - Centered content box
- Base styling for headings and paragraphs

### `buttons.css`
Common button styles:
- Default button appearance
- Hover, active, and disabled states
- Transition effects

### `canvas.css`
Basic canvas element styles:
- Display properties for canvas elements

## Usage

Import these files **before** your game-specific CSS:

```html
<link rel="stylesheet" href="../engine/ui/styles/base.css">
<link rel="stylesheet" href="../engine/ui/styles/overlay.css">
<link rel="stylesheet" href="../engine/ui/styles/buttons.css">
<link rel="stylesheet" href="../engine/ui/styles/canvas.css">
<link rel="stylesheet" href="style.css">
```

## Games Using These Styles

- **Neon Void** (`/index.html`) - Uses base.css and canvas.css
- **Eva Game** (`/eva_game`) - Uses all files
- **RGFN Game** (`/rgfn_game`) - Uses base.css and canvas.css

## Customization

Each game can override these base styles by defining more specific rules in their own `style.css` file.

## Statistics

- Total engine CSS: 94 lines
- Reduced duplication: ~70 lines across all games
