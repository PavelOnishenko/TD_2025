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
import Item from './entities/Item.js';
import timingConfig from './config/timingConfig.js';
import { balanceConfig } from './config/balanceConfig.js';
import { Direction } from './types/game.js';
import { BattleSplash } from './ui/BattleSplash.js';
import { ItemDiscoverySplash } from './ui/ItemDiscoverySplash.js';
import { applyThemeToCSS } from './config/ThemeConfig.js';

const MODES = {
    WORLD_MAP: 'WORLD_MAP',
    BATTLE: 'BATTLE',
    VILLAGE: 'VILLAGE',
};

const VILLAGE_BOW_BUY_PRICE = 15;
const VILLAGE_BOW_SELL_PRICE = 8;

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
    private hudElements;
    private battleUI;
    private villageUI;
    private selectedEnemy: Skeleton | null;
    private battleSplash: BattleSplash;
    private itemDiscoverySplash: ItemDiscoverySplash;

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
            })
            .addState(MODES.VILLAGE, {
                enter: () => this.enterVillageMode(),
                update: () => {},
                exit: () => this.exitVillageMode(),
            });

        // UI elements
        this.hudElements = {};
        this.battleUI = {};
        this.villageUI = {};
        this.setupUI();

        // Initialize systems
        this.battleSplash = new BattleSplash();
        this.itemDiscoverySplash = new ItemDiscoverySplash();
        applyThemeToCSS();

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
            usePotionBtn: document.getElementById('use-potion-btn')! as HTMLButtonElement,
            playerLevel: document.getElementById('player-level')!,
            playerXp: document.getElementById('player-xp')!,
            playerXpNext: document.getElementById('player-xp-next')!,
            playerHp: document.getElementById('player-hp')!,
            playerMaxHp: document.getElementById('player-max-hp')!,
            playerDmg: document.getElementById('player-dmg')!,
            playerDmgFormula: document.getElementById('player-dmg-formula')!,
            playerArmor: document.getElementById('player-armor')!,
            playerDodge: document.getElementById('player-dodge')!,
            playerDodgeFormula: document.getElementById('player-dodge-formula')!,
            playerWeapon: document.getElementById('player-weapon')!,
            playerGold: document.getElementById('player-gold')!,
            skillPoints: document.getElementById('skill-points')!,
            statVitality: document.getElementById('stat-vitality')!,
            statToughness: document.getElementById('stat-toughness')!,
            statStrength: document.getElementById('stat-strength')!,
            statAgility: document.getElementById('stat-agility')!,
            addVitalityBtn: document.getElementById('add-vitality-btn')! as HTMLButtonElement,
            addToughnessBtn: document.getElementById('add-toughness-btn')! as HTMLButtonElement,
            addStrengthBtn: document.getElementById('add-strength-btn')! as HTMLButtonElement,
            addAgilityBtn: document.getElementById('add-agility-btn')! as HTMLButtonElement,
            inventoryCount: document.getElementById('inventory-count')!,
            inventoryCapacity: document.getElementById('inventory-capacity')!,
            inventoryGrid: document.getElementById('inventory-grid')!,
        };

        this.battleUI = {
            sidebar: document.getElementById('battle-sidebar')!,
            enemyName: document.getElementById('enemy-name')!,
            enemyHp: document.getElementById('enemy-hp')!,
            enemyMaxHp: document.getElementById('enemy-max-hp')!,
            attackBtn: document.getElementById('attack-btn')! as HTMLButtonElement,
            fleeBtn: document.getElementById('flee-btn')! as HTMLButtonElement,
            waitBtn: document.getElementById('wait-btn')! as HTMLButtonElement,
            usePotionBtn: document.getElementById('battle-use-potion-btn')! as HTMLButtonElement,
            log: document.getElementById('battle-log')!,
            attackRangeText: document.getElementById('attack-range-text')!,
        };

        this.villageUI = {
            sidebar: document.getElementById('village-sidebar')!,
            prompt: document.getElementById('village-prompt')!,
            actions: document.getElementById('village-actions')!,
            log: document.getElementById('village-log')!,
            enterBtn: document.getElementById('village-enter-btn')! as HTMLButtonElement,
            skipBtn: document.getElementById('village-skip-btn')! as HTMLButtonElement,
            waitBtn: document.getElementById('village-wait-btn')! as HTMLButtonElement,
            buyBtn: document.getElementById('village-buy-btn')! as HTMLButtonElement,
            sellBtn: document.getElementById('village-sell-btn')! as HTMLButtonElement,
            leaveBtn: document.getElementById('village-leave-btn')! as HTMLButtonElement,
        };

        // Battle button events
        this.battleUI.attackBtn.addEventListener('click', () => this.handleAttack());
        this.battleUI.fleeBtn.addEventListener('click', () => this.handleFlee());
        this.battleUI.waitBtn.addEventListener('click', () => this.handleWait());
        this.battleUI.usePotionBtn.addEventListener('click', () => this.handleUsePotion(true));

        this.hudElements.usePotionBtn.addEventListener('click', () => this.handleUsePotion(false));

        this.villageUI.enterBtn.addEventListener('click', () => this.handleVillageEnter());
        this.villageUI.skipBtn.addEventListener('click', () => this.handleVillageSkip());
        this.villageUI.waitBtn.addEventListener('click', () => this.handleVillageWait());
        this.villageUI.buyBtn.addEventListener('click', () => this.handleVillageBuy());
        this.villageUI.sellBtn.addEventListener('click', () => this.handleVillageSell());
        this.villageUI.leaveBtn.addEventListener('click', () => this.handleVillageLeave());

        // Stat allocation button events
        this.hudElements.addVitalityBtn.addEventListener('click', () => this.handleAddStat('vitality'));
        this.hudElements.addToughnessBtn.addEventListener('click', () => this.handleAddStat('toughness'));
        this.hudElements.addStrengthBtn.addEventListener('click', () => this.handleAddStat('strength'));
        this.hudElements.addAgilityBtn.addEventListener('click', () => this.handleAddStat('agility'));

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
        this.villageUI.sidebar.classList.add('hidden');

        // Reset player position on world map
        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;

        // Update HUD to reflect any changes from battle (XP, level, etc.)
        this.updateHUD();
    }

    private updateWorldMode(deltaTime: number): void {
        // Handle movement
        if (this.input.wasActionPressed('moveUp')) {
            const moveResult = this.worldMap.movePlayer('up');
            if (moveResult.moved) {
                this.onPlayerMoved(moveResult.isPreviouslyDiscovered);
            }
        }
        if (this.input.wasActionPressed('moveDown')) {
            const moveResult = this.worldMap.movePlayer('down');
            if (moveResult.moved) {
                this.onPlayerMoved(moveResult.isPreviouslyDiscovered);
            }
        }
        if (this.input.wasActionPressed('moveLeft')) {
            const moveResult = this.worldMap.movePlayer('left');
            if (moveResult.moved) {
                this.onPlayerMoved(moveResult.isPreviouslyDiscovered);
            }
        }
        if (this.input.wasActionPressed('moveRight')) {
            const moveResult = this.worldMap.movePlayer('right');
            if (moveResult.moved) {
                this.onPlayerMoved(moveResult.isPreviouslyDiscovered);
            }
        }

        // Update player position
        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    private onPlayerMoved(isPreviouslyDiscovered: boolean): void {
        if (this.worldMap.isPlayerOnVillage()) {
            this.stateMachine.transition(MODES.VILLAGE);
            return;
        }

        this.encounterSystem.onPlayerMove();

        if (this.encounterSystem.checkEncounter(isPreviouslyDiscovered)) {
            const encounter = this.encounterSystem.generateEncounter();

            if (encounter.type === 'battle') {
                this.stateMachine.transition(MODES.BATTLE, encounter.enemies);
            } else if (encounter.type === 'none') {
                this.addBattleLog('A dragon flies past without noticing you.', 'system');
            } else if (encounter.type === 'item') {
                this.handleItemDiscovery(encounter.item);
            }
        }
    }

    private handleItemDiscovery(item: Item): void {
        // Show item discovery splash screen
        this.itemDiscoverySplash.showItemDiscovery(item, () => {
            const addedToInventory = this.player.addItemToInventory(item);

            if (!addedToInventory) {
                this.addBattleLog(`Inventory full. ${item.name} was left behind.`, 'system');
            }

            this.updateHUD();
        });
    }

    private renderWorldMode(): void {
        this.worldMap.draw(this.renderer.ctx, this.renderer);
        this.player.draw(this.renderer.ctx);
    }

    // ============ VILLAGE MODE ============

    private enterVillageMode(): void {
        this.hudElements.modeIndicator.textContent = 'Village';
        this.battleUI.sidebar.classList.add('hidden');
        this.villageUI.sidebar.classList.remove('hidden');
        this.villageUI.prompt.classList.remove('hidden');
        this.villageUI.actions.classList.add('hidden');
        this.villageUI.log.innerHTML = '';
        this.addVillageLog('You discover a village. Enter it?', 'system');
        this.updateVillageButtons();
    }

    private exitVillageMode(): void {
        this.villageUI.sidebar.classList.add('hidden');
    }

    private handleVillageEnter(): void {
        this.villageUI.prompt.classList.add('hidden');
        this.villageUI.actions.classList.remove('hidden');
        this.addVillageLog('You enter the village market square.', 'system');
        this.updateVillageButtons();
    }

    private handleVillageSkip(): void {
        this.addVillageLog('You decide not to enter and continue your journey.', 'system');
        this.stateMachine.transition(MODES.WORLD_MAP);
    }

    private handleVillageWait(): void {
        this.player.heal(1);
        this.addVillageLog('You wait at the inn and recover 1 HP.', 'player');
        this.updateHUD();
    }

    private handleVillageBuy(): void {
        if (this.player.equippedWeapon?.name === 'Bow') {
            this.addVillageLog('You already have a bow equipped.', 'system');
            return;
        }

        if (this.player.gold < VILLAGE_BOW_BUY_PRICE) {
            this.addVillageLog(`Not enough gold. Bow costs ${VILLAGE_BOW_BUY_PRICE}.`, 'system');
            return;
        }

        this.player.gold -= VILLAGE_BOW_BUY_PRICE;
        this.player.equipItem(new Item({
            name: 'Bow',
            description: 'A sturdy bow that allows you to attack from 2 cells away',
            type: 'weapon',
            attackRange: 2,
        }));
        this.addVillageLog(`You bought a Bow for ${VILLAGE_BOW_BUY_PRICE} gold.`, 'player');
        this.updateHUD();
        this.updateVillageButtons();
    }

    private handleVillageSell(): void {
        const weapon = this.player.equippedWeapon;
        if (!weapon || weapon.name !== 'Bow') {
            this.addVillageLog('You have no bow to sell.', 'system');
            return;
        }

        this.player.unequipWeapon();
        this.player.gold += VILLAGE_BOW_SELL_PRICE;
        this.addVillageLog(`You sold your Bow for ${VILLAGE_BOW_SELL_PRICE} gold.`, 'player');
        this.updateHUD();
        this.updateVillageButtons();
    }

    private handleVillageLeave(): void {
        this.addVillageLog('You leave the village.', 'system');
        this.stateMachine.transition(MODES.WORLD_MAP);
    }

    private updateVillageButtons(): void {
        const hasBowEquipped = this.player.equippedWeapon?.name === 'Bow';
        const canAffordBow = this.player.gold >= VILLAGE_BOW_BUY_PRICE;

        this.villageUI.buyBtn.disabled = hasBowEquipped || !canAffordBow;
        this.villageUI.sellBtn.disabled = !hasBowEquipped;
    }

    private addVillageLog(message: string, type: string = 'system'): void {
        const line = document.createElement('div');
        line.textContent = message;
        line.classList.add(type + '-action');
        this.villageUI.log.appendChild(line);
        this.villageUI.log.scrollTop = this.villageUI.log.scrollHeight;
    }

    // ============ BATTLE MODE ============

    private enterBattleMode(enemies: Skeleton[]): void {
        this.hudElements.modeIndicator.textContent = 'Battle!';
        this.battleUI.sidebar.classList.remove('hidden');
        this.villageUI.sidebar.classList.add('hidden');

        this.currentEnemies = enemies;
        this.selectedEnemy = null; // Reset selection

        // Show battle start splash screen, then continue with battle setup
        this.battleSplash.showBattleStart(enemies.length, () => {
            this.battleMap.setup(this.player, this.currentEnemies);
            this.turnManager.initializeTurns([this.player, ...this.currentEnemies]);
            this.turnTransitioning = false;

            this.clearBattleLog();
            this.addBattleLog(`Encountered ${this.describeEncounter(enemies)}!`, 'system');
     
            // Update HUD to show current player stats
            this.updateHUD();
            this.processTurn();
        });
      
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

                if (Math.random() < this.player.avoidChance) {
                    this.addBattleLog('You swiftly evade the hit!', 'system');
                    this.turnManager.nextTurn();
                    setTimeout(() => this.processTurn(), timingConfig.battle.enemyTurnDelay);
                    return;
                }

                const damageBeforeArmor = enemy.getAttackDamage();
                const damageAfterArmor = damageBeforeArmor <= 0
                    ? 0
                    : Math.max(
                        balanceConfig.combat.minDamageAfterArmor,
                        damageBeforeArmor - this.player.armor
                    );
                this.player.takeDamage(damageBeforeArmor);

                if (damageBeforeArmor > enemy.damage) {
                    this.addBattleLog(`${enemy.name} lands a devastating strike!`, 'enemy');
                }

                if (this.player.armor > 0 && damageAfterArmor < damageBeforeArmor) {
                    this.addBattleLog(`Player takes ${damageAfterArmor} damage (${damageBeforeArmor - damageAfterArmor} blocked by armor)!`, 'damage');
                } else {
                    this.addBattleLog(`Player takes ${damageAfterArmor} damage!`, 'damage');
                }

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
        const attackRange = this.player.getAttackRange();

        if (this.selectedEnemy && !this.selectedEnemy.isDead() &&
            this.battleMap.isInAttackRange(this.player, this.selectedEnemy, attackRange)) {
            target = this.selectedEnemy;
        } else {
            // Find first enemy in attack range
            for (const enemy of enemies) {
                if (this.battleMap.isInAttackRange(this.player, enemy, attackRange)) {
                    target = enemy as Skeleton;
                    break;
                }
            }
        }

        if (target) {
            if (target.shouldAvoidHit()) {
                this.addBattleLog('You attack!', 'player');
                this.addBattleLog(`${target.name} dodges the hit!`, 'enemy');
                this.turnManager.nextTurn();
                setTimeout(() => this.processTurn(), timingConfig.battle.playerActionDelay);
                return;
            }

            this.addBattleLog('You attack!', 'player');
            target.takeDamage(this.player.damage);
            this.addBattleLog(`${target.name} takes ${this.player.damage} damage!`, 'damage');

            if (target.isDead()) {
                this.addBattleLog(`${target.name} defeated!`, 'system');

                // Award XP - target is Skeleton type, so xpValue should exist
                const skeleton = target as Skeleton;
                console.log('Skeleton defeated:', skeleton.name, 'XP Value:', skeleton.xpValue);

                if (skeleton.xpValue && skeleton.xpValue > 0) {
                    const xpBefore = this.player.xp;
                    const levelBefore = this.player.level;

                    const leveledUp = this.player.addXp(skeleton.xpValue);

                    console.log(`XP: ${xpBefore} -> ${this.player.xp}, Level: ${levelBefore} -> ${this.player.level}`);
                    this.addBattleLog(`Gained ${skeleton.xpValue} XP!`, 'system');

                    if (leveledUp) {
                        this.addBattleLog(`LEVEL UP! Now level ${this.player.level}!`, 'system');
                        this.addBattleLog(`Gained ${balanceConfig.leveling.skillPointsPerLevel} skill points! HP fully restored!`, 'system');
                    }
                } else {
                    console.warn('No XP value found on skeleton:', skeleton);
                }

                this.updateHUD();

                // Clear selection if selected enemy died
                if (this.selectedEnemy === target) {
                    this.selectedEnemy = null;
                }
            }

            this.updateHUD(); // Always update HUD after damage
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

        const success = Math.random() < balanceConfig.combat.fleeChance;
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
        setTimeout(() => this.processTurn(), timingConfig.battle.waitActionDelay);
    }


    private handleUsePotion(fromBattleControls: boolean): void {
        const inBattle = this.stateMachine.isInState(MODES.BATTLE);

        if (fromBattleControls && !inBattle) {
            return;
        }

        if (inBattle &&
            (!this.turnManager.isPlayerTurn() ||
             !this.turnManager.waitingForPlayer ||
             this.turnTransitioning)) {
            return;
        }

        const usedPotion = this.player.useHealingPotion();
        if (!usedPotion) {
            this.addBattleLog('No healing potions in inventory.', 'system');
            this.updateHUD();
            return;
        }

        this.addBattleLog('You drink a healing potion (+5 HP).', inBattle ? 'player' : 'system');
        this.updateHUD();

        if (!inBattle) {
            return;
        }

        this.enableBattleButtons(false);
        this.turnTransitioning = true;
        this.turnManager.waitingForPlayer = false;
        this.turnManager.nextTurn();
        setTimeout(() => this.processTurn(), timingConfig.battle.playerActionDelay);
    }

    private endBattle(result: 'victory' | 'defeat' | 'fled'): void {
        if (result === 'victory') {
            this.addBattleLog('Victory!', 'system');
            // Show victory splash screen
            this.battleSplash.showBattleEnd('victory', () => {
                this.stateMachine.transition(MODES.WORLD_MAP);
            });
        } else if (result === 'defeat') {
            this.addBattleLog('Game Over!', 'system');
            // Show defeat splash screen
            this.battleSplash.showBattleEnd('defeat', () => {
                this.gameOver();
            });
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
        this.battleUI.usePotionBtn.disabled = !enabled;
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

    private describeEncounter(enemies: Skeleton[]): string {
        if (enemies.length === 0) {
            return 'nothing';
        }

        const enemyName = enemies[0].name;
        if (enemies.length === 1) {
            return enemyName;
        }

        return `${enemies.length} ${enemyName}s`;
    }

    // ============ HUD ============

    private updateHUD(): void {
        this.hudElements.playerLevel.textContent = String(this.player.level);
        this.hudElements.playerXp.textContent = String(this.player.xp);
        this.hudElements.playerXpNext.textContent = String(this.player.xpToNextLevel);
        this.hudElements.playerHp.textContent = String(this.player.hp);
        this.hudElements.playerMaxHp.textContent = String(this.player.maxHp);
        this.hudElements.playerDmg.textContent = String(this.player.damage);
        this.hudElements.playerDmgFormula.textContent = this.player.getDamageFormulaText();
        this.hudElements.playerArmor.textContent = String(this.player.armor);
        this.hudElements.playerDodge.textContent = `${(this.player.avoidChance * 100).toFixed(1)}%`;
        this.hudElements.playerDodgeFormula.textContent = this.player.getAvoidFormulaText();
        this.hudElements.skillPoints.textContent = String(this.player.skillPoints);
        this.hudElements.statVitality.textContent = String(this.player.vitality);
        this.hudElements.statToughness.textContent = String(this.player.toughness);
        this.hudElements.statStrength.textContent = String(this.player.strength);
        this.hudElements.statAgility.textContent = String(this.player.agility);

        // Update weapon display
        if (this.player.equippedWeapon) {
            this.hudElements.playerWeapon.textContent = this.player.equippedWeapon.name;
        } else {
            this.hudElements.playerWeapon.textContent = 'None';
        }
        this.hudElements.playerGold.textContent = String(this.player.gold);

        // Update inventory display
        const inventory = this.player.getInventory();
        this.hudElements.inventoryCount.textContent = String(inventory.length);
        this.hudElements.inventoryCapacity.textContent = String(balanceConfig.player.inventorySize);
        this.renderInventory(inventory);

        // Potion buttons
        const hasPotion = this.player.getHealingPotionCount() > 0;
        this.hudElements.usePotionBtn.disabled = !hasPotion;
        this.battleUI.usePotionBtn.disabled = !hasPotion;

        // Update attack range text in battle UI
        const attackRange = this.player.getAttackRange();
        if (attackRange === 1) {
            this.battleUI.attackRangeText.textContent = 'Attack when adjacent (1 tile)';
        } else {
            this.battleUI.attackRangeText.textContent = `Attack from ${attackRange} tiles away`;
        }

        // Update stat button states
        this.updateStatButtons();
    }

    private renderInventory(inventory: Item[]): void {
        this.hudElements.inventoryGrid.innerHTML = '';

        for (let index = 0; index < balanceConfig.player.inventorySize; index++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';

            const item = inventory[index];
            if (item) {
                slot.title = item.name;

                const sprite = document.createElement('div');
                sprite.className = item.id === 'bow'
                    ? 'item-sprite bow-sprite'
                    : 'item-sprite potion-sprite';
                slot.appendChild(sprite);
            } else {
                slot.classList.add('empty');
            }

            this.hudElements.inventoryGrid.appendChild(slot);
        }
    }

    private updateStatButtons(): void {
        const hasSkillPoints = this.player.skillPoints > 0;
        this.hudElements.addVitalityBtn.disabled = !hasSkillPoints;
        this.hudElements.addToughnessBtn.disabled = !hasSkillPoints;
        this.hudElements.addStrengthBtn.disabled = !hasSkillPoints;
        this.hudElements.addAgilityBtn.disabled = !hasSkillPoints;
    }

    private handleAddStat(stat: 'vitality' | 'toughness' | 'strength' | 'agility'): void {
        if (this.player.addStat(stat)) {
            this.updateHUD();
            this.addBattleLog(`+1 ${stat.charAt(0).toUpperCase() + stat.slice(1)}!`, 'system');
        }
    }

    // ============ GAME OVER ============

    private gameOver(): void {
        this.loop.stop();
        alert('Game Over! Refresh to restart.');
    }
}
