import InputManager from '../../../../../engine/systems/InputManager.js';
import WorldMap from './WorldMap.js';
import EncounterSystem from '../../encounter/EncounterSystem.js';
import Player from '../../../entities/player/Player.js';
import Skeleton from '../../../entities/Skeleton.js';
import Wanderer from '../../../entities/Wanderer.js';
import { ItemDiscoverySplash } from '../../../ui/ItemDiscoverySplash.js';
import { TerrainType } from '../../../types/game.js';
import WorldModeMovementInput from '../../world-mode/WorldModeMovementInput.js';
import WorldModeVillagePromptController from '../../world-mode/WorldModeVillagePromptController.js';
import WorldModeTravelEncounterController from '../../world-mode/WorldModeTravelEncounterController.js';

type WorldModeCallbacks = {
    onEnterVillage: () => void;
    onRequestVillageEntryPrompt: (villageName: string, anchor: { x: number; y: number }) => void;
    onCloseVillageEntryPrompt: () => void;
    onRequestFerryPrompt: (routes: Array<{ destinationVillage: string; destinationDock: { col: number; row: number }; waterPathLength: number; priceGold: number }>, anchor: { x: number; y: number }) => void;
    onCloseFerryPrompt: () => void;
    onStartBattle: (enemies: Skeleton[], terrainType: TerrainType) => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onRememberTraveler: (traveler: Wanderer, disposition: 'hostile' | 'peaceful') => void;
    getQuestBattleEncounter: () => { enemies: Skeleton[]; hint?: string } | null;
};

export default class WorldModeController {
    private player: Player;
    private worldMap: WorldMap;
    private callbacks: WorldModeCallbacks;
    private movementInput: WorldModeMovementInput;
    private villagePromptController: WorldModeVillagePromptController;
    private travelEncounterController: WorldModeTravelEncounterController;
    private isFerryPromptOpen = false;

    constructor(
        input: InputManager,
        player: Player,
        worldMap: WorldMap,
        encounterSystem: EncounterSystem,
        itemDiscoverySplash: ItemDiscoverySplash,
        callbacks: WorldModeCallbacks,
    ) {
        this.player = player;
        this.callbacks = callbacks;
        this.worldMap = worldMap;
        this.movementInput = new WorldModeMovementInput(input, worldMap);
        this.villagePromptController = new WorldModeVillagePromptController(worldMap, callbacks);
        this.travelEncounterController = new WorldModeTravelEncounterController(
            player,
            worldMap,
            encounterSystem,
            itemDiscoverySplash,
            callbacks,
            this.villagePromptController,
        );
    }

    public enterWorldMode(hudModeIndicator: HTMLElement, worldSidebar: HTMLElement, battleSidebar: HTMLElement, villageSidebar: HTMLElement): void {
        this.villagePromptController.closeVillageEntryPrompt();
        this.dismissFerryPrompt();
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
        this.movementInput.handleMapViewportInput();
        this.villagePromptController.syncVillagePromptWithPlayerPosition();
        this.syncFerryPromptWithPlayerPosition();

        if (this.movementInput.isActionPressed('enterVillage')) {
            if (this.tryEnterVillageAtCurrentPosition()) {
                return;
            }
            if (this.tryOpenFerryPromptAtCurrentPosition()) {
                return;
            }
        }

        if (this.isFerryPromptOpen) {
            return;
        }

        const direction = this.movementInput.getPendingMoveDirection();
        if (direction) {
            const moveResult = this.worldMap.movePlayer(direction);
            if (moveResult.moved) {
                this.travelEncounterController.onPlayerMoved(moveResult.isPreviouslyDiscovered);
            }
        }

        const [px, py] = this.worldMap.getPlayerPixelPosition();
        this.player.x = px;
        this.player.y = py;
    }

    public readonly tryEnterVillageAtCurrentPosition = (): boolean => this.villagePromptController.tryEnterVillageAtCurrentPosition();

    public tryOpenFerryPromptAtCurrentPosition(): boolean {
        if (!this.worldMap.isPlayerOnFerryDock()) {
            return false;
        }

        const routes = this.worldMap.getFerryRoutesAtPlayerDock();
        if (routes.length === 0) {
            return false;
        }
        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.isFerryPromptOpen = true;
        this.callbacks.onRequestFerryPrompt(routes, { x, y });
        return true;
    }

    public readonly confirmVillageEntryFromPrompt = (): boolean => this.villagePromptController.confirmVillageEntryFromPrompt();

    public dismissVillageEntryPrompt(): void {
        this.villagePromptController.dismissVillageEntryPrompt();
    }

    public dismissFerryPrompt(): void {
        if (!this.isFerryPromptOpen) {
            return;
        }
        this.isFerryPromptOpen = false;
        this.callbacks.onCloseFerryPrompt();
    }

    public confirmFerryTravel(routeIndex: number): boolean {
        const routes = this.worldMap.getFerryRoutesAtPlayerDock();
        const route = routes[routeIndex];
        if (!route) {
            this.dismissFerryPrompt();
            return false;
        }

        if (this.player.gold < route.priceGold) {
            this.callbacks.onAddBattleLog(`Not enough gold for ferry fare (${route.priceGold} needed).`, 'system');
            return false;
        }

        this.player.gold -= route.priceGold;
        const moved = this.worldMap.travelByFerryToDock(route.destinationDock);
        if (!moved) {
            this.callbacks.onAddBattleLog('The ferryman refuses: this route is unavailable right now.', 'system');
            return false;
        }

        this.dismissFerryPrompt();
        this.callbacks.onAddBattleLog(`You pay ${route.priceGold} gold and board the ferry to ${route.destinationVillage}.`, 'system');
        this.callbacks.onAddBattleLog(`After crossing ${route.waterPathLength} water cells, you dock near ${route.destinationVillage}.`, 'system-message');
        this.callbacks.onUpdateHUD();
        return true;
    }

    public handleCampSleep(): void {
        this.travelEncounterController.handleCampSleep();
    }

    private syncFerryPromptWithPlayerPosition(): void {
        if (!this.isFerryPromptOpen) {
            return;
        }

        if (!this.worldMap.isPlayerOnFerryDock()) {
            this.dismissFerryPrompt();
            return;
        }

        const routes = this.worldMap.getFerryRoutesAtPlayerDock();
        if (routes.length === 0) {
            this.dismissFerryPrompt();
            return;
        }
        const [x, y] = this.worldMap.getPlayerPixelPosition();
        this.callbacks.onRequestFerryPrompt(routes, { x, y });
    }
}
