import GameLoop from '../../engine/core/GameLoop.js';
import Renderer from '../../engine/core/Renderer.js';
import InputManager from '../../engine/systems/InputManager.js';
import StateMachine from './utils/StateMachine.js';
import WorldMap from './systems/WorldMap.js';
import BattleMap from './systems/BattleMap.js';
import TurnManager from './systems/TurnManager.js';
import EncounterSystem, { ForcedEncounterType } from './systems/EncounterSystem.js';
import Player from './entities/Player.js';
import Skeleton from './entities/Skeleton.js';
import Item, { HEALING_POTION_ITEM } from './entities/Item.js';
import { BOW_ITEM } from './entities/Item.js';
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

const VILLAGE_BOW_BUY_PRICE = 15;
const VILLAGE_BOW_SELL_PRICE = 8;
const VILLAGE_HEALING_POTION_BUY_PRICE = 4;
const VILLAGE_HEALING_POTION_SELL_PRICE = 2;

type VillageActivityType = 'chatting' | 'drinking' | 'farming' | 'building' | 'carryingWater' | 'carryingLogs';

type VillageSpot = {
    x: number;
    y: number;
    houseIndex?: number;
};

type VillageHouse = {
    x: number;
    y: number;
    width: number;
    height: number;
    roofColor: string;
    doorOpenAmount: number;
    doorTargetOpenAmount: number;
    doorStateUntil: number;
};

