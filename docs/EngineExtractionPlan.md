# Iterative Engine Extraction & Beat'em Up Prototype Plan

## Project Overview

**Goals:**
1. Extract reusable engine code from Neon Void into a shared `engine/` folder
2. Create a side-scrolling beat'em up prototype using the extracted engine
3. Refactor Neon Void to use the extracted engine
4. Ensure all code follows existing style guide rules

**Approach:** Iterative, step-by-step extraction and development. Each iteration delivers working functionality.

**Project Structure:**
```
TD_2025/
├── engine/              # NEW: Shared engine code
│   ├── core/
│   ├── systems/
│   └── utils/
├── neon-void/           # Refactored TD game
│   ├── index.html
│   ├── style.css
│   ├── js/
│   └── assets/
├── beatemup/            # NEW: Beat'em up prototype
│   ├── index.html
│   ├── style.css
│   ├── js/
│   └── assets/
└── docs/                # Existing docs, style guides
```

---

## Code Style Compliance Requirements

**Every file must follow (from docs/Style_Guide.txt):**
- ✅ Max 170 characters per line
- ✅ Named functions max 20 lines
- ✅ Files max 200 lines (exception for core systems if needed)
- ✅ 4-space indentation (strict)
- ✅ DRY: Extract method when code repeated 3+ times
- ✅ Variable reuse: Create variable if evaluated 2+ times
- ✅ Meaningful names
- ✅ Self-documenting code, minimal comments
- ✅ No one-liner if statements
- ✅ Max 10 files per directory
- ✅ Testable code
- ✅ ES6 modules throughout

**Mandatory for new features:**
- Localization in `assets/locales/en.json` and `ru.json`
- Tests using Node.js test runner
- Run `npm test` after changes

---

## ITERATION 1: Minimal Viable Engine (Week 1)

**Goal:** Extract core rendering and viewport systems. Get a basic beat'em up player character on screen.

### 1.1 Extract Core Rendering System

**Files to Extract:**
- `js/systems/viewportManager.js` → `engine/systems/ViewportManager.js`
- Create `engine/core/Renderer.js` (extracted from `js/core/render.js`)

**New Engine Files:**

**`engine/core/Renderer.js`** (~150 lines)
- Extract generic canvas rendering logic from `js/core/render.js`
- Remove game-specific drawing (towers, enemies, portal, base)
- Keep:
  - Canvas setup and clearing
  - Viewport transform management
  - Layer-based rendering system
  - Screen shake effect
  - Generic particle rendering
  - Depth sorting for entities
- API:
  ```javascript
  class Renderer {
      constructor(canvas)
      setViewport(viewportManager)
      clear()
      shake(intensity, duration)
      drawLayer(layerName, drawCallback)
      drawEntities(entities, sortByDepth = true)
      drawParticles(particles)
  }
  ```

**`engine/systems/ViewportManager.js`**
- Copy existing `js/systems/viewportManager.js` with minimal changes
- Already clean and reusable
- Ensure it's framework-agnostic

**`engine/utils/MathUtils.js`** (~50 lines)
- Extract math utilities from various files
- Functions: clamp, lerp, distance, angleBetween, randomRange, etc.

### 1.2 Create Base Entity System

**`engine/core/Entity.js`** (~100 lines)
```javascript
// Base class for all game objects
export default class Entity {
    constructor(x, y) {
        this.x = x
        this.y = y
        this.width = 32
        this.height = 32
        this.velocityX = 0
        this.velocityY = 0
        this.active = true
        this.id = Entity.generateId()
    }

    update(deltaTime) {
        // Override in subclasses
    }

    draw(ctx, viewport) {
        // Override in subclasses
    }

    move(deltaTime) {
        this.x += this.velocityX * deltaTime
        this.y += this.velocityY * deltaTime
    }

    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height / 2,
            bottom: this.y + this.height / 2
        }
    }

    checkCollision(other) {
        const a = this.getBounds()
        const b = other.getBounds()
        return !(a.right < b.left || a.left > b.right ||
                 a.bottom < b.top || a.top > b.bottom)
    }
}
```

**`engine/core/GameLoop.js`** (~120 lines)
- Extract game loop logic from `js/core/Game.js`
- Delta time calculation
- Pause/resume functionality
- Time scale support
- requestAnimationFrame management
- API:
  ```javascript
  class GameLoop {
      constructor(updateCallback, renderCallback)
      start()
      stop()
      pause(reason)
      resume()
      setTimeScale(scale)
  }
  ```

