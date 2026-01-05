import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import StateMachine from './utils/StateMachine.js';
import WorldMap from './systems/WorldMap.js';
import BattleMap from './systems/BattleMap.js';
import TurnManager from './systems/TurnManager.js';
import EncounterSystem from './systems/EncounterSystem.js';
import Player from './entities/Player.js';
import timingConfig from './config/timingConfig.js';

const MODES = {
    WORLD_MAP: 'WORLD_MAP',
    BATTLE: 'BATTLE',
};

export default class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.loop = new GameLoop(
            (dt) => this.update(dt),
            (dt) => this.render(dt)
        );

        // Game state
        this.player = new Player(0, 0);
        this.worldMap = new WorldMap(20, 15, 40);
        this.battleMap = new BattleMap();
        this.turnManager = new TurnManager();
        this.encounterSystem = new EncounterSystem();
        this.currentEnemies = [];
        this.turnTransitioning = false; // Prevent input during turn changes

        // State machine for game modes
        this.stateMachine = new StateMachine(MODES.WORLD_MAP);
        this.stateMachine
            .addState(MODES.WORLD_MAP, {
                enter: () => this.enterWorldMode(),
                update: (dt) => this.updateWorldMode(dt),
            })
            .addState(MODES.BATTLE, {
                enter: (enemies) => this.enterBattleMode(enemies),
                update: (dt) => this.updateBattleMode(dt),
                exit: () => this.exitBattleMode(),
            });

        // UI elements
        this.setupUI();

        // Input mapping
        this.setupInput();

        // Initialize player position
        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    setupUI() {
        this.hudElements = {
            modeIndicator: document.getElementById('mode-indicator'),
            playerHp: document.getElementById('player-hp'),
            playerMaxHp: document.getElementById('player-max-hp'),
            playerDmg: document.getElementById('player-dmg'),
        };

        this.battleUI = {
            sidebar: document.getElementById('battle-sidebar'),
            enemyName: document.getElementById('enemy-name'),
            enemyHp: document.getElementById('enemy-hp'),
            enemyMaxHp: document.getElementById('enemy-max-hp'),
            attackBtn: document.getElementById('attack-btn'),
            fleeBtn: document.getElementById('flee-btn'),
            waitBtn: document.getElementById('wait-btn'),
            log: document.getElementById('battle-log'),
        };

        // Battle button events
        this.battleUI.attackBtn.addEventListener('click', () => this.handleAttack());
        this.battleUI.fleeBtn.addEventListener('click', () => this.handleFlee());
        this.battleUI.waitBtn.addEventListener('click', () => this.handleWait());
    }

    setupInput() {
        this.input.mapAction('moveUp', ['ArrowUp', 'KeyW']);
        this.input.mapAction('moveDown', ['ArrowDown', 'KeyS']);
        this.input.mapAction('moveLeft', ['ArrowLeft', 'KeyA']);
        this.input.mapAction('moveRight', ['ArrowRight', 'KeyD']);

        document.addEventListener('keydown', (e) => this.input.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.input.handleKeyUp(e));
    }

    start() {
        this.updateHUD();
        this.loop.start();
    }

    update(deltaTime) {
        this.stateMachine.update(deltaTime);
        this.input.update();
    }

    render(deltaTime) {
        this.renderer.beginFrame();

        if (this.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.renderWorldMode();
        } else if (this.stateMachine.isInState(MODES.BATTLE)) {
            this.renderBattleMode();
        }

        this.renderer.endFrame();
    }

    // ============ WORLD MAP MODE ============

    enterWorldMode() {
        this.hudElements.modeIndicator.textContent = 'World Map';
        this.battleUI.sidebar.classList.add('hidden');

        // Reset player position on world map
        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    updateWorldMode(deltaTime) {
        // Handle movement
        if (this.input.wasActionPressed('moveUp')) {
            if (this.worldMap.movePlayer('up')) {
                this.onPlayerMoved();
            }
        }
        if (this.input.wasActionPressed('moveDown')) {
            if (this.worldMap.movePlayer('down')) {
                this.onPlayerMoved();
            }
        }
        if (this.input.wasActionPressed('moveLeft')) {
            if (this.worldMap.movePlayer('left')) {
                this.onPlayerMoved();
            }
        }
        if (this.input.wasActionPressed('moveRight')) {
            if (this.worldMap.movePlayer('right')) {
                this.onPlayerMoved();
            }
        }

        // Update player position (only if still in world map mode)
        // Don't overwrite position if we just transitioned to battle
        if (this.stateMachine.isInState(MODES.WORLD_MAP)) {
            const [px, py] = this.worldMap.getPlayerPixelPosition();
            this.player.x = px;
            this.player.y = py;
        }
    }

    onPlayerMoved() {
        this.encounterSystem.onPlayerMove();

        if (this.encounterSystem.checkEncounter()) {
            const enemies = this.encounterSystem.generateEncounter();
            this.stateMachine.transition(MODES.BATTLE, enemies);
        }
    }

    renderWorldMode() {
        this.worldMap.draw(this.renderer.ctx, this.renderer);
        this.player.draw(this.renderer.ctx);
    }

    // ============ BATTLE MODE ============

    enterBattleMode(enemies) {
        this.hudElements.modeIndicator.textContent = 'Battle!';
        this.battleUI.sidebar.classList.remove('hidden');

        this.currentEnemies = enemies;
        this.battleMap.setup(this.player, this.currentEnemies);
        this.turnManager.initializeTurns([this.player, ...this.currentEnemies]);
        this.turnTransitioning = false; // Reset transition flag

        this.clearBattleLog();
        this.addBattleLog(`Encountered ${enemies.length} skeleton${enemies.length > 1 ? 's' : ''}!`, 'system');

        this.processTurn();
    }

    updateBattleMode(deltaTime) {
        // Allow player movement during their turn (only when not transitioning)
        if (this.turnManager.isPlayerTurn() &&
            this.turnManager.waitingForPlayer &&
            !this.turnTransitioning) {

            let moved = false;

            if (this.input.wasActionPressed('moveUp')) {
                moved = this.battleMap.moveEntity(this.player, 'up');
            } else if (this.input.wasActionPressed('moveDown')) {
                moved = this.battleMap.moveEntity(this.player, 'down');
            } else if (this.input.wasActionPressed('moveLeft')) {
                moved = this.battleMap.moveEntity(this.player, 'left');
            } else if (this.input.wasActionPressed('moveRight')) {
                moved = this.battleMap.moveEntity(this.player, 'right');
            }

            if (moved) {
                this.addBattleLog('You moved.', 'player');
                // End player turn after moving
                this.turnTransitioning = true;
                this.turnManager.waitingForPlayer = false;
                this.turnManager.nextTurn();
                setTimeout(() => {
                    this.processTurn();
                }, timingConfig.battle.playerActionDelay);
            }
        }
    }

    processTurn() {
        const current = this.turnManager.getCurrentEntity();

        if (!current) {
            this.endBattle('victory');
            return;
        }

        // Check if battle should end
        if (!this.turnManager.hasActiveCombatants()) {
            if (this.player.isDead()) {
                this.endBattle('defeat');
            } else {
                this.endBattle('victory');
            }
            return;
        }

        if (this.turnManager.isPlayerTurn()) {
            // Small delay before accepting player input to clear any lingering key presses
            setTimeout(() => {
                this.turnTransitioning = false;
                this.turnManager.waitingForPlayer = true;
                this.updateBattleUI();
                this.enableBattleButtons(true);
            }, timingConfig.battle.turnStartInputDelay);
        } else {
            this.enableBattleButtons(false);
            this.executeEnemyTurn(current);
        }
    }

    executeEnemyTurn(enemy) {
        this.turnTransitioning = true;

        setTimeout(() => {
            // Enemy AI: move toward player, attack if in range
            const inRange = this.battleMap.isInMeleeRange(enemy, this.player);

            if (inRange) {
                this.addBattleLog(`${enemy.name} attacks!`, 'enemy');
                this.player.takeDamage(enemy.damage);
                this.addBattleLog(`Player takes ${enemy.damage} damage!`, 'damage');
                this.updateHUD();

                if (this.player.isDead()) {
                    this.addBattleLog('You have been defeated!', 'system');
                    setTimeout(() => this.endBattle('defeat'), timingConfig.battle.defeatEndDelay);
                    return;
                }
            } else {
                this.battleMap.moveEntityToward(enemy, this.player);
                this.addBattleLog(`${enemy.name} moves closer...`, 'enemy');
            }

            this.turnManager.nextTurn();
            setTimeout(() => this.processTurn(), timingConfig.battle.enemyTurnDelay);
        }, timingConfig.battle.enemyActionStartDelay);
    }

    handleAttack() {
        if (!this.turnManager.isPlayerTurn() ||
            !this.turnManager.waitingForPlayer ||
            this.turnTransitioning) {
            return;
        }

        this.enableBattleButtons(false);
        this.turnTransitioning = true;
        this.turnManager.waitingForPlayer = false;

        const enemies = this.turnManager.getActiveEnemies();
        if (enemies.length === 0) {
            this.endBattle('victory');
            return;
        }

        // Find closest enemy in melee range
        let target = null;
        for (const enemy of enemies) {
            if (this.battleMap.isInMeleeRange(this.player, enemy)) {
                target = enemy;
                break;
            }
        }

        if (target) {
            this.addBattleLog('You attack!', 'player');
            target.takeDamage(this.player.damage);
            this.addBattleLog(`${target.name} takes ${this.player.damage} damage!`, 'damage');

            if (target.isDead()) {
                this.addBattleLog(`${target.name} defeated!`, 'system');
            }

            this.turnManager.nextTurn();
            setTimeout(() => this.processTurn(), timingConfig.battle.playerActionDelay);
        } else {
            this.addBattleLog('No enemy in range! Move closer first.', 'system');
            this.turnTransitioning = false;
            this.turnManager.waitingForPlayer = true;
            this.enableBattleButtons(true);
        }
    }

    handleFlee() {
        if (!this.turnManager.isPlayerTurn() ||
            !this.turnManager.waitingForPlayer ||
            this.turnTransitioning) {
            return;
        }

        this.enableBattleButtons(false);
        this.turnTransitioning = true;
        this.turnManager.waitingForPlayer = false;

        const success = Math.random() < 0.5;
        if (success) {
            this.addBattleLog('You fled from battle!', 'system');
            setTimeout(() => this.endBattle('fled'), timingConfig.battle.fleeSuccessDelay);
        } else {
            this.addBattleLog('Failed to flee!', 'system');
            this.turnManager.nextTurn();
            setTimeout(() => this.processTurn(), timingConfig.battle.fleeFailedDelay);
        }
    }

    handleWait() {
        if (!this.turnManager.isPlayerTurn() ||
            !this.turnManager.waitingForPlayer ||
            this.turnTransitioning) {
            return;
        }

        this.enableBattleButtons(false);
        this.turnTransitioning = true;
        this.turnManager.waitingForPlayer = false;

        this.addBattleLog('You waited.', 'player');
        this.turnManager.nextTurn();
        setTimeout(() => this.processTurn(), 600);
    }

    endBattle(result) {
        if (result === 'victory') {
            this.addBattleLog('Victory!', 'system');
            setTimeout(() => this.stateMachine.transition(MODES.WORLD_MAP), timingConfig.battle.victoryEndDelay);
        } else if (result === 'defeat') {
            this.addBattleLog('Game Over!', 'system');
            setTimeout(() => this.gameOver(), timingConfig.battle.gameOverDelay);
        } else if (result === 'fled') {
            this.stateMachine.transition(MODES.WORLD_MAP);
        }
    }

    exitBattleMode() {
        this.currentEnemies = [];
    }

    renderBattleMode() {
        const currentEntity = this.turnManager.getCurrentEntity();
        this.battleMap.draw(this.renderer.ctx, this.renderer, currentEntity);

        // Draw all entities
        const entities = [this.player, ...this.currentEnemies.filter(e => e.active)];
        this.renderer.drawEntities(entities);
    }

    // ============ BATTLE UI ============

    updateBattleUI() {
        const enemies = this.turnManager.getActiveEnemies();
        if (enemies.length > 0) {
            const target = enemies[0];
            this.battleUI.enemyName.textContent = target.name;
            this.battleUI.enemyHp.textContent = target.hp;
            this.battleUI.enemyMaxHp.textContent = target.maxHp;
        } else {
            this.battleUI.enemyName.textContent = '-';
            this.battleUI.enemyHp.textContent = '-';
            this.battleUI.enemyMaxHp.textContent = '-';
        }
    }

    enableBattleButtons(enabled) {
        this.battleUI.attackBtn.disabled = !enabled;
        this.battleUI.fleeBtn.disabled = !enabled;
        this.battleUI.waitBtn.disabled = !enabled;
    }

    addBattleLog(message, type = 'system') {
        const div = document.createElement('div');
        div.textContent = message;
        div.classList.add(type + '-action');
        this.battleUI.log.appendChild(div);
        this.battleUI.log.scrollTop = this.battleUI.log.scrollHeight;
    }

    clearBattleLog() {
        this.battleUI.log.innerHTML = '';
    }

    // ============ HUD ============

    updateHUD() {
        this.hudElements.playerHp.textContent = this.player.hp;
        this.hudElements.playerMaxHp.textContent = this.player.maxHp;
        this.hudElements.playerDmg.textContent = this.player.damage;
    }

    // ============ GAME OVER ============

    gameOver() {
        this.loop.stop();
        alert('Game Over! Refresh to restart.');
    }
}
