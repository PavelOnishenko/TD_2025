import { MODES } from '../../systems/game/runtime/GameModeStateMachine.js';
import type { GameFacadeStateAccess } from './GameFacadeSharedTypes.js';
import { getDeveloperModeConfig } from '../../utils/DeveloperModeConfig.js';

export default class GameFacadeLifecycleCoordinator {
    private readonly state: GameFacadeStateAccess;

    public constructor(state: GameFacadeStateAccess) {
        this.state = state;
    }

    public initializeAfterRuntimeAssignment(): void {
        const hasSavedGame = Boolean(window.localStorage.getItem(this.state.saveKey));
        if (!hasSavedGame) {
            this.state.worldMap.centerOnPlayer();
        }
        this.syncPlayerToWorldMap();
        this.state.persistenceRuntime.loadGame(this.state.worldMap, this.state.player, this.state.magicSystem);
        const developerMode = getDeveloperModeConfig();
        if (!hasSavedGame && developerMode.enabled && developerMode.autoGodBoostOnCharacterCreation) {
            this.state.hudCoordinator.handleGodSkillsBoost();
        }
        this.refreshHud();
        this.refreshGroupPanel();
        this.state.persistenceRuntime.saveGameIfChanged(
            this.state.worldMap,
            this.state.player,
            this.state.magicSystem,
            this.state.questRuntime.activeQuest,
            this.state.gameTime?.getState(),
        );
    }

    public start(): void {
        this.handleResize();
        this.refreshHud();
        this.state.loop.start();
    }

    public update(deltaTime: number): void {
        const updateStart = performance.now();
        this.state.stateMachine.update(deltaTime);
        this.state.input.update();
        this.state.persistenceRuntime.saveGameIfChanged(
            this.state.worldMap,
            this.state.player,
            this.state.magicSystem,
            this.state.questRuntime.activeQuest,
            this.state.gameTime?.getState(),
        );
        this.state.worldMap?.setLastUpdateMs(performance.now() - updateStart);
    }

    public render(): void {
        const nowMs = performance.now();
        if (this.state.stateMachine.isInState(MODES.WORLD_MAP) && this.state.worldMap && !this.state.worldMap.shouldRenderThisFrame(nowMs)) {
            return;
        }
        const renderStart = performance.now();
        this.state.worldMap?.beginRenderFrame(nowMs);
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
        this.state.worldMap?.finishRenderFrame(performance.now() - renderStart);
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
            this.state.gameTime?.getState(),
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

    public onTryRecruitEscort(personName: string, villageName: string): 'joined' | 'inactive' | 'already-joined' | 'not-available' {
        const status = this.state.questRuntime.recruitEscort(personName, villageName);
        if (status === 'joined') {
            this.state.hudCoordinator.addBattleLog(`Quest tracker: ${personName} joined your group in ${villageName}.`, 'system');
            this.refreshGroupPanel();
        }
        return status;
    }

    public onRevealRecoverHolder(villageName: string, npcName: string): { revealed: boolean; personName?: string; itemName?: string } {
        return this.state.questRuntime.revealRecoverHolder(villageName, npcName);
    }

    public onTryStartRecoverConfrontation(
        personName: string,
        villageName: string,
    ): { status: 'started' | 'inactive' | 'not-target' | 'not-ready'; enemies?: import('../../entities/Skeleton.js').default[]; itemName?: string } {
        return this.state.questRuntime.startRecoverConfrontation(personName, villageName);
    }

    public onBattleEnded(result: 'victory' | 'defeat' | 'fled'): void {
        if (result !== 'victory' && result !== 'fled') {
            return;
        }
        const lines = this.state.questRuntime.resolveRecoverBattle(result, this.state.worldMap, this.state.player);
        lines.forEach((line, index) => this.state.hudCoordinator.addBattleLog(line, index === 0 ? 'system' : 'system-message'));
        if (lines.length > 0) {
            this.refreshGroupPanel();
        }
    }

    public onVillageEntered(): void {
        const villageName = this.state.worldMap.getVillageNameAtPlayerPosition();
        const questChanged = this.state.questRuntime.recordLocationEntry(
            villageName,
            this.state.player.getInventory().map((item) => item.name),
        );
        if (questChanged) {
            this.state.hudCoordinator.addBattleLog(`Quest tracker: objectives updated at ${villageName}.`, 'system');
        }
        this.refreshGroupPanel();
        this.state.villageCoordinator.enterVillageMode(
            this.state.canvas.width,
            this.state.canvas.height,
            villageName,
        );
    }

    public handleResize = (): void => {
        const rect = this.state.canvas.getBoundingClientRect();
        const dpr = this.state.worldMap?.getEffectiveDevicePixelRatio(window.devicePixelRatio || 1) ?? (window.devicePixelRatio || 1);
        const width = Math.max(160, Math.floor(rect.width * dpr));
        const height = Math.max(160, Math.floor(rect.height * dpr));
        if (width !== this.state.canvas.width || height !== this.state.canvas.height) {
            this.state.canvas.width = width;
            this.state.canvas.height = height;
            this.state.worldMap?.setCanvasPixelSize(width, height);
        }
        if (!this.state.worldMap || !this.state.battleMap) {
            return;
        }
        this.state.worldMap.resizeToCanvas(width, height);
        this.state.battleMap.resizeToCanvas(width, height);
        this.syncPlayerToWorldMap();
    };

    private refreshGroupPanel(): void {
        const members = this.state.questRuntime.getGroupMembers();
        const lines = members.map((member) => `${member.name} — HP ${member.hp}/${member.maxHp} (${member.status})`);
        this.state.hudCoordinator.updateGroupPanel(lines);
    }

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