### 1.3 Create Input System

**`engine/systems/InputManager.js`** (~180 lines)
- NEW: Keyboard and gamepad input handling
- Extract canvas interaction patterns from `js/systems/ui.js`
- Features:
  - Keyboard key state tracking
  - Gamepad support
  - Input mapping (configurable controls)
  - Action-based input (jump, attack, move)
- API:
  ```javascript
  class InputManager {
      constructor()
      update() // Call each frame
      isKeyDown(key)
      isActionActive(actionName)
      mapAction(actionName, keys)
      getAxis(axisName) // -1 to 1 for movement
  }
  ```

### 1.4 Refactor Neon Void (Iteration 1)

**Modify:**

**`neon-void/js/core/render.js`**
- Import and use `engine/core/Renderer.js` as base
- Keep game-specific drawing functions
- Delegate generic operations to Renderer
- Should reduce from 1118 → ~400 lines

**`neon-void/js/core/Game.js`**
- Import and use `engine/core/GameLoop.js`
- Composition over inheritance
- Should reduce from 979 → ~600 lines

**`neon-void/index.html`**
- Update script imports to reference engine modules

### 1.5 Create Beat'em Up Prototype (Iteration 1)

**New Game Files:**

**`beatemup/index.html`** (~80 lines)
- Simple HTML structure with canvas
- Import engine modules
- Import game modules

**`beatemup/style.css`** (~50 lines)
- Basic styling for canvas and UI

**`beatemup/js/main.js`** (~60 lines)
- Initialize engine systems
- Create game instance
- Start game loop

**`beatemup/js/Game.js`** (~150 lines)
- Main game state manager
- Use engine's GameLoop
- Use engine's Renderer
- Manage player, enemies, level
- Handle collisions

**`beatemup/js/entities/Player.js`** (~180 lines)
- Extends `engine/core/Entity.js`
- Side-scrolling movement (left/right, up/down within lanes)
- Basic sprite rendering (colored rectangle for now)
- Input-driven movement
- Health system
- Animation states (idle, walk, punch)

**`beatemup/js/entities/Enemy.js`** (~120 lines)
- Extends `engine/core/Entity.js`
- Simple AI (move toward player)
- Basic collision
- Health system

**`beatemup/assets/locales/en.json`** & **`ru.json`**
- Basic UI strings (Score, Health, Level)

### 1.6 Testing (Iteration 1)

**New Test Files:**
- `test/engine/core/Entity.test.js` - Test entity base class
- `test/engine/systems/InputManager.test.js` - Test input handling
- `test/engine/core/GameLoop.test.js` - Test game loop
- `test/beatemup/entities/Player.test.js` - Test player movement

**Validation:**
- ✅ npm test passes
- ✅ Neon Void still works correctly
- ✅ Beat'em up shows player character that moves with keyboard
- ✅ All files follow style guide (run manual check)

---

## ITERATION 2: Combat & Effects (Week 2)

**Goal:** Add combat system, particle effects, and audio.

### 2.1 Extract Effects System

**Files to Extract:**
- `js/systems/effects.js` → `engine/systems/ParticleSystem.js`
- Extract generic particle logic, remove game-specific effects
- Keep particle pool, update loop, generic emitters

**`engine/systems/ParticleSystem.js`** (~150 lines)
- Generic particle emitter
- Particle pool for performance
- Configurable particle properties
- Integration with Renderer

### 2.2 Extract Audio System

**Files to Extract:**
- `js/systems/audio.js` → `engine/systems/AudioManager.js`
- Already fairly generic Howler.js wrapper
- Add sound categories (music, sfx, voice)
- Volume controls per category

### 2.3 Extract Asset Loading

**Files to Extract:**
- `js/systems/assets.js` → `engine/systems/AssetLoader.js`
- Generic image/sound loading
- Progress tracking
- Asset registry

### 2.4 Add Combat to Beat'em Up

**`beatemup/js/systems/CombatSystem.js`** (~180 lines)
- Hit detection
- Damage calculation
- Knockback physics
- Attack combos
- Enemy stagger/hitstun

**Update `beatemup/js/entities/Player.js`:**
- Add punch attack
- Attack animation
- Hit box during attack
- Combo tracking

