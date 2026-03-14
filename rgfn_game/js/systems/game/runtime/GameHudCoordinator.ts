import Player from '../../../entities/Player.js';
import BattleUiController from '../../BattleUiController.js';
import HudController from '../../HudController.js';
import Skeleton from '../../../entities/Skeleton.js';

export default class GameHudCoordinator {
    private readonly player: Player;
    private readonly hudController: HudController;
    private readonly battleUiController: BattleUiController;

    constructor(player: Player, hudController: HudController, battleUiController: BattleUiController) {
        this.player = player;
        this.hudController = hudController;
        this.battleUiController = battleUiController;
    }

    public updateHUD(): void {
        this.hudController.updateHUD();
    }


    public enableBattleButtons(enabled: boolean): void {
        this.battleUiController.setButtonsEnabled(enabled);
    }

    public addBattleLog(message: string, type: string = 'system'): void {
        this.battleUiController.addBattleLog(message, type);
    }

    public clearBattleLog(): void {
        this.battleUiController.clearBattleLog();
    }

    public describeEncounter(enemies: Skeleton[]): string {
        return this.battleUiController.describeEncounter(enemies);
    }

    public handleAddStat(stat: 'vitality' | 'toughness' | 'strength' | 'agility'): void {
        if (!this.player.addStat(stat)) {
            return;
        }
        this.updateHUD();
        this.addBattleLog(`+1 ${stat.charAt(0).toUpperCase() + stat.slice(1)}!`, 'system');
    }
}
