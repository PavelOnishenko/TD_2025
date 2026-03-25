import Player from '../../../entities/Player.js';
import BattleUiController from '../../BattleUiController.js';
import HudController from '../../HudController.js';
import Skeleton from '../../../entities/Skeleton.js';
import MagicSystem, { BaseSpellId } from '../../magic/MagicSystem.js';
import { SelectedCellInfo } from '../../../types/game.js';

type PlayerStat = 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence';

export default class GameHudCoordinator {
    private readonly player: Player;
    private readonly hudController: HudController;
    private readonly battleUiController: BattleUiController;
    private readonly magicSystem: MagicSystem;
    private pendingSkillAllocations: Record<PlayerStat, number> = { vitality: 0, toughness: 0, strength: 0, agility: 0, connection: 0, intelligence: 0 };

    constructor(player: Player, hudController: HudController, battleUiController: BattleUiController, magicSystem: MagicSystem) {
        this.player = player;
        this.hudController = hudController;
        this.battleUiController = battleUiController;
        this.magicSystem = magicSystem;
    }

    public updateHUD(): void {
        this.hudController.setPendingSkillAllocations(this.pendingSkillAllocations);
        this.hudController.updateHUD();
        this.battleUiController.refreshActionAvailability();
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


    public togglePanel(panel: 'stats' | 'skills' | 'inventory' | 'magic' | 'quests' | 'lore' | 'selected' | 'worldMap' | 'log'): void {
        this.hudController.togglePanel(panel);
    }

    public updateSelectedCell(selectedCell: SelectedCellInfo | null): void {
        this.hudController.updateSelectedCellInfo(selectedCell);
    }

    public handleAddStat(stat: PlayerStat): void {
        const pendingTotal = Object.values(this.pendingSkillAllocations).reduce((total, value) => total + value, 0);
        if (pendingTotal >= this.player.skillPoints) {
            return;
        }

        this.pendingSkillAllocations[stat] += 1;
        this.updateHUD();
    }

    public handleRemoveStat(stat: PlayerStat): void {
        if (this.pendingSkillAllocations[stat] <= 0) {
            return;
        }

        this.pendingSkillAllocations[stat] -= 1;
        this.updateHUD();
    }

    public handleSaveSkillChanges(): void {
        const changedStats = Object.entries(this.pendingSkillAllocations).filter(([, value]) => value > 0) as Array<[PlayerStat, number]>;
        if (changedStats.length === 0) {
            return;
        }

        for (const [stat, amount] of changedStats) {
            this.player.addStat(stat, amount);
            this.pendingSkillAllocations[stat] = 0;
        }

        this.updateHUD();
        this.addBattleLog('Saved skill changes.', 'system');
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
