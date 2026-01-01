# RGFN - Turn-Based RPG Implementation Plan

## Game Concept
A turn-based RPG inspired by Fallout 1/2 with two map systems:
- **World Map**: High-level exploration map where the player wanders
- **Battle Map**: Tactical combat map shown during encounters

## Core Features
- Turn-based combat system
- Minimal stats: HP and Damage
- Random encounters with skeleton enemies (melee only)
- Map transitions between world exploration and combat

## Technical Architecture

### Engine Components (Reuse from `engine/`)

**Core Systems:**
- `core/Entity.js` - Base entity class with position, velocity, collision
- `core/GameLoop.js` - Update/render loop with pause, time scale
- `core/Renderer.js` - Canvas rendering (shapes, text, entities, screen shake)

**Systems:**
- `systems/InputManager.js` - Keyboard input with actions/axes
- `systems/ViewportManager.js` - Camera/viewport (if needed)

**Utilities:**
- `utils/MathUtils.js` - Math helpers (distance, randomInt, clamp, lerp)

### Import Examples (Engine)
```javascript
import Entity from '../../engine/core/Entity.js';
import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import { randomInt, distance } from '../../engine/utils/MathUtils.js';
```

### Game-Specific Components (Build in `rgfn_game/js/`)

**Utilities:**
- `utils/GridMap.js` - Rectangular grid system (might extract to engine later)
- `utils/StateMachine.js` - State management (might extract to engine later)

**Systems:**
- `systems/WorldMap.js` - World exploration (uses GridMap)
- `systems/BattleMap.js` - Combat map (uses GridMap)
- `systems/TurnManager.js` - Turn-based combat flow
- `systems/EncounterSystem.js` - Random encounters

**Entities:**
- `entities/Player.js` - Player character
- `entities/Skeleton.js` - Enemy

### Folder Structure
```
rgfn_game/
├── index.html
├── style.css
├── assets/
│   └── (sprites if needed)
└── js/
    ├── main.js
    ├── Game.js (main coordinator)
    ├── entities/
    │   ├── Player.js
    │   └── Skeleton.js
    ├── systems/
    │   ├── WorldMap.js
    │   ├── BattleMap.js
    │   ├── TurnManager.js
    │   └── EncounterSystem.js
    └── utils/
        └── Constants.js
```

## Implementation Steps

### 1. Core Game Structure
**Files**: `index.html`, `style.css`, `js/main.js`, `js/Game.js`

Create the basic HTML structure with:
- Canvas for rendering
- HUD showing player stats (HP, Damage)
- Mode indicator (World Map / Battle)
- Battle UI overlay (hidden by default)

Game.js will coordinate between different game modes:
- WORLD_MAP mode
- BATTLE mode

### 2. Player Entity
**File**: `js/entities/Player.js`

Extends engine's `Entity` class.

Properties:
- `hp` (health points) - default 100
- `maxHp` - default 100
- `damage` - default 10
- `worldX`, `worldY` - position on world map
- `battleX`, `battleY` - position on battle map

Methods:
- `takeDamage(amount)` - reduce HP
- `attack(target)` - deal damage to target
- `heal(amount)` - restore HP
- `update(deltaTime)` - handle movement in current mode
- `draw(ctx, viewport)` - render player sprite

### 3. Skeleton Enemy
**File**: `js/entities/Skeleton.js`

Extends engine's `Entity` class.

Properties:
- `hp` - default 30
- `maxHp` - default 30
- `damage` - default 8
- `isMelee` - true (always melee range)

Methods:
- `takeDamage(amount)` - reduce HP
- `attack(target)` - melee attack on player
- `update(deltaTime)` - AI behavior (move toward player in battle)
- `draw(ctx, viewport)` - render skeleton sprite

### 4. World Map System
**File**: `js/systems/WorldMap.js`

**Uses:** `GridMap` from `js/utils/GridMap.js` (game-specific for now)

Handles exploration phase:

```javascript
import GridMap from '../utils/GridMap.js';

class WorldMap {
  constructor(columns, rows, cellSize) {
    this.grid = new GridMap(columns, rows, cellSize);
    // e.g., new GridMap(20, 15, 32) for 20x15 world
  }

  movePlayer(direction) {
    const [currentCol, currentRow] = this.grid.pixelToGrid(player.x, player.y);
    // Move to adjacent cell
    // Check for encounters
  }
}
```

Properties:
- `width`, `height` - map dimensions
- `tileSize` - grid cell size
- `encounterZones` - areas where encounters can trigger