**Update `beatemup/js/entities/Enemy.js`:**
- Add attack capability
- Take damage
- Death animation
- Drop energy/points

**`beatemup/assets/`:**
- Add placeholder sprite images
- Add punch/hit sound effects
- Add background music

### 2.5 Refactor Neon Void (Iteration 2)

**Modify:**
- `neon-void/js/systems/effects.js` - Use `engine/systems/ParticleSystem.js`
- `neon-void/js/systems/audio.js` - Use `engine/systems/AudioManager.js`
- `neon-void/js/systems/assets.js` - Use `engine/systems/AssetLoader.js`

### 2.6 Testing (Iteration 2)

- Test particle system
- Test audio manager
- Test combat hit detection
- Validate both games work

---

## ITERATION 3: Advanced Features (Week 3)

**Goal:** Add waves/levels, UI system, data persistence.

### 3.1 Extract UI & Localization

**Files to Extract:**
- `js/systems/localization.js` → `engine/systems/I18n.js`
- `js/systems/dataStore.js` → `engine/systems/DataStore.js`
- Create `engine/systems/UIManager.js` (extract patterns from `js/systems/ui.js`)

**`engine/systems/UIManager.js`** (~180 lines)
- DOM element binding
- Event handling
- HUD update utilities
- Modal/overlay management

### 3.2 Add Wave System to Beat'em Up

**`beatemup/js/systems/WaveManager.js`** (~150 lines)
- Wave definitions
- Enemy spawning
- Wave progression
- Difficulty scaling

**`beatemup/js/systems/LevelManager.js`** (~120 lines)
- Level backgrounds
- Scrolling logic
- Level boundaries
- Boss encounters

### 3.3 Add UI to Beat'em Up

**Update `beatemup/index.html`:**
- Add HUD elements (health bar, score, wave)
- Add modals (start, pause, game over)

**`beatemup/js/systems/HUD.js`** (~100 lines)
- Update health display
- Update score
- Show wave number
- Visual feedback effects

### 3.4 Refactor Neon Void (Iteration 3)

**Modify:**
- `neon-void/js/systems/localization.js` - Use `engine/systems/I18n.js`
- `neon-void/js/systems/dataStore.js` - Use `engine/systems/DataStore.js`
- `neon-void/js/systems/ui.js` - Use `engine/systems/UIManager.js` utilities

### 3.5 Testing (Iteration 3)

- Test wave system
- Test UI bindings
- Test save/load
- Test localization
- Validate both games

---

## ITERATION 4: Polish & Advanced Systems (Week 4+)

**Goal:** Animation system, advanced AI, mobile support, platform integration.

### 4.1 Create Animation System

**`engine/systems/AnimationManager.js`** (~150 lines)
- Sprite sheet support
- Frame-based animation
- Animation state machine
- Blend between animations

### 4.2 Mobile & Touch Support

**`engine/systems/TouchManager.js`** (~120 lines)
- Touch event handling
- Virtual joystick
- Gesture recognition
- Integrates with InputManager

### 4.3 Advanced Features

