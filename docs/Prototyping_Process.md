# Game Prototyping Process

## Overview
This document describes our methodology for rapidly prototyping new games in this repository by leveraging our reusable engine components.

## Prototyping Methodology

### 1. Define Prototype Goal
Start with a clear, minimal prototype goal. Define:
- Core gameplay mechanic
- Minimal feature set (MVP)
- Essential stats/systems only
- What makes this prototype unique

**Example (RGFN):**
- Turn-based RPG combat
- Two maps: world exploration + battle
- Minimal stats: HP, Damage
- Random encounters with skeleton enemies

### 2. Analyze Existing Code
Review existing games to identify reusable patterns and systems:

**Current Games:**
- **Neon Void** (`js/`) - Tower defense game with grid, enemies, projectiles (ROOT game, ready for release)
- **Eva Game** (`eva_game/`) - Beat-em-up with player, enemies, real-time combat

**Engine Components** (`engine/`):
- `core/Entity.js` - Base entity with position, velocity, collision
- `core/GameLoop.js` - Update/render loop with pause, time scale
- `core/Renderer.js` - Canvas rendering, shapes, text, screen shake
- `systems/InputManager.js` - Keyboard input with actions and axes
- `systems/ViewportManager.js` - Camera/viewport management
- `utils/MathUtils.js` - Math helpers (distance, random, lerp, clamp)

### 3. Identify Reusable Code
Determine what can be:
- **Used directly** from engine (already exists)
- **Adapted** from existing games (copy patterns)
- **Created new** for this specific prototype (stays in game folder)
- **Extract later** - Only when a SECOND game needs the same component!

#### For RGFN Analysis:

**Use Directly from Engine:**
- ✅ Entity.js - Base class for Player/Skeleton
- ✅ GameLoop.js - Core game loop
- ✅ Renderer.js - Drawing system
- ✅ InputManager.js - Keyboard controls
- ✅ MathUtils.js - randomInt() for encounters, distance() for range checks

**Adapt Patterns from eva_game:**
- Combat entities with `health`, `maxHealth`, `damage` properties
- `takeDamage(amount)` method pattern
- Health bar rendering
- Collision/range checking for attacks

**Create New for Prototype (stays in rgfn_game/):**
- GridMap - rectangular grid/tilemap (might extract later if another game needs it)
- StateMachine - game mode management (might extract later)
- Turn management system (specific to turn-based)
- Encounter system (specific to this game)
- World map and battle map (game-specific)

### 4. Build Prototype First

**IMPORTANT:** Build everything in the game folder first. Don't extract to engine yet!

```
rgfn_game/
└── js/
    ├── utils/
    │   ├── GridMap.js        ← Build here first
    │   └── StateMachine.js   ← Build here first
    └── systems/
        └── TurnManager.js    ← Game-specific
```

### 5. Extract Later (When Needed)

**Only extract when:**
- A SECOND game needs the same component
- The component is proven to work well
- You can make it truly generic

**Then:**
1. Move to engine folder
2. Remove game-specific logic
3. Update both games to import from engine
4. Test both games still work

### 6. Build With Engine

Create new game folder using EXISTING engine components:

```
new_game/
├── index.html          # Game page
├── style.css           # Styling
└── js/
    ├── main.js         # Entry point
    ├── Game.js         # Main coordinator
    ├── entities/       # Game-specific entities
    ├── systems/        # Game-specific systems
    └── utils/          # Game-specific utilities (might extract later)
```

**Import pattern:**
```javascript
// From engine (reuse)
import Entity from '../../engine/core/Entity.js';
import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import { randomInt } from '../../engine/utils/MathUtils.js';

// From game (new code)
import Player from './entities/Player.js';
import GridMap from './utils/GridMap.js';
```

### 7. Update Implementation Plan
Revise the implementation plan to:
- Reference engine components to use
- Show import statements
- Remove redundant "create from scratch" tasks
- Focus on game-specific logic

## Benefits of This Approach

1. **Faster Prototyping** - Reuse battle-tested components
2. **Consistency** - Same patterns across games
3. **Maintainability** - Bug fixes in engine benefit all games
4. **Learning** - Build up library of reusable patterns
5. **Quality** - Engine components are refined over multiple games

## Engine Component Guidelines

### What Belongs in Engine

**✅ Should Extract:**
- Generic systems used by multiple games
- Core infrastructure (rendering, input, game loop)
- Math/utility functions
- Reusable patterns (grids, state machines, particle systems)

**❌ Don't Extract:**
- Game-specific logic (wave spawning, level design)
- One-off features (specific enemy behaviors)
- Content (sprites, sounds, levels)
- Highly coupled UI (game-specific HUD)

### Engine Organization

```
engine/
├── core/           # Core systems (Entity, GameLoop, Renderer)
├── systems/        # Reusable game systems (Input, Viewport, Grid, StateMachine)
└── utils/          # Helper functions (Math, Array, String utilities)
```

## Example: RGFN Component Plan

### Use From Engine (Already Exists)

- `Entity.js` - Base for Player and Skeleton
- `GameLoop.js` - Core update/render loop
- `Renderer.js` - All drawing operations
- `InputManager.js` - Arrow keys / WASD movement
- `MathUtils.js` - randomInt for encounters, distance for combat range

### Build in RGFN Folder (Don't Extract Yet)

**Keep these in `rgfn_game/js/` for now:**
- `utils/GridMap.js` - Grid system (might extract later if another game needs it)
- `utils/StateMachine.js` - State management (might extract later)
- `systems/TurnManager.js` - Turn-based combat (probably game-specific)
- `systems/EncounterSystem.js` - Random encounters (probably game-specific)
- `systems/BattleMap.js` - Battle map (game-specific)
- `systems/WorldMap.js` - World map (game-specific)
- `entities/Player.js` - Player (game-specific)
- `entities/Skeleton.js` - Enemy (game-specific)

## Workflow Summary

```
1. Define prototype goal
   ↓
2. Review existing games + engine
   ↓
3. Identify: [Use from engine] [Adapt patterns] [Create new]
   ↓
4. Build prototype in game folder
   ↓
5. Test and refine
   ↓
6. (LATER) Extract to engine when a 2nd game needs it
   ↓
7. Update documentation
```

## When to Extract to Engine

**Wait until:**
- ✅ A SECOND game needs the same component
- ✅ The component works well in the first game
- ✅ You can make it truly generic (no game-specific logic)

**Then:**
1. Move component to engine folder
2. Remove game-specific code, add configuration
3. Update BOTH games to import from engine
4. Test both games work correctly
5. Document the engine component

**Don't Extract:**
- Components used by only ONE game
- Game-specific logic
- Unproven/experimental code

## Future Improvements

As we build more prototypes, we'll identify additional reusable patterns:

**Potential Future Engine Components:**
- Particle system
- Animation system
- Audio manager
- Tilemap renderer
- Pathfinding
- Save/load system
- UI components (buttons, panels, menus)
- Sprite management
- Scene/level system

Each prototype teaches us what's truly reusable vs. game-specific.
