import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import StateMachine from './utils/StateMachine.js';
import WorldMap from './systems/world/WorldMap.js';
import BattleMap from './systems/combat/BattleMap.js';
import TurnManager from './systems/combat/TurnManager.js';
import EncounterSystem, { ForcedEncounterType } from './systems/encounter/EncounterSystem.js';
import VillagePopulation from './systems/village/VillagePopulation.js';
import VillageActionsController from './systems/village/VillageActionsController.js';
import DeveloperEventController from './systems/encounter/DeveloperEventController.js';
import VillageEnvironmentRenderer from './systems/village/VillageEnvironmentRenderer.js';
import VillageLifeRenderer from './systems/village/VillageLifeRenderer.js';
import HudController from './systems/HudController.js';
import BattleUiController from './systems/BattleUiController.js';
import WorldModeController from './systems/WorldModeController.js';
import Player from './entities/Player.js';
import Skeleton from './entities/Skeleton.js';
import timingConfig from './config/timingConfig.js';
import { balanceConfig } from './config/balanceConfig.js';
import { Direction } from './types/game.js';
import { BattleSplash } from './ui/BattleSplash.js';
import { ItemDiscoverySplash } from './ui/ItemDiscoverySplash.js';
import { applyThemeToCSS, theme } from './config/ThemeConfig.js';
import { registerBackquoteToggle } from '../../engine/systems/developerHotkeys.js';