**Optional extractions:**
- Grid system (if beat'em up needs it)
- Platform integration (CrazyGames SDK wrapper)
- Developer tools (position editor, diagnostics)
- Tutorial system framework

### 4.4 Performance & Optimization

- Object pooling utilities
- Spatial hashing for collision detection
- Canvas optimization helpers
- Profile and optimize both games

---

## Development Workflow (Per Iteration)

### Step 1: Extract Engine Code
1. Identify source files in Neon Void
2. Create new engine file
3. Extract generic logic
4. Remove game-specific code
5. Create clean API
6. Follow style guide (max 200 lines, 20 line functions, etc.)
7. Add JSDoc comments for API

### Step 2: Write Tests
1. Create test file in `test/engine/`
2. Cover main scenarios
3. Cover branches and edge cases
4. Run `npm test` and verify pass

### Step 3: Refactor Neon Void
1. Update imports to use engine modules
2. Remove duplicated code
3. Ensure game still works
4. Run `npm test` for Neon Void
5. Manual playtesting

### Step 4: Build Beat'em Up Feature
1. Import engine modules
2. Create game-specific code
3. Follow style guide
4. Add localization strings
5. Test functionality

### Step 5: Validate Iteration
1. Both games run correctly
2. All tests pass
3. Style guide compliance
4. No regressions
5. Commit changes with descriptive message

---

## Critical Files by Iteration

### Iteration 1:
**Engine (New):**
- `engine/core/Renderer.js`
- `engine/core/Entity.js`
- `engine/core/GameLoop.js`
- `engine/systems/ViewportManager.js`
- `engine/systems/InputManager.js`
- `engine/utils/MathUtils.js`

**Neon Void (Modified):**
- `neon-void/js/core/render.js`
- `neon-void/js/core/Game.js`
- `neon-void/index.html`

**Beat'em Up (New):**
- `beatemup/index.html`
- `beatemup/style.css`
- `beatemup/js/main.js`
- `beatemup/js/Game.js`
- `beatemup/js/entities/Player.js`
- `beatemup/js/entities/Enemy.js`

### Iteration 2:
**Engine (New):**
- `engine/systems/ParticleSystem.js`
- `engine/systems/AudioManager.js`
- `engine/systems/AssetLoader.js`

**Neon Void (Modified):**
- `neon-void/js/systems/effects.js`
- `neon-void/js/systems/audio.js`
- `neon-void/js/systems/assets.js`

**Beat'em Up (Modified/New):**
- `beatemup/js/systems/CombatSystem.js`
- `beatemup/js/entities/Player.js` (updated)
- `beatemup/js/entities/Enemy.js` (updated)

### Iteration 3:
**Engine (New):**
- `engine/systems/I18n.js`
- `engine/systems/DataStore.js`
- `engine/systems/UIManager.js`

**Beat'em Up (New):**
- `beatemup/js/systems/WaveManager.js`
- `beatemup/js/systems/LevelManager.js`
- `beatemup/js/systems/HUD.js`

---

## Style Guide Compliance Checklist

**After each file creation/modification:**
- [ ] Max 170 characters per line
- [ ] Named functions ≤ 20 lines (extract if longer)
- [ ] File ≤ 200 lines (split if longer, except core systems)
- [ ] 4-space indentation (no tabs)
- [ ] No code duplication (DRY principle)
- [ ] Meaningful variable/function names
- [ ] No one-liner if statements
- [ ] Self-documenting code
- [ ] Localization for user-facing text
- [ ] Tests written and passing
- [ ] No more than 10 files per directory

**Refactoring Guidelines:**
- Extract methods when functions exceed 20 lines
- Split files when they exceed 200 lines
- Create subdirectories when folders have >10 items
- Use composition over inheritance
- Keep functions focused on single responsibility

---

## Risk Mitigation

**Potential Issues:**

1. **Breaking Neon Void during refactoring**
   - Solution: Test after each change, commit frequently
   - Keep old code until engine version proven

2. **Over-engineering the engine**
   - Solution: Only extract what's needed for current iteration
   - YAGNI principle - don't add features for hypothetical future

3. **Style guide violations**
   - Solution: Check after each file creation
   - Use automated script to check line lengths, function lengths

4. **Import path complexity**
   - Solution: Use clear relative paths
   - Consider path aliases if needed (though adds build complexity)

5. **Code duplication between games**
   - Solution: Extract shared logic immediately when noticed
   - Regular refactoring passes

---

## Success Criteria

**After Iteration 1:**
- ✅ Beat'em up shows a moving player character
- ✅ Neon Void works identically to before
- ✅ Engine has 6 core modules (only what's needed)
- ✅ All code follows style guide
- ✅ Tests pass

**After Iteration 2:**
- ✅ Beat'em up has working combat
- ✅ Particle effects and audio work
- ✅ Both games use shared engine code
- ✅ No code duplication

**After Iteration 3:**
- ✅ Beat'em up has waves/levels
- ✅ Complete UI system
- ✅ Save/load functionality
- ✅ Localization working

**After Iteration 4:**
- ✅ Polished beat'em up prototype
- ✅ Comprehensive engine library
- ✅ Neon Void fully refactored
- ✅ All code style compliant
- ✅ Reusable for future projects

---

## Next Steps

1. **Review this plan** - Confirm iteration scope and priorities
2. **Start Iteration 1** - Extract minimal viable engine
3. **Validate** - Ensure both games work after each change
4. **Iterate** - Move to next phase only when current is complete
5. **Document** - Keep engine API docs updated

This plan is flexible - we can adjust iteration scope based on what we learn during implementation.
