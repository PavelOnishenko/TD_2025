import { MODES } from '../../systems/game/runtime/GameModeStateMachine.js';
import type { GameFacadeStateAccess } from './GameFacadeSharedTypes.js';

export default class GameFacadeLifecycleCoordinator {
    private readonly state: GameFacadeStateAccess;

    public constructor(state: GameFacadeStateAccess) {
        this.state = state;
    }

    public initializeAfterRuntimeAssignment(): void {
        if (!window.localStorage.getItem(this.state.saveKey)) {
            this.state.worldMap.centerOnPlayer();
        }
        this.syncPlayerToWorldMap();
        this.state.persistenceRuntime.loadGame(this.state.worldMap, this.state.player, this.state.magicSystem);
        this.refreshHud();
        this.state.persistenceRuntime.saveGameIfChanged(
            this.state.worldMap,
            this.state.player,
            this.state.magicSystem,
            this.state.questRuntime.activeQuest,
        );
    }

    public start(): void {
        this.handleResize();
        this.refreshHud();
        this.state.loop.start();
    }

    public update(deltaTime: number): void {
        this.state.stateMachine.update(deltaTime);
        this.state.input.update();
        this.state.persistenceRuntime.saveGameIfChanged(
            this.state.worldMap,
            this.state.player,
            this.state.magicSystem,
            this.state.questRuntime.activeQuest,
        );
    }

    public render(): void {
        this.state.renderer.beginFrame();
        if (this.state.stateMachine.isInState(MODES.WORLD_MAP)) {
            this.state.renderRouter.renderWorldMode();
        }
        if (this.state.stateMachine.isInState(MODES.VILLAGE)) {
            this.state.renderRouter.renderVillageMode();
        }
        if (this.state.stateMachine.isInState(MODES.BATTLE)) {
            this.state.renderRouter.renderBattleMode(
                this.state.battleCoordinator.getCurrentEnemies(),
                this.state.battleCoordinator.getSelectedEnemy(),
            );
        }
        this.state.renderer.endFrame();
    }

    public gameOver(): void {
        this.state.loop.stop();
        alert('Game Over! A new character will be created.');
        this.startNewCharacter();
    }

    public startNewCharacter(): void {
        window.localStorage.removeItem(this.state.saveKey);
        window.location.reload();
    }

    public onGodSkillsBoost(): void {
        this.state.hudCoordinator.handleGodSkillsBoost();
        this.state.persistenceRuntime.saveGameIfChanged(
            this.state.worldMap,
            this.state.player,
            this.state.magicSystem,
            this.state.questRuntime.activeQuest,
        );
    }

    public onQuestLocationClick(locationName: string): boolean {
        const shown = this.state.worldMap.revealNamedLocation(locationName);
        if (shown) {
            this.state.stateMachine.transition(MODES.WORLD_MAP);
        }
        return shown;
    }

    public onVillageBarterCompleted(trader: string, item: string, village: string): void {
        const status = this.state.questRuntime.recordBarterCompletion(trader, item, village);
        if (status === 'updated') {
            this.state.hudCoordinator.addBattleLog(`Quest tracker: barter objective completed (${trader} -> ${item}).`, 'system');
        }
        if (status === 'no-objective') {
            this.state.hudCoordinator.addBattleLog(
                `Quest tracker: barter registered (${trader} -> ${item}), but no active objective matched.`,
                'system-message',
            );
        }
    }

    public onMonsterKilled(monsterName: string): void {
        if (this.state.questRuntime.recordMonsterKill(monsterName)) {
            this.state.hudCoordinator.addBattleLog(`Quest tracker: eliminated ${monsterName}.`, 'system');
        }
    }

    public onVillageEntered(): void {
        this.state.questRuntime.recordLocationEntry(
            this.state.worldMap.getVillageNameAtPlayerPosition(),
            this.state.player.getInventory().map((item) => item.name),
        );
        this.state.villageCoordinator.enterVillageMode(
            this.state.canvas.width,
            this.state.canvas.height,
            this.state.worldMap.getVillageNameAtPlayerPosition(),
        );
    }

    public handleResize = (): void => {
        const rect = this.state.canvas.getBoundingClientRect();
        const width = Math.max(160, Math.floor(rect.width));
        const height = Math.max(160, Math.floor(rect.height));
        if (width !== this.state.canvas.width || height !== this.state.canvas.height) {
            this.state.canvas.width = width;
            this.state.canvas.height = height;
        }
        if (!this.state.worldMap || !this.state.battleMap) {
            return;
        }
        this.state.worldMap.resizeToCanvas(width, height);
        this.state.battleMap.resizeToCanvas(width, height);
        this.syncPlayerToWorldMap();
    };

    private refreshHud(): void {
        if (!this.state.hudCoordinator) {
            return;
        }
        this.state.hudCoordinator.updateHUD();
        this.state.hudCoordinator.updateSelectedCell(this.state.worldMap.getSelectedCellInfo());
    }

    private syncPlayerToWorldMap(): void {
        const [x, y] = this.state.worldMap.getPlayerPixelPosition();
        this.state.player.x = x;
        this.state.player.y = y;
    }
}
