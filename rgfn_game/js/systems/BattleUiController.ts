import BattleMap from './combat/BattleMap.js';
import TurnManager from './combat/TurnManager.js';
import Player from '../entities/Player.js';
import Skeleton from '../entities/Skeleton.js';
import { Direction } from '../types/game.js';

type BattleUI = {
    enemyName: HTMLElement;
    enemyHp: HTMLElement;
    enemyMaxHp: HTMLElement;
    attackBtn: HTMLButtonElement;
    fleeBtn: HTMLButtonElement;
    waitBtn: HTMLButtonElement;
    usePotionBtn: HTMLButtonElement;
    spellFireballBtn: HTMLButtonElement;
    spellCurseBtn: HTMLButtonElement;
    spellSlowBtn: HTMLButtonElement;
    spellRageBtn: HTMLButtonElement;
    spellArcaneLanceBtn: HTMLButtonElement;
    log: HTMLElement;
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

    constructor(battleUI: BattleUI, battleMap: BattleMap, turnManager: TurnManager, player: Player) {
        this.battleUI = battleUI;
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.player = player;
    }

    public updateEnemyDisplay(selectedEnemy: Skeleton | null): Skeleton | null {
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
        this.battleUI.attackBtn.disabled = !enabled;
        this.battleUI.fleeBtn.disabled = !enabled || !this.battleMap.isEntityOnEdge(this.player);
        this.battleUI.waitBtn.disabled = !enabled;
        this.battleUI.usePotionBtn.disabled = !enabled;
        this.battleUI.spellFireballBtn.disabled = !enabled;
        this.battleUI.spellCurseBtn.disabled = !enabled;
        this.battleUI.spellSlowBtn.disabled = !enabled;
        this.battleUI.spellRageBtn.disabled = !enabled;
        this.battleUI.spellArcaneLanceBtn.disabled = !enabled;
    }

    public addBattleLog(message: string, type: string = 'system'): void {
        const div = document.createElement('div');
        div.textContent = message;
        div.classList.add(type + '-action');
        this.battleUI.log.appendChild(div);
        this.battleUI.log.scrollTop = this.battleUI.log.scrollHeight;
    }

    public clearBattleLog(): void {
        this.battleUI.log.innerHTML = '';
    }

    public describeEncounter(enemies: Skeleton[]): string {
        if (enemies.length === 0) {
            return 'nothing';
        }

        if (enemies.length === 1) {
            return enemies[0].name;
        }

        return `${enemies.length} ${enemies[0].name}s`;
    }

    private getAdjacentEnemies(): Skeleton[] {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.filter(enemy => this.battleMap.isInMeleeRange(this.player, enemy));
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
}
