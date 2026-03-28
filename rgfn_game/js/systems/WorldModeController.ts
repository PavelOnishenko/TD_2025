import InputManager from '../../../engine/systems/InputManager.js';
import WorldMap from './world/WorldMap.js';
import EncounterSystem from './encounter/EncounterSystem.js';
import Player from '../entities/Player.js';
import Skeleton from '../entities/Skeleton.js';
import Item from '../entities/Item.js';
import Wanderer from '../entities/Wanderer.js';
import { ItemDiscoverySplash } from '../ui/ItemDiscoverySplash.js';
import { Direction, TerrainType } from '../types/game.js';

type WorldModeCallbacks = {
    onEnterVillage: () => void;
    onStartBattle: (enemies: Skeleton[], terrainType: TerrainType) => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onRememberTraveler: (traveler: Wanderer, disposition: 'hostile' | 'peaceful') => void;
    getQuestBattleEncounter: () => { enemies: Skeleton[]; hint?: string } | null;
};

export default class WorldModeController {
    private input: InputManager;
    private player: Player;
    private worldMap: WorldMap;
    private encounterSystem: EncounterSystem;
    private itemDiscoverySplash: ItemDiscoverySplash;
    private callbacks: WorldModeCallbacks;

    constructor(
        input: InputManager,
        player: Player,
        worldMap: WorldMap,
        encounterSystem: EncounterSystem,
        itemDiscoverySplash: ItemDiscoverySplash,
        callbacks: WorldModeCallbacks,
    ) {
        this.input = input;
        this.player = player;
        this.worldMap = worldMap;
        this.encounterSystem = encounterSystem;
        this.itemDiscoverySplash = itemDiscoverySplash;
        this.callbacks = callbacks;
    }

    public enterWorldMode(hudModeIndicator: HTMLElement, worldSidebar: HTMLElement, battleSidebar: HTMLElement, villageSidebar: HTMLElement): void {
        hudModeIndicator.textContent = 'World Map';
        worldSidebar.classList.add('hidden');
        battleSidebar.classList.add('hidden');
        villageSidebar.classList.add('hidden');

        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;

        this.callbacks.onUpdateHUD();
    }