Methods:
- `update(deltaTime, player, input)` - handle player movement
- `draw(ctx, viewport)` - render world map
- `checkEncounter(playerX, playerY)` - random encounter check
- `movePlayer(dx, dy)` - move player on world grid

Encounter System:
- Every move has a small chance (5-10%) to trigger encounter
- Spawn 1-3 skeletons when encounter triggers
- Transition to battle mode

### 5. Battle Map System
**File**: `js/systems/BattleMap.js`

**Uses:** `GridMap` from `js/utils/GridMap.js` (game-specific for now)

Handles tactical combat phase:

```javascript
import GridMap from '../utils/GridMap.js';
import { distance } from '../../../engine/utils/MathUtils.js';

class BattleMap {
  constructor() {
    this.grid = new GridMap(10, 8, 48); // 10x8 battle grid, 48px cells
    this.entities = [];
  }

  setup(player, enemies) {
    // Place player at bottom center
    const [playerX, playerY] = this.grid.gridToPixel(5, 7);
    player.x = playerX;
    player.y = playerY;

    // Place enemies at top
    enemies.forEach((enemy, i) => {
      const [x, y] = this.grid.gridToPixel(2 + i * 2, 1);
      enemy.x = x;
      enemy.y = y;
    });

    this.entities = [player, ...enemies];
  }

  isInMeleeRange(attacker, target) {
    const [col1, row1] = this.grid.pixelToGrid(attacker.x, attacker.y);
    const [col2, row2] = this.grid.pixelToGrid(target.x, target.y);
    return this.grid.areAdjacent(col1, row1, col2, row2); // Uses GridMap method
  }
}
```

Battle Grid:
- Small grid (10x8 tiles, 48px cells)
- Player starts at bottom center
- Enemies spawn at top positions
- Turn-based movement and combat

### 6. Turn Manager
**File**: `js/systems/TurnManager.js`

Controls turn-based combat flow:

Properties:
- `turnOrder` - sorted array of entities
- `currentTurnIndex` - whose turn it is
- `turnState` - WAITING, ACTING, ANIMATING, ENDED

Methods:
- `initializeTurns(entities)` - set up turn order
- `nextTurn()` - advance to next entity
- `getCurrentEntity()` - get active entity
- `isPlayerTurn()` - check if player can act
- `executeAction(action)` - perform attack/move/flee

Turn Flow:
1. Player turn: wait for input (Attack/Flee buttons)
2. Enemy turn: AI decides action automatically
3. Animate action execution
4. Check for battle end (all enemies dead or player flees)
5. Next turn

### 7. Encounter System
**File**: `js/systems/EncounterSystem.js`

**Uses:** `randomInt` from engine

Manages random encounters:

```javascript
import { randomInt } from '../../../engine/utils/MathUtils.js';
import Skeleton from '../entities/Skeleton.js';

class EncounterSystem {
  constructor(encounterRate = 0.08) {
    this.encounterRate = encounterRate;
    this.stepsSinceEncounter = 0;
    this.minStepsBeforeEncounter = 10;
  }

  checkEncounter() {
    this.stepsSinceEncounter++;
    if (this.stepsSinceEncounter < this.minStepsBeforeEncounter) {
      return false;
    }
    return Math.random() < this.encounterRate;
  }

  generateEncounter() {
    const enemyCount = randomInt(1, 3); // Uses engine's randomInt
    const enemies = [];
    for (let i = 0; i < enemyCount; i++) {
      enemies.push(new Skeleton(0, 0));
    }
    return enemies;
  }
}
```

### 8. Main Game Coordinator
**File**: `js/Game.js`

**Uses:** `GameLoop`, `Renderer`, `InputManager` from engine + `StateMachine` from game utils

Central game controller:

```javascript
import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import StateMachine from './utils/StateMachine.js'; // Game-specific for now
import WorldMap from './systems/WorldMap.js';
import BattleMap from './systems/BattleMap.js';
import Player from './entities/Player.js';
import EncounterSystem from './systems/EncounterSystem.js';

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager();
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      (dt) => this.render(dt)
    );

    // Use StateMachine for game modes
    this.stateMachine = new StateMachine('WORLD_MAP');
    this.stateMachine
      .addState('WORLD_MAP', {
        enter: () => this.enterWorldMode(),
        update: (dt) => this.updateWorldMode(dt),
      })
      .addState('BATTLE', {
        enter: (enemies) => this.enterBattleMode(enemies),
        update: (dt) => this.updateBattleMode(dt),
        exit: () => this.exitBattleMode(),
      });

    this.worldMap = new WorldMap(20, 15, 32);
    this.battleMap = new BattleMap();
    this.player = new Player(320, 240);
    this.encounterSystem = new EncounterSystem();
  }

  update(deltaTime) {
    this.stateMachine.update(deltaTime);
    this.input.update();
  }

  transitionToBattle(enemies) {
    this.stateMachine.transition('BATTLE', enemies);
  }

  transitionToWorld() {
    this.stateMachine.transition('WORLD_MAP');
  }
}
```

