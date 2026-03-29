import BattleMap from './combat/BattleMap.js';
import TurnManager from './combat/TurnManager.js';
import Player from '../entities/player/Player.js';
import Skeleton from '../entities/Skeleton.js';
import { Direction } from '../types/game.js';
import MagicSystem from './magic/MagicSystem.js';
import { balanceConfig } from '../config/balance/balanceConfig.js';
import { CombatMove } from './combat/DirectionalCombat.js';

type BattleUI = {
    enemyName: HTMLElement;
    enemyHp: HTMLElement;
    enemyMaxHp: HTMLElement;
    attackBtn: HTMLButtonElement;
    directionalButtons: Record<CombatMove, HTMLButtonElement>;
    fleeBtn: HTMLButtonElement;
    waitBtn: HTMLButtonElement;
    usePotionBtn: HTMLButtonElement;
    useManaPotionBtn: HTMLButtonElement;
    spellFireballBtn: HTMLButtonElement;
    spellCurseBtn: HTMLButtonElement;
    spellSlowBtn: HTMLButtonElement;
    spellRageBtn: HTMLButtonElement;
    spellArcaneLanceBtn: HTMLButtonElement;
};

type SelectionResult = {
    selectedEnemy: Skeleton | null;
    moved: boolean;
};

export default class BattleUiController {
    private battleUI: BattleUI;
    private battleMap: BattleMap;
    private turnManager: TurnManager;
    private player: Player;
    private gameLog: HTMLElement;
    private magicSystem: MagicSystem;

    constructor(battleUI: BattleUI, battleMap: BattleMap, turnManager: TurnManager, player: Player, gameLog: HTMLElement, magicSystem: MagicSystem) {
        this.battleUI = battleUI;
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.player = player;
        this.gameLog = gameLog;
        this.magicSystem = magicSystem;
    }

    public updateEnemyDisplay(selectedEnemy: Skeleton | null): Skeleton | null {
        this.refreshActionAvailability();
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        let displayEnemy: Skeleton | null = null;

        if (selectedEnemy && !selectedEnemy.isDead()) {
            displayEnemy = selectedEnemy;
        } else {
            const adjacentEnemies = this.getAdjacentEnemies();
            if (adjacentEnemies.length > 0) {
                displayEnemy = adjacentEnemies[0];
                selectedEnemy = displayEnemy;
            } else if (enemies.length > 0) {
                displayEnemy = enemies[0];
            }
        }

        if (displayEnemy) {
            const selectedSuffix = displayEnemy === selectedEnemy ? ' [SELECTED]' : '';
            this.battleUI.enemyName.textContent = displayEnemy.name + selectedSuffix;
            this.battleUI.enemyHp.textContent = String(displayEnemy.hp);
            this.battleUI.enemyMaxHp.textContent = String(displayEnemy.maxHp);
            return selectedEnemy;
        }

        this.battleUI.enemyName.textContent = '-';
        this.battleUI.enemyHp.textContent = '-';
        this.battleUI.enemyMaxHp.textContent = '-';
        return null;
    }

    public handleMovementOrSelection(direction: Direction, selectedEnemy: Skeleton | null): SelectionResult {
        const enemyInDirection = this.getEnemyInDirection(direction);
        if (enemyInDirection) {
            return { selectedEnemy: enemyInDirection, moved: false };
        }

        return {
            selectedEnemy,
            moved: this.battleMap.moveEntity(this.player, direction),
        };
    }

    public selectEnemyFromCanvasClick(event: MouseEvent, canvas: HTMLCanvasElement): Skeleton | null {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (event.clientX - rect.left) * scaleX;
        const clickY = (event.clientY - rect.top) * scaleY;
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];

        for (const enemy of enemies) {
            const distance = Math.hypot(clickX - enemy.x, clickY - enemy.y);
            if (distance <= 20) {
                return enemy;
            }
        }

