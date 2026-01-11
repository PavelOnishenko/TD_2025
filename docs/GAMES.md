# Games in TD_2025 Repository

**IMPORTANT: There are THREE separate games in this repository. Do not confuse them!**

## 1. Neon Void (Root JS Game)
- **Location**: `/js/` folder (root level)
- **Type**: Tower defense / space shooter hybrid
- **Technology**: Vanilla JavaScript
- **Entry Point**: `index.html` (root level)
- **Entities**: Tower (player defense), Enemy (SwarmEnemy, TankEnemy), Projectiles
- **Features**: Tower placement, shooting mechanics, color matching, energy system
- **HP System**: Uses engine Damageable component ✅

## 2. RGFN Game (RPG Game)
- **Location**: `/rgfn_game/` folder
- **Type**: Turn-based RPG with overworld and battle system
- **Technology**: TypeScript
- **Entry Point**: `rgfn_game/index.html`
- **Entities**: Player (with stats/leveling), Skeleton enemies
- **Features**: Grid-based movement, turn-based combat, stat allocation, XP system
- **HP System**: Uses engine Damageable component ✅

## 3. Eva Game (Beat'em Up)
- **Location**: `/eva_game/` folder
- **Type**: Real-time beat'em up / brawler
- **Technology**: TypeScript
- **Entry Point**: `eva_game/index.html`
- **Entities**: Player, Enemy (stick figures)
- **Features**: Real-time combat, punch attacks, enemy AI, wave spawning
- **HP System**: Uses engine Damageable component ✅

## Engine (Shared Code)
- **Location**: `/engine/` folder
- **Components**: Entity, GameLoop, Renderer, InputManager, ViewportManager, **Damageable**
- **Purpose**: Shared functionality across all games

---

## Quick Reference: Which Game Is Which?

| If you see... | It's... |
|---------------|---------|
| `js/entities/Player.js` (root) | **Neon Void** |
| `rgfn_game/js/entities/Player.ts` | **RGFN Game** |
| `eva_game/js/entities/Player.ts` | **Eva Game** |
| Space shooting, bullets | **Neon Void** |
| Turn-based combat, grid map | **RGFN Game** |
| Stick figures, real-time punching | **Eva Game** |

## Current Refactoring Status

✅ **All games now use the engine Damageable component!**

- [x] **Eva Game** - Uses engine Damageable component
- [x] **RGFN Game** - Uses engine Damageable component (via mixin)
- [x] **Neon Void** - Uses engine Damageable component (via inheritance)

## Notes for Claude

**CRITICAL**: Always check which folder you're in when working with game files!
- Root `js/` = Neon Void
- `rgfn_game/js/` = RGFN
- `eva_game/js/` = Eva
