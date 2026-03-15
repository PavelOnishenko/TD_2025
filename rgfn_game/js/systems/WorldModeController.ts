import InputManager from '../../../engine/systems/InputManager.js';
import WorldMap from './world/WorldMap.js';
import EncounterSystem from './encounter/EncounterSystem.js';
import Player from '../entities/Player.js';
import Skeleton from '../entities/Skeleton.js';
import Item from '../entities/Item.js';
import { ItemDiscoverySplash } from '../ui/ItemDiscoverySplash.js';

type WorldModeCallbacks = {
    onEnterVillage: () => void;
    onStartBattle: (enemies: Skeleton[]) => void;
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

        const encounter = this.encounterSystem.generateEncounter();
        if (encounter.type === 'battle') {
            this.callbacks.onStartBattle(encounter.enemies);
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
        }
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
