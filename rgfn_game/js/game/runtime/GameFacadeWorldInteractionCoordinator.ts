import type { WorldUI } from '../../systems/game/ui/GameUiTypes.js';
import type { GameFacadeStateAccess } from './GameFacadeSharedTypes.js';

export default class GameFacadeWorldInteractionCoordinator {
    private readonly state: GameFacadeStateAccess;

    public constructor(state: GameFacadeStateAccess) {
        this.state = state;
    }

    public showVillageEntryPrompt(worldUI: WorldUI, villageName: string, anchor: { x: number; y: number }): void {
        this.state.worldInteractionRuntime.showWorldVillageEntryPrompt(worldUI, villageName, anchor, this.state.canvas);
    }

    public hideVillageEntryPrompt(worldUI: WorldUI): void {
        this.state.worldInteractionRuntime.hideWorldVillageEntryPrompt(worldUI);
    }

    public handleCanvasMove(event: MouseEvent): void {
        this.state.worldInteractionRuntime.handleCanvasMove(
            event,
            this.state.canvas,
            this.state.stateMachine as never,
            this.state.worldMap,
            this.state.battleMap,
            this.state.hudCoordinator,
            this.state.player,
        );
    }

    public handleCanvasLeave(): void {
        this.state.worldInteractionRuntime.handleCanvasLeave(
            this.state.stateMachine as never,
            this.state.worldMap,
            this.state.battleMap,
            this.state.hudCoordinator,
        );
    }

    public handleWorldMapWheel(event: WheelEvent): void {
        this.state.worldInteractionRuntime.handleWorldMapWheel(
            event,
            this.state.stateMachine as never,
            this.state.worldMap,
            this.state.player,
        );
    }

    public handleWorldMapMiddleDragStart(event: MouseEvent): void {
        this.state.worldInteractionRuntime.handleWorldMapMiddleDragStart(event, this.state.stateMachine as never);
    }

    public handleWorldMapKeyboardZoom(direction: 'in' | 'out'): void {
        this.state.worldInteractionRuntime.handleWorldMapKeyboardZoom(
            direction,
            this.state.stateMachine as never,
            this.state.worldMap,
            this.state.player,
        );
    }

    public centerWorldMapOnPlayer(): void {
        this.state.worldInteractionRuntime.centerWorldMapOnPlayer(
            this.state.stateMachine as never,
            this.state.worldMap,
            this.state.player,
        );
    }

    public tryEnterVillageFromWorldMap(): void {
        this.state.worldInteractionRuntime.tryEnterVillageFromWorldMap(
            this.state.stateMachine as never,
            this.state.worldModeController,
            this.state.hudCoordinator,
        );
    }

    public confirmWorldVillageEntry(): void {
        this.state.worldInteractionRuntime.confirmWorldVillageEntry(
            this.state.stateMachine as never,
            this.state.worldModeController,
            this.state.hudCoordinator,
        );
    }
}
