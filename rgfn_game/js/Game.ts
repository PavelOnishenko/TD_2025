import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import StateMachine from './utils/StateMachine.js';
import WorldMap from './systems/WorldMap.js';
import BattleMap from './systems/BattleMap.js';
import TurnManager from './systems/TurnManager.js';
import EncounterSystem from './systems/EncounterSystem.js';
import Player from './entities/Player.js';
import Skeleton from './entities/Skeleton.js';
import timingConfig from './config/timingConfig.js';
import { Direction } from './types/game.js';

const MODES = {
    WORLD_MAP: 'WORLD_MAP',
    BATTLE: 'BATTLE',
};

interface HUDElements {
    modeIndicator: HTMLElement;
    playerHp: HTMLElement;
    playerMaxHp: HTMLElement;
    playerDmg: HTMLElement;
}

interface BattleUI {
    sidebar: HTMLElement;
    enemyName: HTMLElement;
    enemyHp: HTMLElement;
    enemyMaxHp: HTMLElement;
    attackBtn: HTMLButtonElement;
    fleeBtn: HTMLButtonElement;
    waitBtn: HTMLButtonElement;
    log: HTMLElement;
}

export default class Game {
    private canvas: HTMLCanvasElement;
    private renderer: Renderer;
    private input: InputManager;
    private loop: GameLoop;
    private player: Player;
    private worldMap: WorldMap;
    private battleMap: BattleMap;
    private turnManager: TurnManager;
    private encounterSystem: EncounterSystem;
    private currentEnemies: Skeleton[];
    private turnTransitioning: boolean;
    private stateMachine: StateMachine;
    private hudElements: HUDElements;
    private battleUI: BattleUI;
    private selectedEnemy: Skeleton | null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.input = new InputManager();
        this.loop = new GameLoop(
            (dt: number) => this.update(dt),
            (dt: number) => this.render(dt)
        );

        // Game state
        this.player = new Player(0, 0);
        this.worldMap = new WorldMap(20, 15, 40);
        this.battleMap = new BattleMap();
        this.turnManager = new TurnManager();
        this.encounterSystem = new EncounterSystem();
        this.currentEnemies = [];
        this.turnTransitioning = false;
        this.selectedEnemy = null;

        // State machine for game modes
        this.stateMachine = new StateMachine(MODES.WORLD_MAP);
        this.stateMachine
            .addState(MODES.WORLD_MAP, {
                enter: () => this.enterWorldMode(),
                update: (dt: number) => this.updateWorldMode(dt),
            })
            .addState(MODES.BATTLE, {
                enter: (enemies: Skeleton[]) => this.enterBattleMode(enemies),
                update: (dt: number) => this.updateBattleMode(dt),
                exit: () => this.exitBattleMode(),
            });

        // UI elements
        this.hudElements = {} as HUDElements;
        this.battleUI = {} as BattleUI;
        this.setupUI();

        // Input mapping
        this.setupInput();

        // Initialize player position
        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    private setupUI(): void {
        this.hudElements = {
            modeIndicator: document.getElementById('mode-indicator')!,
            playerHp: document.getElementById('player-hp')!,
            playerMaxHp: document.getElementById('player-max-hp')!,
            playerDmg: document.getElementById('player-dmg')!,
        };

        this.battleUI = {
            sidebar: document.getElementById('battle-sidebar')!,
            enemyName: document.getElementById('enemy-name')!,
            enemyHp: document.getElementById('enemy-hp')!,
            enemyMaxHp: document.getElementById('enemy-max-hp')!,
            attackBtn: document.getElementById('attack-btn')! as HTMLButtonElement,
            fleeBtn: document.getElementById('flee-btn')! as HTMLButtonElement,
            waitBtn: document.getElementById('wait-btn')! as HTMLButtonElement,
            log: document.getElementById('battle-log')!,
        };

        // Battle button events
        this.battleUI.attackBtn.addEventListener('click', () => this.handleAttack());
        this.battleUI.fleeBtn.addEventListener('click', () => this.handleFlee());
        this.battleUI.waitBtn.addEventListener('click', () => this.handleWait());

        // Canvas click for enemy selection
        this.canvas.addEventListener('click', (e: MouseEvent) => this.handleCanvasClick(e));
    }

    private setupInput(): void {
        this.input.mapAction('moveUp', ['ArrowUp', 'KeyW']);
        this.input.mapAction('moveDown', ['ArrowDown', 'KeyS']);
        this.input.mapAction('moveLeft', ['ArrowLeft', 'KeyA']);
        this.input.mapAction('moveRight', ['ArrowRight', 'KeyD']);

        document.addEventListener('keydown', (e: KeyboardEvent) => this.input.handleKeyDown(e));
        document.addEventListener('keyup', (e: KeyboardEvent) => this.input.handleKeyUp(e));
    }

