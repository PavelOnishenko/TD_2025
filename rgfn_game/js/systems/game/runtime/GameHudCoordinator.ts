import Player from '../../../entities/Player.js';
import BattleUiController from '../../BattleUiController.js';
import HudController from '../../HudController.js';
import Skeleton from '../../../entities/Skeleton.js';
import MagicSystem, { BaseSpellId } from '../../magic/MagicSystem.js';

export default class GameHudCoordinator {
    private readonly player: Player;
    private readonly hudController: HudController;
    private readonly battleUiController: BattleUiController;
    private readonly magicSystem: MagicSystem;

    constructor(player: Player, hudController: HudController, battleUiController: BattleUiController, magicSystem: MagicSystem) {
        this.player = player;
        this.hudController = hudController;
        this.battleUiController = battleUiController;
        this.magicSystem = magicSystem;
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

    public handleAddStat(stat: 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence'): void {
        if (!this.player.addStat(stat)) {
            return;
        }
        this.updateHUD();
        this.addBattleLog(`+1 ${stat.charAt(0).toUpperCase() + stat.slice(1)}!`, 'system');
    }

    public handleUpgradeSpell(spellId: BaseSpellId): void {
        if (!this.magicSystem.investSpellPoint(spellId)) {
            this.addBattleLog('Not enough magic points.', 'system');
            return;
        }

        this.updateHUD();
        this.addBattleLog(`Upgraded ${spellId} spell level.`, 'system');
    }
}