Game Flow:
1. Start in WORLD_MAP mode
2. Player moves with arrow keys / WASD
3. Random encounter triggers
4. Transition to BATTLE mode (StateMachine handles state change)
5. Turn-based combat until victory or flee
6. Return to WORLD_MAP mode (StateMachine returns to previous state)

## UI Elements

### HUD (Always Visible)
- Game title: "Neon Void"
- Player HP: current/max
- Player Damage: value
- Mode indicator: "World Map" or "Battle"

### Battle UI (Overlay)
- Enemy info panel:
  - Enemy name (e.g., "Skeleton")
  - Enemy HP: current/max
- Action buttons:
  - Attack button
  - Flee button (50% success chance)
- Battle log:
  - Scrolling text log of actions
  - Color-coded: player actions (blue), enemy actions (red), system (gray)

### Controls Display
- Arrow Keys / WASD: Move
- Space: Interact (future use)

## Visual Style
- Retro terminal aesthetic
- Green monochrome (#00ff00 on black)
- Grid-based rendering
- Simple geometric shapes for entities:
  - Player: blue circle
  - Skeleton: red/orange skull icon
- Battle animations: flash effects on hit

## Stats & Balance

### Player Stats
- Starting HP: 100
- Max HP: 100
- Damage: 10

### Skeleton Stats
- HP: 30
- Damage: 8
- Melee range: 1 tile

### Combat Formulas
- Attack: `target.takeDamage(attacker.damage)`
- No random variance initially (keep it simple)
- Player dies at 0 HP (game over)
- Skeleton dies at 0 HP (removed from battle)

### Encounter Rates
- Base chance: 8% per step
- Minimum steps between encounters: 10
- Skeleton count per encounter: 1-3 (random)

## Future Enhancements (Not in MVP)
- Multiple enemy types
- Player equipment system
- Level up / progression
- Items and inventory
- Save/load system
- Diverse world map terrain
- Special abilities
- Status effects

## Testing Checklist
- [ ] World map renders correctly
- [ ] Player can move in all directions on world map
- [ ] Random encounters trigger
- [ ] Transition to battle map works
- [ ] Battle grid renders with entities
- [ ] Turn order displays correctly
- [ ] Player can attack enemies
- [ ] Enemies attack player on their turn
- [ ] Enemy HP decreases correctly
- [ ] Player HP decreases correctly
- [ ] Battle ends when all enemies dead
- [ ] Transition back to world map works
- [ ] Player can flee from battle
- [ ] Game over when player HP reaches 0
- [ ] HUD updates correctly
- [ ] Battle log shows actions

## Engine vs Game-Specific Code

### Use Directly from Engine ✅
- `Entity.js` - Base class for Player and Skeleton
- `GameLoop.js` - Core update/render loop
- `Renderer.js` - All drawing operations (shapes, text, entities)
- `InputManager.js` - Keyboard input (arrow keys, WASD)
- `MathUtils.js` - `randomInt()` for encounters, `distance()` for range checks

### Build in RGFN (Might Extract Later) 🔧
- `utils/GridMap.js` - World map and battle map grids (extract when 2nd game needs it)
- `utils/StateMachine.js` - WORLD_MAP ↔ BATTLE transitions (extract when 2nd game needs it)

### Game-Specific (Stays in RGFN) 🎮
- `entities/Player.js` - Player entity with combat stats
- `entities/Skeleton.js` - Enemy entity
- `systems/WorldMap.js` - Uses GridMap, adds encounter logic
- `systems/BattleMap.js` - Uses GridMap, adds positioning logic
- `systems/TurnManager.js` - Turn-based combat flow
- `systems/EncounterSystem.js` - Random encounter mechanics
- `Game.js` - Main coordinator

### Adapt Patterns from eva_game 📋
- Combat stats (hp, maxHp, damage) from Player.js/Enemy.js
- `takeDamage(amount)` method pattern
- Health bar rendering
- Real-time → Turn-based adaptation

## Development Notes
- Use existing engine as foundation ✅
- Keep code modular and testable
- Follow eva_game combat patterns
- Start with minimal features, iterate
- No TypeScript conversion needed initially (use .js)
- Module imports from engine: `import X from '../../engine/...'`