    public start(): void {
        this.updateHUD();
        this.loop.start();
    }

    private update(deltaTime: number): void {
        this.stateMachine.update(deltaTime);
        this.input.update();
    }

    private render(deltaTime: number): void {
        this.renderer.beginFrame();

        if (this.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.renderWorldMode();
        } else if (this.stateMachine.isInState(MODES.BATTLE)) {
            this.renderBattleMode();
        }

        this.renderer.endFrame();
    }

    // ============ WORLD MAP MODE ============

    private enterWorldMode(): void {
        this.hudElements.modeIndicator.textContent = 'World Map';
        this.battleUI.sidebar.classList.add('hidden');

        // Reset player position on world map
        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    private updateWorldMode(deltaTime: number): void {
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

        // Update player position
        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    private onPlayerMoved(): void {
        this.encounterSystem.onPlayerMove();

        if (this.encounterSystem.checkEncounter()) {
            const enemies = this.encounterSystem.generateEncounter();
            this.stateMachine.transition(MODES.BATTLE, enemies);
        }
    }

    private renderWorldMode(): void {
        this.worldMap.draw(this.renderer.ctx, this.renderer);
        this.player.draw(this.renderer.ctx);
    }

    // ============ BATTLE MODE ============

    private enterBattleMode(enemies: Skeleton[]): void {
        this.hudElements.modeIndicator.textContent = 'Battle!';
        this.battleUI.sidebar.classList.remove('hidden');

        this.currentEnemies = enemies;
        this.selectedEnemy = null; // Reset selection
        this.battleMap.setup(this.player, this.currentEnemies);
        this.turnManager.initializeTurns([this.player, ...this.currentEnemies]);
        this.turnTransitioning = false;

        this.clearBattleLog();
        this.addBattleLog(`Encountered ${enemies.length} skeleton${enemies.length > 1 ? 's' : ''}!`, 'system');

        this.processTurn();
    }

    private updateBattleMode(deltaTime: number): void {
        // Allow player movement during their turn (only when not transitioning)
        if (this.turnManager.isPlayerTurn() &&
            this.turnManager.waitingForPlayer &&
            !this.turnTransitioning) {

            let moved = false;

            if (this.input.wasActionPressed('moveUp')) {
                moved = this.handleMovementOrSelection('up');
            } else if (this.input.wasActionPressed('moveDown')) {
                moved = this.handleMovementOrSelection('down');
            } else if (this.input.wasActionPressed('moveLeft')) {
                moved = this.handleMovementOrSelection('left');
            } else if (this.input.wasActionPressed('moveRight')) {
                moved = this.handleMovementOrSelection('right');
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

    private handleMovementOrSelection(direction: Direction): boolean {
        // Check if there's an enemy adjacent in the pressed direction
        const enemyInDirection = this.getEnemyInDirection(direction);

        if (enemyInDirection) {
            // Select the enemy instead of moving
            this.selectedEnemy = enemyInDirection;
            this.updateBattleUI();
            this.addBattleLog(`Selected ${enemyInDirection.name}`, 'system');
            return false; // Didn't move, just selected
        }

        // No enemy in that direction, try to move
        return this.battleMap.moveEntity(this.player, direction);
    }

    private getAdjacentEnemies(): Skeleton[] {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.filter(enemy => this.battleMap.isInMeleeRange(this.player, enemy));
    }

    private getEnemyInDirection(direction: Direction): Skeleton | null {
        const playerCol = this.player.gridCol ?? 0;
        const playerRow = this.player.gridRow ?? 0;

        let targetCol = playerCol;
        let targetRow = playerRow;

        switch (direction) {
            case 'up':
                targetRow = playerRow - 1;
                break;
            case 'down':
                targetRow = playerRow + 1;
                break;
            case 'left':
                targetCol = playerCol - 1;
                break;
            case 'right':
                targetCol = playerCol + 1;
                break;
        }

        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.find(enemy =>
            enemy.gridCol === targetCol && enemy.gridRow === targetRow
        ) || null;
    }

    private handleCanvasClick(event: MouseEvent): void {
        // Only handle clicks during battle mode and player's turn
        if (!this.stateMachine.isInState(MODES.BATTLE) ||
            !this.turnManager.isPlayerTurn() ||
            !this.turnManager.waitingForPlayer ||
            this.turnTransitioning) {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Find which enemy was clicked (if any)
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        for (const enemy of enemies) {
            const enemyX = enemy.x;
            const enemyY = enemy.y;
            const radius = 20; // Approximate click radius

            const distance = Math.sqrt(
                Math.pow(clickX - enemyX, 2) + Math.pow(clickY - enemyY, 2)
            );

            if (distance <= radius) {
                this.selectedEnemy = enemy;
                this.updateBattleUI();
                this.addBattleLog(`Selected ${enemy.name}`, 'system');
                return;
            }
        }
    }

    private processTurn(): void {
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
            this.executeEnemyTurn(current as Skeleton);
        }
    }

    private executeEnemyTurn(enemy: Skeleton): void {
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

    private handleAttack(): void {
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

        // Use selected enemy if valid and in range, otherwise find first enemy in range
        let target: Skeleton | null = null;

        if (this.selectedEnemy && !this.selectedEnemy.isDead() &&
            this.battleMap.isInMeleeRange(this.player, this.selectedEnemy)) {
            target = this.selectedEnemy;
        } else {
            // Find first enemy in melee range
            for (const enemy of enemies) {
                if (this.battleMap.isInMeleeRange(this.player, enemy)) {
                    target = enemy as Skeleton;
                    break;
                }
            }
        }

        if (target) {
            this.addBattleLog('You attack!', 'player');
            target.takeDamage(this.player.damage);
            this.addBattleLog(`${target.name} takes ${this.player.damage} damage!`, 'damage');

            if (target.isDead()) {
                this.addBattleLog(`${target.name} defeated!`, 'system');
                // Clear selection if selected enemy died
                if (this.selectedEnemy === target) {
                    this.selectedEnemy = null;
                }
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

    private handleFlee(): void {
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

    private handleWait(): void {
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

    private endBattle(result: 'victory' | 'defeat' | 'fled'): void {
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

    private exitBattleMode(): void {
        this.currentEnemies = [];
    }

    private renderBattleMode(): void {
        const currentEntity = this.turnManager.getCurrentEntity();
        this.battleMap.draw(this.renderer.ctx, this.renderer, currentEntity, this.selectedEnemy);

        // Draw all entities
        const entities = [this.player, ...this.currentEnemies.filter(e => e.active)];
        this.renderer.drawEntities(entities);
    }

    // ============ BATTLE UI ============

    private updateBattleUI(): void {
        const enemies = this.turnManager.getActiveEnemies();
        let displayEnemy: Skeleton | null = null;

        // If we have a selected enemy that's still alive, show it
        if (this.selectedEnemy && !this.selectedEnemy.isDead()) {
            displayEnemy = this.selectedEnemy;
        } else {
            // Auto-select first adjacent enemy, or just first enemy if none adjacent
            const adjacentEnemies = this.getAdjacentEnemies();
            if (adjacentEnemies.length > 0) {
                displayEnemy = adjacentEnemies[0];
                this.selectedEnemy = displayEnemy; // Auto-select
            } else if (enemies.length > 0) {
                displayEnemy = enemies[0] as Skeleton;
            }
        }

        if (displayEnemy) {
            const isSelected = displayEnemy === this.selectedEnemy;
            this.battleUI.enemyName.textContent = displayEnemy.name + (isSelected ? ' [SELECTED]' : '');
            this.battleUI.enemyHp.textContent = String(displayEnemy.hp);
            this.battleUI.enemyMaxHp.textContent = String(displayEnemy.maxHp);
        } else {
            this.battleUI.enemyName.textContent = '-';
            this.battleUI.enemyHp.textContent = '-';
            this.battleUI.enemyMaxHp.textContent = '-';
        }
    }

    private enableBattleButtons(enabled: boolean): void {
        this.battleUI.attackBtn.disabled = !enabled;
        this.battleUI.fleeBtn.disabled = !enabled;
        this.battleUI.waitBtn.disabled = !enabled;
    }

    private addBattleLog(message: string, type: string = 'system'): void {
        const div = document.createElement('div');
        div.textContent = message;
        div.classList.add(type + '-action');
        this.battleUI.log.appendChild(div);
        this.battleUI.log.scrollTop = this.battleUI.log.scrollHeight;
    }

    private clearBattleLog(): void {
        this.battleUI.log.innerHTML = '';
    }

    // ============ HUD ============

    private updateHUD(): void {
        this.hudElements.playerHp.textContent = String(this.player.hp);
        this.hudElements.playerMaxHp.textContent = String(this.player.maxHp);
        this.hudElements.playerDmg.textContent = String(this.player.damage);
    }

    // ============ GAME OVER ============

    private gameOver(): void {
        this.loop.stop();
        alert('Game Over! Refresh to restart.');
    }
}