const MODES = {
    WORLD_MAP: 'WORLD_MAP',
    BATTLE: 'BATTLE',
    VILLAGE: 'VILLAGE',
};



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
    private developerUI;
    private villagePopulation: VillagePopulation;
    private villageEnvironmentRenderer: VillageEnvironmentRenderer;
    private villageLifeRenderer: VillageLifeRenderer;
    private villageActionsController: VillageActionsController | null;
    private developerEventController: DeveloperEventController | null;
    private hudController: HudController | null;
    private battleUiController: BattleUiController | null;
    private worldModeController: WorldModeController | null;

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
        this.developerUI = {};
        this.villagePopulation = new VillagePopulation();
        this.villageEnvironmentRenderer = new VillageEnvironmentRenderer();
        this.villageLifeRenderer = new VillageLifeRenderer(this.villagePopulation);
        this.villageActionsController = null;
        this.developerEventController = null;
        this.hudController = null;
        this.battleUiController = null;
        this.worldModeController = null;
        this.setupUI();

        // Initialize systems
        this.battleSplash = new BattleSplash();
        this.itemDiscoverySplash = new ItemDiscoverySplash();

        this.battleUiController = new BattleUiController(this.battleUI, this.battleMap, this.turnManager, this.player);
        this.hudController = new HudController(this.player, this.hudElements, this.battleUI);
        this.worldModeController = new WorldModeController(
            this.input,
            this.player,
            this.worldMap,
            this.encounterSystem,
            this.itemDiscoverySplash,
            {
                onEnterVillage: () => this.stateMachine.transition(MODES.VILLAGE),
                onStartBattle: (enemies: Skeleton[]) => this.stateMachine.transition(MODES.BATTLE, enemies),
                onAddBattleLog: (message: string, type: string = 'system') => this.addBattleLog(message, type),
                onUpdateHUD: () => this.updateHUD(),
            }
        );

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
            buyPotionBtn: document.getElementById('village-buy-potion-btn')! as HTMLButtonElement,
            sellPotionBtn: document.getElementById('village-sell-potion-btn')! as HTMLButtonElement,
            leaveBtn: document.getElementById('village-leave-btn')! as HTMLButtonElement,
        };

        this.developerUI = {
            modal: document.getElementById('dev-events-modal')!,
            closeBtn: document.getElementById('dev-events-close-btn')! as HTMLButtonElement,
            eventType: document.getElementById('dev-event-type')! as HTMLSelectElement,
            queueList: document.getElementById('dev-events-queue')!,
            addBtn: document.getElementById('dev-event-add-btn')! as HTMLButtonElement,
            clearBtn: document.getElementById('dev-event-clear-btn')! as HTMLButtonElement,
        };

        this.villageActionsController = new VillageActionsController(this.player, this.villageUI, {
            onUpdateHUD: () => this.updateHUD(),
            onLeaveVillage: () => this.stateMachine.transition(MODES.WORLD_MAP),
        });

        this.developerEventController = new DeveloperEventController(this.developerUI, this.encounterSystem, {
            addVillageLog: (message: string, type: string = 'system') => this.villageActionsController!.addLog(message, type),
            getEventLabel: (type: ForcedEncounterType) => this.getDeveloperEventLabel(type),
        });

        // Battle button events
        this.battleUI.attackBtn.addEventListener('click', () => this.handleAttack());
        this.battleUI.fleeBtn.addEventListener('click', () => this.handleFlee());
        this.battleUI.waitBtn.addEventListener('click', () => this.handleWait());
        this.battleUI.usePotionBtn.addEventListener('click', () => this.handleUsePotion(true));

        this.hudElements.usePotionBtn.addEventListener('click', () => this.handleUsePotion(false));

        this.villageUI.enterBtn.addEventListener('click', () => this.villageActionsController!.handleEnter(this.villageLifeRenderer.getVillageName()));
        this.villageUI.skipBtn.addEventListener('click', () => this.villageActionsController!.handleSkip());
        this.villageUI.waitBtn.addEventListener('click', () => this.villageActionsController!.handleWait());
        this.villageUI.buyBtn.addEventListener('click', () => this.villageActionsController!.handleBuyBow());
        this.villageUI.sellBtn.addEventListener('click', () => this.villageActionsController!.handleSellBow());
        this.villageUI.buyPotionBtn.addEventListener('click', () => this.villageActionsController!.handleBuyPotion());
        this.villageUI.sellPotionBtn.addEventListener('click', () => this.villageActionsController!.handleSellPotion());
        this.villageUI.leaveBtn.addEventListener('click', () => this.villageActionsController!.handleLeave());

        this.developerUI.addBtn.addEventListener('click', () => this.developerEventController!.handleQueueAdd());
        this.developerUI.clearBtn.addEventListener('click', () => this.developerEventController!.handleQueueClear());
        this.developerUI.closeBtn.addEventListener('click', () => this.developerEventController!.toggleModal(false));
        this.developerUI.modal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.developerUI.modal) {
                this.developerEventController!.toggleModal(false);
            }
        });

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

        registerBackquoteToggle((): void => {
            this.developerEventController!.toggleModal();
        }, { target: document });
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
        } else if (this.stateMachine.isInState(MODES.VILLAGE)) {
            this.renderVillageMode();
        } else if (this.stateMachine.isInState(MODES.BATTLE)) {
            this.renderBattleMode();
        }

        this.renderer.endFrame();
    }

    // ============ WORLD MAP MODE ============

    private enterWorldMode(): void {
        this.worldModeController!.enterWorldMode(
            this.hudElements.modeIndicator,
            this.battleUI.sidebar,
            this.villageUI.sidebar,
        );
    }

    private updateWorldMode(deltaTime: number): void {
        void deltaTime;
        this.worldModeController!.updateWorldMode();
    }

    private renderWorldMode(): void {
        this.worldMap.draw(this.renderer.ctx, this.renderer);
        this.player.draw(this.renderer.ctx);
    }

    private renderVillageMode(): void {
        const ctx = this.renderer.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const time = performance.now() * 0.001;

        this.villageEnvironmentRenderer.render(ctx, width, height, time);
        this.villageLifeRenderer.update(time);
        this.villageLifeRenderer.render(ctx, time);

        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.font = 'bold 34px Georgia, serif';
        ctx.fillText(this.villageLifeRenderer.getVillageName(), 24, 56);
    }

    // ============ VILLAGE MODE ============

    private enterVillageMode(): void {
        this.hudElements.modeIndicator.textContent = 'Village';
        this.battleUI.sidebar.classList.add('hidden');
        this.villageLifeRenderer.initialize(this.canvas.width, this.canvas.height);
        this.villageActionsController!.enterVillage(this.villageLifeRenderer.getVillageName());
    }

    private exitVillageMode(): void {
        this.villageActionsController!.exitVillage();
    }

    private getDeveloperEventLabel(type: ForcedEncounterType): string {
        const labels: Record<ForcedEncounterType, string> = {
            skeleton: 'Skeleton battle',
            zombie: 'Zombie battle',
            ninja: 'Ninja battle',
            darkKnight: 'Dark Knight battle',
            dragon: 'Dragon battle',
            item: 'Item discovery',
            none: 'No encounter',
            village: 'Village',
        };

        return labels[type] ?? type;
    }

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
        const result = this.battleUiController!.handleMovementOrSelection(direction, this.selectedEnemy);

        if (!result.moved && result.selectedEnemy) {
            this.selectedEnemy = result.selectedEnemy;
            this.updateBattleUI();
            this.addBattleLog(`Selected ${result.selectedEnemy.name}`, 'system');
        }

        return result.moved;
    }

    private handleCanvasClick(event: MouseEvent): void {
        if (!this.stateMachine.isInState(MODES.BATTLE) ||
            !this.turnManager.isPlayerTurn() ||
            !this.turnManager.waitingForPlayer ||
            this.turnTransitioning) {
            return;
        }

        const selectedEnemy = this.battleUiController!.selectEnemyFromCanvasClick(event, this.canvas);
        if (!selectedEnemy) {
            return;
        }

        this.selectedEnemy = selectedEnemy;
        this.updateBattleUI();
        this.addBattleLog(`Selected ${selectedEnemy.name}`, 'system');
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

        if (!this.battleMap.isEntityOnEdge(this.player)) {
            this.addBattleLog('You can only flee when standing on the battle map edge.', 'system');
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
        this.selectedEnemy = this.battleUiController!.updateEnemyDisplay(this.selectedEnemy);
    }

    private enableBattleButtons(enabled: boolean): void {
        this.battleUiController!.setButtonsEnabled(enabled);
    }

    private addBattleLog(message: string, type: string = 'system'): void {
        this.battleUiController!.addBattleLog(message, type);
    }

    private clearBattleLog(): void {
        this.battleUiController!.clearBattleLog();
    }

    private describeEncounter(enemies: Skeleton[]): string {
        return this.battleUiController!.describeEncounter(enemies);
    }

    // ============ HUD ============

    private updateHUD(): void {
        this.hudController!.updateHUD();
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
