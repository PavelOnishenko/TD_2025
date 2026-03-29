import BattleMap from '../../systems/combat/BattleMap.js';
import WorldMap from '../../systems/world/WorldMap.js';
import Player from '../../entities/player/Player.js';
import GameModeStateMachine, { MODES } from '../../systems/game/runtime/GameModeStateMachine.js';
import GameHudCoordinator from '../../systems/game/runtime/GameHudCoordinator.js';
import WorldModeController from '../../systems/WorldModeController.js';
import { WorldUI } from '../../systems/game/GameUiTypes.js';

export default class GameWorldInteractionRuntime {
    private isWorldMapMiddleDragActive = false;
    private worldMapDragPointer = { x: 0, y: 0 };

    public handleCanvasMove(event: MouseEvent, canvas: HTMLCanvasElement, stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, battleMap: BattleMap, hudCoordinator: GameHudCoordinator, player: Player): void {
        if (this.isWorldMapMiddleDragActive && stateMachine.isInState(MODES.WORLD_MAP)) {
            this.handleWorldMapMiddleDragMove(event, worldMap, player);
        }
        const rect = canvas.getBoundingClientRect();
        const worldX = (event.clientX - rect.left) * (canvas.width / rect.width);
        const worldY = (event.clientY - rect.top) * (canvas.height / rect.height);
        if (stateMachine.isInState(MODES.WORLD_MAP)) {
            worldMap.updateSelectedCellFromPixel(worldX, worldY);
            hudCoordinator.updateSelectedCell(worldMap.getSelectedCellInfo());
            return;
        }
        if (stateMachine.isInState(MODES.BATTLE)) {
            battleMap.updateSelectedCellFromPixel(worldX, worldY);
            hudCoordinator.updateSelectedCell(battleMap.getSelectedCellInfo());
        }
    }

    public handleCanvasLeave(stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, battleMap: BattleMap, hudCoordinator: GameHudCoordinator): void {
        this.isWorldMapMiddleDragActive = false;
        if (stateMachine.isInState(MODES.WORLD_MAP)) {
            worldMap.clearSelectedCell();
            hudCoordinator.updateSelectedCell(null);
            return;
        }
        if (stateMachine.isInState(MODES.BATTLE)) {
            battleMap.clearSelectedCell();
            hudCoordinator.updateSelectedCell(null);
        }
    }

    public handleWorldMapWheel(event: WheelEvent, stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, player: Player): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        event.preventDefault();
        const changed = event.deltaY < 0 ? worldMap.zoomIn() : worldMap.zoomOut();
        if (changed) {
            this.syncPlayerPixelPosition(worldMap, player);
        }
    }

    public handleWorldMapKeyboardZoom(direction: 'in' | 'out', stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, player: Player): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        const changed = direction === 'in' ? worldMap.zoomIn() : worldMap.zoomOut();
        if (changed) {
            this.syncPlayerPixelPosition(worldMap, player);
        }
    }

    public handleWorldMapMiddleDragStart(event: MouseEvent, stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>): void {
        if (event.button !== 1 || !stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        event.preventDefault();
        this.isWorldMapMiddleDragActive = true;
        this.worldMapDragPointer = { x: event.clientX, y: event.clientY };
        const stopDrag = (): void => { this.isWorldMapMiddleDragActive = false; };
        window.addEventListener('mouseup', stopDrag, { once: true });
        window.addEventListener('blur', stopDrag, { once: true });
    }

    public handleWorldMapMiddleDragMove(event: MouseEvent, worldMap: WorldMap, player: Player): void {
        const deltaX = event.clientX - this.worldMapDragPointer.x;
        const deltaY = event.clientY - this.worldMapDragPointer.y;
        this.worldMapDragPointer = { x: event.clientX, y: event.clientY };
        if (worldMap.panByPixels(deltaX, deltaY)) {
            this.syncPlayerPixelPosition(worldMap, player);
        }
    }

    public centerWorldMapOnPlayer(stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldMap: WorldMap, player: Player): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        worldMap.centerOnPlayer();
        this.syncPlayerPixelPosition(worldMap, player);
    }

    public tryEnterVillageFromWorldMap(stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldModeController: WorldModeController, hudCoordinator: GameHudCoordinator): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            return;
        }
        if (!worldModeController.tryEnterVillageAtCurrentPosition()) {
            hudCoordinator.addBattleLog('Stand on a village tile to enter it.', 'system');
        }
    }

    public confirmWorldVillageEntry(stateMachine: ReturnType<GameModeStateMachine<unknown>['create']>, worldModeController: WorldModeController, hudCoordinator: GameHudCoordinator): void {
        if (!stateMachine.isInState(MODES.WORLD_MAP)) {
            worldModeController.dismissVillageEntryPrompt();
            return;
        }
        if (!worldModeController.confirmVillageEntryFromPrompt()) {
            hudCoordinator.addBattleLog('You must stand on the village tile to enter.', 'system');
        }
    }

    public showWorldVillageEntryPrompt(worldUI: WorldUI, villageName: string, anchor: { x: number; y: number }, canvas: HTMLCanvasElement): void {
        worldUI.villageEntryTitle.textContent = `You found ${villageName}.`;
        const width = worldUI.villageEntryPopup.offsetWidth || 190;
        const height = worldUI.villageEntryPopup.offsetHeight || 84;
        const left = Math.max(14, Math.min(Math.max(14, canvas.width - width - 14), anchor.x - (width / 2)));
        const top = Math.max(14, Math.min(Math.max(14, canvas.height - height - 14), anchor.y - height - 16));
        worldUI.villageEntryPopup.style.left = `${left}px`;
        worldUI.villageEntryPopup.style.top = `${top}px`;
        worldUI.villageEntryPopup.classList.remove('hidden');
    }

    public hideWorldVillageEntryPrompt(worldUI: WorldUI): void {
        worldUI.villageEntryPopup.classList.add('hidden');
    }

    private syncPlayerPixelPosition(worldMap: WorldMap, player: Player): void {
        const [x, y] = worldMap.getPlayerPixelPosition();
        player.x = x;
        player.y = y;
    }
}
