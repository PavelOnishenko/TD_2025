import InputManager from '../../../engine/systems/InputManager.js';
import WorldMap from './world/WorldMap.js';
import EncounterSystem from './encounter/EncounterSystem.js';
import Player from '../entities/Player.js';
import Skeleton from '../entities/Skeleton.js';
import Item from '../entities/Item.js';
import Wanderer from '../entities/Wanderer.js';
import { ItemDiscoverySplash } from '../ui/ItemDiscoverySplash.js';
import { TerrainType } from '../types/game.js';

type WorldModeCallbacks = {
    onEnterVillage: () => void;
    onStartBattle: (enemies: Skeleton[], terrainType: TerrainType) => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
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

    public enterWorldMode(hudModeIndicator: HTMLElement, battleSidebar: HTMLElement, villageSidebar: HTMLElement): void {
        hudModeIndicator.textContent = 'World Map';
        battleSidebar.classList.add('hidden');
        villageSidebar.classList.add('hidden');

        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;

        this.callbacks.onUpdateHUD();
    }

    public updateWorldMode(): void {
        this.handleMoveAction('moveUp', 'up');
        this.handleMoveAction('moveDown', 'down');
        this.handleMoveAction('moveLeft', 'left');
        this.handleMoveAction('moveRight', 'right');

        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    private handleMoveAction(action: string, direction: 'up' | 'down' | 'left' | 'right'): void {
        if (!this.input.wasActionPressed(action)) {
            return;
        }

        const moveResult = this.worldMap.movePlayer(direction);
        if (moveResult.moved) {
            this.onPlayerMoved(moveResult.isPreviouslyDiscovered);
        }
    }

    private onPlayerMoved(isPreviouslyDiscovered: boolean): void {
        this.player.restoreMana(1);
        this.callbacks.onUpdateHUD();
        if (this.worldMap.isPlayerOnVillage()) {
            this.callbacks.onEnterVillage();
            return;
        }

        this.encounterSystem.onPlayerMove();
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

        if (encounter.type === 'village') {
            this.worldMap.markVillageAtPlayerPosition();
            this.callbacks.onEnterVillage();
            return;
        }

        if (encounter.type === 'traveler') {
            this.handleTravelerEncounter(encounter.traveler, encounter.isHostile);
        }
    }



    private handleTravelerEncounter(traveler: Wanderer, isHostile: boolean): void {
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