type VillageVillager = {
    x: number;
    y: number;
    fromSpot: number;
    toSpot: number;
    travelStart: number;
    travelDuration: number;
    pauseUntil: number;
    skinColor: string;
    hairColor: string;
    shirtColor: string;
    pantsColor: string;
    hatColor: string;
    size: number;
    activity: VillageActivityType;
    propSwingOffset: number;
    armSwingOffset: number;
    isWalking: boolean;
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
    private villageHouses: VillageHouse[];
    private villageSpots: VillageSpot[];
    private villageVillagers: VillageVillager[];
    private currentVillageName: string;

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
        this.villageHouses = [];
        this.villageSpots = [];
        this.villageVillagers = [];
        this.currentVillageName = '';
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
        this.villageUI.buyPotionBtn.addEventListener('click', () => this.handleVillageBuyPotion());
        this.villageUI.sellPotionBtn.addEventListener('click', () => this.handleVillageSellPotion());
        this.villageUI.leaveBtn.addEventListener('click', () => this.handleVillageLeave());

        this.developerUI.addBtn.addEventListener('click', () => this.handleDeveloperQueueAdd());
        this.developerUI.clearBtn.addEventListener('click', () => this.handleDeveloperQueueClear());
        this.developerUI.closeBtn.addEventListener('click', () => this.toggleDeveloperModal(false));
        this.developerUI.modal.addEventListener('click', (event: MouseEvent) => {
            if (event.target === this.developerUI.modal) {
                this.toggleDeveloperModal(false);
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
            this.toggleDeveloperModal();
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
            } else if (encounter.type === 'village') {
                this.stateMachine.transition(MODES.VILLAGE);
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

    private renderVillageMode(): void {
        const ctx = this.renderer.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const time = performance.now() * 0.001;

        const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
        skyGradient.addColorStop(0, this.mixColors(theme.worldMap.terrain.water, theme.worldMap.background, 0.28));
        skyGradient.addColorStop(0.58, this.mixColors(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.55));
        skyGradient.addColorStop(0.59, this.mixColors(theme.worldMap.terrain.grass, theme.ui.panelHighlight, 0.35));
        skyGradient.addColorStop(1, this.mixColors(theme.worldMap.terrain.forest, theme.worldMap.terrain.grass, 0.45));
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, width, height);

        const sunPulse = 10 + Math.sin(time * 1.8) * 2;
        ctx.fillStyle = theme.ui.panelHighlight;
        ctx.beginPath();
        ctx.arc(width * 0.84, height * 0.2, 42 + sunPulse, 0, Math.PI * 2);
        ctx.fill();

        const cloudOffset = (time * 22) % (width + 260);
        this.drawVillageCloud(width - cloudOffset, 95, 1.1);
        this.drawVillageCloud(width - cloudOffset * 0.7 - 220, 150, 0.85);
        this.drawVillageCloud(width - cloudOffset * 1.2 + 120, 72, 0.7);

        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.forest, theme.worldMap.terrain.grass, 0.35);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.6);
        ctx.quadraticCurveTo(width * 0.22, height * 0.5, width * 0.44, height * 0.62);
        ctx.quadraticCurveTo(width * 0.7, height * 0.72, width, height * 0.58);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        if (this.villageHouses.length === 0) {
            this.initializeVillageScene();
        }

        this.drawVillageField(width * 0.08, height * 0.71, width * 0.33, height * 0.18, time);
        this.drawVillageBuildSite(width * 0.72, height * 0.74, width * 0.17, height * 0.14);
        this.drawVillageWell(width * 0.51, height * 0.71, width * 0.08, height * 0.1, time);

        this.updateVillageHouseDoors(time);
        this.villageHouses.forEach((house) => {
            this.drawVillageHouse(house);
        });

        ctx.strokeStyle = this.mixColors(theme.ui.panelHighlight, theme.ui.secondaryBg, 0.45);
        ctx.lineWidth = 24;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.85);
        ctx.quadraticCurveTo(width * 0.4, height * 0.75, width * 0.8, height * 0.88);
        ctx.lineTo(width, height * 0.92);
        ctx.stroke();

        this.updateVillageVillagers(time);
        this.villageVillagers.forEach((villager) => this.drawVillageVillager(villager, time));

        ctx.fillStyle = this.withOpacity(theme.ui.primaryAccent, 0.62);
        ctx.font = 'bold 34px Georgia, serif';
        ctx.fillText(this.currentVillageName, 24, 56);
    }

    private initializeVillageScene(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const roofVariants = [
            theme.ui.secondaryAccent,
            this.mixColors(theme.ui.secondaryAccent, theme.ui.primaryAccent, 0.2),
            this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.desert, 0.28),
            this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.forest, 0.3),
            this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.mountain, 0.2),
        ];

        this.currentVillageName = this.generateVillageName();

        this.villageHouses = [
            this.createVillageHouse(width * 0.1, height * 0.61, 104, 68, roofVariants[0]),
            this.createVillageHouse(width * 0.26, height * 0.58, 116, 74, roofVariants[1]),
            this.createVillageHouse(width * 0.45, height * 0.57, 108, 70, roofVariants[2]),
            this.createVillageHouse(width * 0.64, height * 0.56, 124, 78, roofVariants[3]),
            this.createVillageHouse(width * 0.82, height * 0.61, 96, 64, roofVariants[4]),
        ];

        this.villageSpots = [
            { x: width * 0.13, y: height * 0.8, houseIndex: 0 },
            { x: width * 0.23, y: height * 0.84 },
            { x: width * 0.33, y: height * 0.8, houseIndex: 1 },
            { x: width * 0.43, y: height * 0.84 },
            { x: width * 0.55, y: height * 0.8, houseIndex: 2 },
            { x: width * 0.67, y: height * 0.84 },
            { x: width * 0.79, y: height * 0.81, houseIndex: 3 },
            { x: width * 0.57, y: height * 0.7 },
            { x: width * 0.78, y: height * 0.7, houseIndex: 4 },
            { x: width * 0.31, y: height * 0.7 },
        ];

        const villagerCount = 4 + Math.floor(Math.random() * 3);
        this.villageVillagers = Array.from({ length: villagerCount }, () => this.createVillageVillager(performance.now() * 0.001));
    }

    private createVillageHouse(x: number, y: number, width: number, height: number, roofColor: string): VillageHouse {
        return {
            x,
            y,
            width,
            height,
            roofColor,
            doorOpenAmount: 0,
            doorTargetOpenAmount: 0,
            doorStateUntil: 0,
        };
    }

    private drawVillageField(x: number, y: number, width: number, height: number, time: number): void {
        const ctx = this.renderer.ctx;
        const outlineColor = this.getOutlineColor();

        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.grass, theme.worldMap.terrain.forest, 0.55);
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        const rows = 5;
        const cols = 10;
        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const px = x + 12 + col * ((width - 24) / (cols - 1));
                const py = y + 14 + row * ((height - 24) / (rows - 1));
                const sway = Math.sin(time * 0.9 + col * 0.5 + row * 0.7) * 2.2;

                ctx.strokeStyle = this.mixColors(theme.worldMap.terrain.grass, theme.ui.panelHighlight, 0.25);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px, py + 6);
                ctx.lineTo(px - 2 + sway, py - 2);
                ctx.stroke();

                ctx.strokeStyle = this.withOpacity(outlineColor, 0.55);
                ctx.beginPath();
                ctx.moveTo(px, py + 6);
                ctx.lineTo(px + 2 + sway * 0.6, py - 1);
                ctx.stroke();
            }
        }
    }

    private drawVillageWell(x: number, y: number, width: number, height: number, time: number): void {
        const ctx = this.renderer.ctx;
        const outlineColor = this.getOutlineColor();
        ctx.fillStyle = this.mixColors(theme.ui.panelHighlight, theme.ui.secondaryBg, 0.4);
        ctx.fillRect(x, y + height * 0.25, width, height * 0.75);

        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y + height * 0.25, width, height * 0.75);

        ctx.beginPath();
        ctx.moveTo(x + width * 0.2, y + height * 0.25);
        ctx.lineTo(x + width * 0.2, y - height * 0.48);
        ctx.moveTo(x + width * 0.8, y + height * 0.25);
        ctx.lineTo(x + width * 0.8, y - height * 0.48);
        ctx.moveTo(x + width * 0.2, y - height * 0.48);
        ctx.lineTo(x + width * 0.8, y - height * 0.48);
        ctx.strokeStyle = outlineColor;
        ctx.stroke();

        const bucketOffset = Math.sin(time * 1.4) * (height * 0.1);
        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.water, theme.ui.panelHighlight, 0.4);
        ctx.fillRect(x + width * 0.4, y - height * 0.22 + bucketOffset, width * 0.22, height * 0.18);
    }

    private drawVillageBuildSite(x: number, y: number, width: number, height: number): void {
        const ctx = this.renderer.ctx;
        const outlineColor = this.getOutlineColor();
        ctx.fillStyle = this.mixColors(theme.worldMap.terrain.desert, theme.worldMap.terrain.mountain, 0.3);
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = this.mixColors(theme.ui.secondaryAccent, theme.worldMap.terrain.forest, 0.2);
        const planks = [
            [x + width * 0.08, y + height * 0.25, width * 0.62, height * 0.08],
            [x + width * 0.12, y + height * 0.42, width * 0.68, height * 0.08],
            [x + width * 0.2, y + height * 0.6, width * 0.56, height * 0.08],
        ];

        planks.forEach(([px, py, pw, ph]) => {
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeRect(px, py, pw, ph);
        });
    }

    private drawVillageCloud(x: number, y: number, scale: number): void {
        const ctx = this.renderer.ctx;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const outlineColor = this.getOutlineColor();
        ctx.fillStyle = this.withOpacity(theme.ui.panelHighlight, 0.9);
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.arc(28, -8, 30, 0, Math.PI * 2);
        ctx.arc(62, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.withOpacity(outlineColor, 0.6);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    private updateVillageHouseDoors(now: number): void {
        this.villageHouses.forEach((house) => {
            const shouldBeOpen = now < house.doorStateUntil;
            house.doorTargetOpenAmount = shouldBeOpen ? 1 : 0;
            const speed = shouldBeOpen ? 0.17 : 0.1;
            house.doorOpenAmount += (house.doorTargetOpenAmount - house.doorOpenAmount) * speed;
            house.doorOpenAmount = Math.max(0, Math.min(1, house.doorOpenAmount));
        });
    }

    private triggerHouseDoorBySpot(spotIndex: number, now: number): void {
        const spot = this.villageSpots[spotIndex];
        if (!spot || typeof spot.houseIndex !== 'number') {
            return;
        }

        const house = this.villageHouses[spot.houseIndex];
        if (!house) {
            return;
        }

        house.doorStateUntil = Math.max(house.doorStateUntil, now + 2.2);
    }

    private drawVillageHouse(house: VillageHouse): void {
        const ctx = this.renderer.ctx;
        const { x, y, width, height, roofColor, doorOpenAmount } = house;
        const roofHeight = height * 0.44;
        const isoDepth = width * 0.16;
        const outlineColor = this.getOutlineColor();
        const woodFront = '#7b5736';
        const woodSide = '#634629';
        const doorColor = '#6f4a2e';

        ctx.fillStyle = woodFront;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = woodSide;
        ctx.beginPath();
        ctx.moveTo(x + width, y);
        ctx.lineTo(x + width + isoDepth, y - isoDepth * 0.35);
        ctx.lineTo(x + width + isoDepth, y + height - isoDepth * 0.35);
        ctx.lineTo(x + width, y + height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = roofColor;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + width * 0.48, y - roofHeight);
        ctx.lineTo(x + width + 10, y);
        ctx.lineTo(x + width + isoDepth, y - isoDepth * 0.35);
        ctx.lineTo(x + width * 0.48 + isoDepth, y - roofHeight - isoDepth * 0.35);
        ctx.lineTo(x - 10 + isoDepth, y - isoDepth * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const doorX = x + width * 0.4;
        const doorY = y + height * 0.46;
        const doorWidth = width * 0.2;
        const doorHeight = height * 0.54;
        const doorSwingRadians = (Math.PI / 2) * doorOpenAmount;
        const openEdgeX = doorX + Math.cos(doorSwingRadians) * doorWidth;
        const openEdgeY = doorY - Math.sin(doorSwingRadians) * doorWidth * 0.34;

        // doorway frame (house opening)
        ctx.fillStyle = '#4f3520';
        ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
        ctx.strokeRect(doorX, doorY, doorWidth, doorHeight);

        // actual door quad rotating on left hinge
        ctx.fillStyle = doorColor;
        ctx.beginPath();
        ctx.moveTo(doorX, doorY);
        ctx.lineTo(openEdgeX, openEdgeY);
        ctx.lineTo(openEdgeX, openEdgeY + doorHeight);
        ctx.lineTo(doorX, doorY + doorHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const knobX = doorX + (openEdgeX - doorX) * 0.84;
        const knobY = doorY + doorHeight * 0.54 + (openEdgeY - doorY) * 0.2;
        ctx.fillStyle = '#d7b579';
        ctx.beginPath();
        ctx.arc(knobX, knobY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const windowColor = this.withOpacity(theme.worldMap.terrain.water, 0.55);
        const windows = [
            [x + width * 0.12, y + height * 0.32, width * 0.15, height * 0.2],
            [x + width * 0.7, y + height * 0.32, width * 0.15, height * 0.2],
        ];
        ctx.fillStyle = windowColor;
        windows.forEach(([wx, wy, ww, wh]) => {
            ctx.fillRect(wx, wy, ww, wh);
            ctx.strokeRect(wx, wy, ww, wh);
        });
    }

    private createVillageVillager(now: number): VillageVillager {
        const fromSpot = Math.floor(Math.random() * this.villageSpots.length);
        let toSpot = Math.floor(Math.random() * this.villageSpots.length);
        if (toSpot === fromSpot) {
            toSpot = (toSpot + 1) % this.villageSpots.length;
        }

        const activities: VillageActivityType[] = ['chatting', 'drinking', 'farming', 'building', 'carryingWater', 'carryingLogs'];
        const skinPalette = ['#f6d1b6', '#deb08c', '#bd865f', '#8f5f3d'];
        const hairPalette = ['#2f1b14', '#473128', '#6a4a37', '#bfa67a', '#1f2328'];
        const shirtPalette = [theme.entities.player.body, theme.worldMap.terrain.water, '#c47f2c', '#4ea06d', '#7f6ed6'];
        const pantsPalette = ['#2f3b4c', '#4d4d52', '#5a3f3f', '#344b2e'];
        const hatPalette = ['#9c6d44', '#4d6f96', '#6b8d3f', '#7f4b8a', '#3e3e3e'];

        const startSpot = this.villageSpots[fromSpot];
        return {
            x: startSpot.x,
            y: startSpot.y,
            fromSpot,
            toSpot,
            travelStart: now - Math.random() * 1.5,
            travelDuration: 4.8 + Math.random() * 3.6,
            pauseUntil: now + 4 + Math.random() * 8,
            skinColor: skinPalette[Math.floor(Math.random() * skinPalette.length)],
            hairColor: hairPalette[Math.floor(Math.random() * hairPalette.length)],
            shirtColor: shirtPalette[Math.floor(Math.random() * shirtPalette.length)],
            pantsColor: pantsPalette[Math.floor(Math.random() * pantsPalette.length)],
            hatColor: hatPalette[Math.floor(Math.random() * hatPalette.length)],
            size: 0.86 + Math.random() * 0.26,
            activity: activities[Math.floor(Math.random() * activities.length)],
            propSwingOffset: Math.random() * Math.PI * 2,
            armSwingOffset: Math.random() * Math.PI * 2,
            isWalking: true,
        };
    }

    private updateVillageVillagers(now: number): void {
        this.villageVillagers.forEach((villager) => {
            if (now < villager.pauseUntil) {
                villager.isWalking = false;
                return;
            }

            if (villager.fromSpot === villager.toSpot) {
                if (Math.random() < 0.62) {
                    villager.pauseUntil = now + 5 + Math.random() * 10;
                    villager.isWalking = false;
                    return;
                }

                let next = Math.floor(Math.random() * this.villageSpots.length);
                if (next === villager.fromSpot) {
                    next = (next + 1) % this.villageSpots.length;
                }
                villager.toSpot = next;
                villager.travelStart = now;
                villager.travelDuration = 5 + Math.random() * 4;
                villager.isWalking = true;
                this.triggerHouseDoorBySpot(villager.fromSpot, now);
                this.triggerHouseDoorBySpot(villager.toSpot, now);
            }

            const from = this.villageSpots[villager.fromSpot];
            const to = this.villageSpots[villager.toSpot];
            const travelProgress = (now - villager.travelStart) / villager.travelDuration;

            if (travelProgress >= 1) {
                villager.fromSpot = villager.toSpot;
                villager.toSpot = villager.fromSpot;
                villager.travelStart = now;
                villager.travelDuration = 5 + Math.random() * 4;
                villager.pauseUntil = now + 6 + Math.random() * 14;
                villager.isWalking = false;
                this.triggerHouseDoorBySpot(villager.fromSpot, now);

                const activities: VillageActivityType[] = ['chatting', 'drinking', 'farming', 'building', 'carryingWater', 'carryingLogs'];
                villager.activity = activities[Math.floor(Math.random() * activities.length)];
                return;
            }

            villager.isWalking = true;
            const smoothProgress = travelProgress * travelProgress * (3 - 2 * travelProgress);
            villager.x = from.x + (to.x - from.x) * smoothProgress;
            villager.y = from.y + (to.y - from.y) * smoothProgress;
        });

        this.villageVillagers.sort((a, b) => a.y - b.y);
    }

    private drawVillageVillager(villager: VillageVillager, time: number): void {
        const walkSpeed = villager.isWalking ? 4.4 : 1.2;
        const stepAmplitude = villager.isWalking ? 4.2 : 0.9;
        const stepOffset = Math.sin(time * walkSpeed + villager.propSwingOffset) * stepAmplitude;
        const armOffset = Math.sin(time * walkSpeed + villager.armSwingOffset + Math.PI * 0.5) * stepAmplitude;
        this.drawVillager(villager.x, villager.y, villager.shirtColor, stepOffset, villager, armOffset);
    }

    private drawVillager(x: number, y: number, shirtColor: string, stepOffset: number, villager?: VillageVillager, armOffset: number = 0): void {
        const ctx = this.renderer.ctx;
        const size = villager?.size ?? 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(size, size);

        const outlineColor = this.getOutlineColor();

        ctx.fillStyle = this.withOpacity(theme.ui.primaryAccent, 0.22);
        ctx.beginPath();
        ctx.ellipse(0, 16, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.withOpacity(outlineColor, 0.5);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = villager?.skinColor ?? this.mixColors(theme.ui.panelHighlight, theme.ui.secondaryBg, 0.2);
        ctx.beginPath();
        ctx.arc(0, -20, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.stroke();

        ctx.fillStyle = villager?.hairColor ?? theme.ui.primaryAccent;
        ctx.fillRect(-9, -30, 18, 7);
        ctx.strokeRect(-9, -30, 18, 7);

        if (villager) {
            ctx.fillStyle = villager.hatColor;
            ctx.fillRect(-10, -37, 20, 4);
            ctx.fillRect(-6, -43, 12, 7);
            ctx.strokeRect(-10, -37, 20, 4);
            ctx.strokeRect(-6, -43, 12, 7);
        }

        ctx.fillStyle = shirtColor;
        ctx.fillRect(-9, -10, 18, 24);
        ctx.strokeRect(-9, -10, 18, 24);

        if (villager) {
            ctx.strokeStyle = villager.skinColor;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-9, -2);
            ctx.lineTo(-17 + armOffset * 0.45, 12 + Math.abs(stepOffset) * 0.2);
            ctx.moveTo(9, -2);
            ctx.lineTo(17 - armOffset * 0.45, 12 + Math.abs(stepOffset) * 0.2);
            ctx.stroke();
        }

        ctx.strokeStyle = theme.ui.primaryAccent;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-5, 14);
        ctx.lineTo(-7 + stepOffset * 0.32, 34);
        ctx.moveTo(5, 14);
        ctx.lineTo(7 - stepOffset * 0.32, 34);
        ctx.stroke();

        if (villager) {
            ctx.strokeStyle = villager.pantsColor;
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(-5, 14);
            ctx.lineTo(-6 + stepOffset * 0.24, 34);
            ctx.moveTo(5, 14);
            ctx.lineTo(6 - stepOffset * 0.24, 34);
            ctx.stroke();

            this.drawVillagerActivityProp(villager, stepOffset, armOffset);
        }

        ctx.restore();
    }

    private drawVillagerActivityProp(villager: VillageVillager, stepOffset: number, armOffset: number): void {
        const ctx = this.renderer.ctx;
        const outlineColor = this.getOutlineColor();
        ctx.fillStyle = this.mixColors(theme.ui.secondaryAccent, theme.ui.panelHighlight, 0.2);
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1.6;

        switch (villager.activity) {
            case 'drinking':
                ctx.fillRect(8, -4, 5, 8);
                ctx.strokeRect(8, -4, 5, 8);
                break;
            case 'farming':
                ctx.beginPath();
                ctx.moveTo(8, 2);
                ctx.lineTo(19 + armOffset * 0.2, 12 + stepOffset * 0.2);
                ctx.stroke();
                break;
            case 'building':
                ctx.fillRect(8, -2, 10, 4);
                ctx.strokeRect(8, -2, 10, 4);
                break;
            case 'carryingWater':
                ctx.fillRect(-14, 2, 8, 8);
                ctx.fillRect(8, 2, 8, 8);
                ctx.strokeRect(-14, 2, 8, 8);
                ctx.strokeRect(8, 2, 8, 8);
                break;
            case 'carryingLogs':
                ctx.fillRect(-12, 0, 24, 4);
                ctx.strokeRect(-12, 0, 24, 4);
                break;
            case 'chatting':
            default:
                ctx.beginPath();
                ctx.arc(12, -14, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }

    // ============ VILLAGE MODE ============

    private enterVillageMode(): void {
        this.hudElements.modeIndicator.textContent = 'Village';
        this.battleUI.sidebar.classList.add('hidden');
        this.villageUI.sidebar.classList.remove('hidden');
        this.villageUI.prompt.classList.remove('hidden');
        this.villageUI.actions.classList.add('hidden');
        this.villageUI.log.innerHTML = '';
        this.initializeVillageScene();
        this.addVillageLog(`You discover ${this.currentVillageName}. Enter it?`, 'system');
        this.updateVillageButtons();
    }

    private exitVillageMode(): void {
        this.villageUI.sidebar.classList.add('hidden');
    }

    private handleVillageEnter(): void {
        this.villageUI.prompt.classList.add('hidden');
        this.villageUI.actions.classList.remove('hidden');
        this.addVillageLog(`You enter ${this.currentVillageName} market square.`, 'system');
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

        const bow = new Item(BOW_ITEM);
        const addedToInventory = this.player.addItemToInventory(bow);

        if (!addedToInventory) {
            this.addVillageLog('Inventory full. You cannot buy the bow.', 'system');
            return;
        }

        this.player.gold -= VILLAGE_BOW_BUY_PRICE;
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


    private handleVillageBuyPotion(): void {
        if (this.player.gold < VILLAGE_HEALING_POTION_BUY_PRICE) {
            this.addVillageLog(`Not enough gold. Healing Potion costs ${VILLAGE_HEALING_POTION_BUY_PRICE}.`, 'system');
            return;
        }

        const wasAdded = this.player.addItemToInventory(new Item(HEALING_POTION_ITEM));
        if (!wasAdded) {
            this.addVillageLog('Your inventory is full. Cannot buy a Healing Potion.', 'system');
            return;
        }

        this.player.gold -= VILLAGE_HEALING_POTION_BUY_PRICE;
        this.addVillageLog(`You bought a Healing Potion for ${VILLAGE_HEALING_POTION_BUY_PRICE} gold.`, 'player');
        this.updateHUD();
        this.updateVillageButtons();
    }

    private handleVillageSellPotion(): void {
        const soldPotion = this.player.removeHealingPotionFromInventory();
        if (!soldPotion) {
            this.addVillageLog('You have no Healing Potion to sell.', 'system');
            return;
        }

        this.player.gold += VILLAGE_HEALING_POTION_SELL_PRICE;
        this.addVillageLog(`You sold a Healing Potion for ${VILLAGE_HEALING_POTION_SELL_PRICE} gold.`, 'player');
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
        const potionCount = this.player.getHealingPotionCount();

        this.villageUI.buyBtn.disabled = hasBowEquipped || !canAffordBow;
        this.villageUI.sellBtn.disabled = !hasBowEquipped;
        this.villageUI.buyPotionBtn.disabled = this.player.gold < VILLAGE_HEALING_POTION_BUY_PRICE;
        this.villageUI.sellPotionBtn.disabled = potionCount === 0;
    }

    private addVillageLog(message: string, type: string = 'system'): void {
        const line = document.createElement('div');
        line.textContent = message;
        line.classList.add(type + '-action');
        this.villageUI.log.appendChild(line);
        this.villageUI.log.scrollTop = this.villageUI.log.scrollHeight;
    }


    private toggleDeveloperModal(forceVisible?: boolean): void {
        const shouldShow = typeof forceVisible === 'boolean'
            ? forceVisible
            : this.developerUI.modal.classList.contains('hidden');

        this.developerUI.modal.classList.toggle('hidden', !shouldShow);
        if (shouldShow) {
            this.renderDeveloperQueue();
        }
    }

    private handleDeveloperQueueAdd(): void {
        const type = this.developerUI.eventType.value as ForcedEncounterType;
        this.encounterSystem.queueForcedEncounter(type);
        this.renderDeveloperQueue();
        this.addVillageLog(`[DEV] Queued event: ${this.getDeveloperEventLabel(type)}`, 'system');
    }

    private handleDeveloperQueueClear(): void {
        this.encounterSystem.clearForcedEncounters();
        this.renderDeveloperQueue();
    }

    private renderDeveloperQueue(): void {
        const queue = this.encounterSystem.getForcedEncounterQueue();
        this.developerUI.queueList.innerHTML = '';

        if (queue.length === 0) {
            const item = document.createElement('li');
            item.textContent = 'No queued events.';
            this.developerUI.queueList.appendChild(item);
            return;
        }

        queue.forEach((entry, index) => {
            const item = document.createElement('li');
            item.textContent = `${index + 1}. ${this.getDeveloperEventLabel(entry)}`;
            this.developerUI.queueList.appendChild(item);
        });
    }

    private getOutlineColor(): string {
        return '#1d1b22';
    }

    private generateVillageName(): string {
        const first = ['Oak', 'River', 'Sun', 'Stone', 'Amber', 'Willow', 'Moss', 'Silver', 'Pine', 'Moon'];
        const second = ['ford', 'field', 'brook', 'haven', 'hill', 'cross', 'watch', 'stead', 'rest', 'meadow'];
        const prefix = first[Math.floor(Math.random() * first.length)];
        const suffix = second[Math.floor(Math.random() * second.length)];
        return `${prefix}${suffix}`;
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

    private withOpacity(hex: string, alpha: number): string {
        const normalized = hex.replace('#', '');
        if (normalized.length !== 6) {
            return hex;
        }

        const r = parseInt(normalized.slice(0, 2), 16);
        const g = parseInt(normalized.slice(2, 4), 16);
        const b = parseInt(normalized.slice(4, 6), 16);

        if ([r, g, b].some((value) => Number.isNaN(value))) {
            return hex;
        }

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    private mixColors(colorA: string, colorB: string, ratio: number): string {
        const parse = (value: string): [number, number, number] | null => {
            const normalized = value.replace('#', '');
            if (normalized.length !== 6) {
                return null;
            }
            const r = parseInt(normalized.slice(0, 2), 16);
            const g = parseInt(normalized.slice(2, 4), 16);
            const b = parseInt(normalized.slice(4, 6), 16);
            if ([r, g, b].some((item) => Number.isNaN(item))) {
                return null;
            }
            return [r, g, b];
        };

        const from = parse(colorA);
        const to = parse(colorB);
        if (!from || !to) {
            return colorA;
        }

        const safeRatio = Math.max(0, Math.min(1, ratio));
        const blend = (start: number, end: number): number => Math.round(start + (end - start) * safeRatio);

        return `rgb(${blend(from[0], to[0])}, ${blend(from[1], to[1])}, ${blend(from[2], to[2])})`;
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
        this.battleUI.fleeBtn.disabled = !enabled || !this.battleMap.isEntityOnEdge(this.player);
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