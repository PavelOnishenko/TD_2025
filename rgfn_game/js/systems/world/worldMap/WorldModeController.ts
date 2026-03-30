import InputManager from '../../../../../engine/systems/InputManager.js';
import WorldMap from './WorldMap.js';
import EncounterSystem from '../../encounter/EncounterSystem.js';
import Player from '../../../entities/player/Player.js';
import Skeleton from '../../../entities/Skeleton.js';
import Item from '../../../entities/Item.js';
import Wanderer from '../../../entities/Wanderer.js';
import { ItemDiscoverySplash } from '../../../ui/ItemDiscoverySplash.js';
import { Direction, TerrainType } from '../../../types/game.js';
import { balanceConfig } from '../../../config/balance/balanceConfig.js';

type WorldModeCallbacks = {
    onEnterVillage: () => void;
    onRequestVillageEntryPrompt: (villageName: string, anchor: { x: number; y: number }) => void;
    onCloseVillageEntryPrompt: () => void;
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

        if (this.movementInput.isActionPressed('enterVillage') && this.tryEnterVillageAtCurrentPosition()) {
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

    public tryEnterVillageAtCurrentPosition(): boolean {
        return this.villagePromptController.tryEnterVillageAtCurrentPosition();
    }

    public confirmVillageEntryFromPrompt(): boolean {
        return this.villagePromptController.confirmVillageEntryFromPrompt();
    }

    public dismissVillageEntryPrompt(): void {
        this.villagePromptController.dismissVillageEntryPrompt();
    }

    public handleCampSleep(): void {
        this.travelEncounterController.handleCampSleep();
    }
}