    public updateWorldMode(): void {
        this.handleMapViewportInput();

        if (this.input.wasActionPressed('enterVillage') && this.tryEnterVillageAtCurrentPosition()) {
            return;
        }

        const direction = this.getPendingMoveDirection();
        if (direction) {
            const moveResult = this.worldMap.movePlayer(direction);
            if (moveResult.moved) {
                this.onPlayerMoved(moveResult.isPreviouslyDiscovered);
            }
        }

        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    public tryEnterVillageAtCurrentPosition(): boolean {
        if (!this.worldMap.isPlayerOnVillage()) {
            return false;
        }

        this.callbacks.onEnterVillage();
        return true;
    }

    private handleMapViewportInput(): void {
        if (this.input.wasActionPressed('worldMapPanUp')) {
            this.worldMap.pan('up');
        }
        if (this.input.wasActionPressed('worldMapPanDown')) {
            this.worldMap.pan('down');
        }
        if (this.input.wasActionPressed('worldMapPanLeft')) {
            this.worldMap.pan('left');
        }
        if (this.input.wasActionPressed('worldMapPanRight')) {
            this.worldMap.pan('right');
        }
    }

    private getPendingMoveDirection(): Direction | null {
        const upPressed = this.wasMoveTriggered('moveUp');
        const downPressed = this.wasMoveTriggered('moveDown');
        const leftPressed = this.wasMoveTriggered('moveLeft');
        const rightPressed = this.wasMoveTriggered('moveRight');

        if (upPressed && leftPressed) {
            return 'upLeft';
        }
        if (upPressed && rightPressed) {
            return 'upRight';
        }
        if (downPressed && leftPressed) {
            return 'downLeft';
        }
        if (downPressed && rightPressed) {
            return 'downRight';
        }

        if (upPressed && this.input.isActionActive('moveLeft')) {
            return 'upLeft';
        }
        if (upPressed && this.input.isActionActive('moveRight')) {
            return 'upRight';
        }
        if (downPressed && this.input.isActionActive('moveLeft')) {
            return 'downLeft';
        }
        if (downPressed && this.input.isActionActive('moveRight')) {
            return 'downRight';
        }
        if (leftPressed && this.input.isActionActive('moveUp')) {
            return 'upLeft';
        }
        if (leftPressed && this.input.isActionActive('moveDown')) {
            return 'downLeft';
        }
        if (rightPressed && this.input.isActionActive('moveUp')) {
            return 'upRight';
        }
        if (rightPressed && this.input.isActionActive('moveDown')) {
            return 'downRight';
        }

        if (upPressed) {
            return 'up';
        }
        if (downPressed) {
            return 'down';
        }
        if (leftPressed) {
            return 'left';
        }
        if (rightPressed) {
            return 'right';
        }

        return null;
    }

    private wasMoveTriggered(action: string): boolean {
        return this.input.wasActionPressed(action);
    }

    private onPlayerMoved(isPreviouslyDiscovered: boolean): void {
        this.player.restoreMana(1);
        this.callbacks.onUpdateHUD();

        const namedLocation = this.worldMap.getCurrentNamedLocation();
        if (namedLocation) {
            this.callbacks.onAddBattleLog(`You arrive at ${namedLocation}.`, 'system');
        }

        if (this.worldMap.isPlayerOnVillage()) {
            this.callbacks.onEnterVillage();
            return;
        }

        this.encounterSystem.onPlayerMove();
        const questEncounter = this.callbacks.getQuestBattleEncounter();
        if (questEncounter) {
            if (questEncounter.hint) {
                this.callbacks.onAddBattleLog(questEncounter.hint, 'system-message');
            }
            this.callbacks.onStartBattle(questEncounter.enemies, this.worldMap.getCurrentTerrain().type);
            return;
        }

        if (!this.encounterSystem.checkEncounter(isPreviouslyDiscovered)) {
            return;
        }

        const encounter = this.encounterSystem.generateEncounter(!isPreviouslyDiscovered);
        if (encounter.type === 'battle') {
            this.callbacks.onStartBattle(encounter.enemies, this.worldMap.getCurrentTerrain().type);
            return;
        }

        if (encounter.type === 'none') {
            this.callbacks.onAddBattleLog('A dragon flies past without noticing you.', 'system');
            return;
        }

        if (encounter.type === 'item') {
            this.handleItemDiscovery(encounter.item);
            return;
        }

        if (encounter.type === 'traveler') {
            this.handleTravelerEncounter(encounter.traveler, encounter.isHostile);
        }
    }

    private handleTravelerEncounter(traveler: Wanderer, isHostile: boolean): void {
        this.callbacks.onRememberTraveler(traveler, isHostile ? 'hostile' : 'peaceful');
        if (isHostile) {
            this.callbacks.onAddBattleLog(`${traveler.name} turns hostile! ${traveler.getEncounterDescription()}`, 'enemy');
            this.callbacks.onStartBattle([traveler], this.worldMap.getCurrentTerrain().type);
            return;
        }

        this.callbacks.onAddBattleLog(`${traveler.name} greets you and offers barter. ${traveler.getEncounterDescription()}`, 'system');
        const wantsAmbush = window.confirm('A peaceful wanderer appears. Attack first?');
        if (wantsAmbush) {
            this.callbacks.onAddBattleLog('You strike first!', 'player');
            this.callbacks.onStartBattle([traveler], this.worldMap.getCurrentTerrain().type);
            return;
        }

        this.tryBarter(traveler);
    }

    private tryBarter(traveler: Wanderer): void {
        const stock = traveler.getLootItems().filter((item) => item.type !== 'consumable');
        if (stock.length === 0) {
            this.callbacks.onAddBattleLog('The wanderer has nothing to barter.', 'system');
            return;
        }

        const offer = stock[Math.floor(Math.random() * stock.length)];
        const price = Math.max(1, Math.floor(offer.goldValue * 0.7));
        if (this.player.gold < price) {
            this.callbacks.onAddBattleLog(`You cannot afford ${offer.name} (${price} gold).`, 'system');
            return;
        }

        if (!window.confirm(`Buy ${offer.name} for ${price} gold?`)) {
            this.callbacks.onAddBattleLog('You decline the barter and move on.', 'system');
            return;
        }

        if (!this.player.addItemToInventory(offer)) {
            this.callbacks.onAddBattleLog(`Inventory full. ${offer.name} could not be taken.`, 'system');
            return;
        }

        this.player.gold -= price;
        this.callbacks.onAddBattleLog(`You barter for ${offer.name}.`, 'system');
        this.callbacks.onUpdateHUD();
    }

    private handleItemDiscovery(item: Item): void {
        this.itemDiscoverySplash.showItemDiscovery(item, () => {
            const wasAdded = this.player.addItemToInventory(item);
            if (!wasAdded) {
                this.callbacks.onAddBattleLog(`Inventory full. ${item.name} was left behind.`, 'system');
            }

            this.callbacks.onUpdateHUD();
        });
    }
}