        return null;
    }

    public setButtonsEnabled(enabled: boolean): void {
        this.refreshActionAvailability();
        this.battleUI.attackBtn.disabled = !enabled;
        Object.values(this.battleUI.directionalButtons).forEach((button) => {
            button.disabled = !enabled;
        });
        this.battleUI.fleeBtn.disabled = !enabled || !this.battleMap.isEntityOnEdge(this.player);
        this.battleUI.waitBtn.disabled = !enabled;
        this.battleUI.usePotionBtn.disabled = !enabled;
        this.battleUI.useManaPotionBtn.disabled = !enabled;
        this.battleUI.spellFireballBtn.disabled = !enabled;
        this.battleUI.spellCurseBtn.disabled = !enabled;
        this.battleUI.spellSlowBtn.disabled = !enabled;
        this.battleUI.spellRageBtn.disabled = !enabled;
        this.battleUI.spellArcaneLanceBtn.disabled = !enabled;
    }

    public refreshActionAvailability(): void {
        const hasAttackTarget = this.hasEnemyInAttackRange();
        const hasDirectionalTarget = this.hasEnemyInDirectionalRange();
        const directionalVisible = hasDirectionalTarget && this.player.getAttackRange() === 1;
        const canFlee = this.battleMap.isEntityOnEdge(this.player);
        const hasHealingPotion = this.player.getHealingPotionCount() > 0;
        const hasManaPotion = this.player.getManaPotionCount() > 0;
        const availableSpells = this.magicSystem.getAvailableSpells();
        const manaBySpell = new Map(availableSpells.map((spell) => [spell.id.split('-lvl-')[0], spell.manaCost]));
        const hasEnemySpellTarget = hasAttackTarget;
        const hasEnemySlowTarget = this.hasEnemyInSpellRange('slow');

        this.setActionVisible(this.battleUI.attackBtn, hasAttackTarget && !directionalVisible);
        Object.values(this.battleUI.directionalButtons).forEach((button) => this.setActionVisible(button, directionalVisible));
        this.setActionVisible(this.battleUI.fleeBtn, canFlee);
        this.setActionVisible(this.battleUI.waitBtn, true);
        this.setActionVisible(this.battleUI.usePotionBtn, hasHealingPotion);
        this.setActionVisible(this.battleUI.useManaPotionBtn, hasManaPotion);
        this.setActionVisible(this.battleUI.spellFireballBtn, hasEnemySpellTarget && this.player.canSpendMana(manaBySpell.get('fireball') ?? Number.POSITIVE_INFINITY));
        this.setActionVisible(this.battleUI.spellCurseBtn, hasEnemySpellTarget && this.player.canSpendMana(manaBySpell.get('curse') ?? Number.POSITIVE_INFINITY));
        this.setActionVisible(this.battleUI.spellSlowBtn, hasEnemySlowTarget && this.player.canSpendMana(manaBySpell.get('slow') ?? Number.POSITIVE_INFINITY));
        this.setActionVisible(this.battleUI.spellRageBtn, this.player.canSpendMana(manaBySpell.get('rage') ?? Number.POSITIVE_INFINITY));
        this.setActionVisible(this.battleUI.spellArcaneLanceBtn, hasEnemySpellTarget && this.player.canSpendMana(manaBySpell.get('arcane-lance') ?? Number.POSITIVE_INFINITY));
    }

    public addBattleLog(message: string, type: string = 'system'): void {
        const div = document.createElement('div');
        div.textContent = message;
        div.classList.add(type + '-action');
        this.gameLog.appendChild(div);
        this.gameLog.scrollTop = this.gameLog.scrollHeight;
    }

    public clearBattleLog(): void {
        this.gameLog.innerHTML = '';
    }

    public describeEncounter(enemies: Skeleton[]): string {
        if (enemies.length === 0) {
            return 'nothing';
        }

        if (enemies.length === 1) {
            return this.describeEnemy(enemies[0]);
        }

        return `${enemies.length} ${enemies[0].name}s`;
    }

    private describeEnemy(enemy: Skeleton): string {
        const maybeDetailedEnemy = enemy as Skeleton & { getEncounterDescription?: () => string };
        if (typeof maybeDetailedEnemy.getEncounterDescription !== 'function') {
            return enemy.name;
        }

        return `${enemy.name}. ${maybeDetailedEnemy.getEncounterDescription()}`;
    }

    private getAdjacentEnemies(): Skeleton[] {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.filter(enemy => this.battleMap.isInMeleeRange(this.player, enemy));
    }

    private hasEnemyInAttackRange(): boolean {
        const attackRange = this.player.getAttackRange();
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.some((enemy) => this.battleMap.isInAttackRange(this.player, enemy, attackRange));
    }

    private hasEnemyInDirectionalRange(): boolean {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.some((enemy) => this.battleMap.isInMeleeRange(this.player, enemy));
    }

    private hasEnemyInSpellRange(spellId: 'fireball' | 'curse' | 'slow' | 'arcane-lance'): boolean {
        const spellRange = (spellId === 'slow' ? balanceConfig.combat.spellRanges.slow : undefined) ?? this.player.getAttackRange();
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.some((enemy) => this.battleMap.isInAttackRange(this.player, enemy, spellRange));
    }

    private getEnemyInDirection(direction: Direction): Skeleton | null {
        const playerCol = this.player.gridCol ?? 0;
        const playerRow = this.player.gridRow ?? 0;

        const target = {
            up: { col: playerCol, row: playerRow - 1 },
            down: { col: playerCol, row: playerRow + 1 },
            left: { col: playerCol - 1, row: playerRow },
            right: { col: playerCol + 1, row: playerRow },
        }[direction];

        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.find(enemy => enemy.gridCol === target.col && enemy.gridRow === target.row) ?? null;
    }

    private setActionVisible(button: HTMLButtonElement, visible: boolean): void {
        button.classList.toggle('hidden', !visible);
    }
}
