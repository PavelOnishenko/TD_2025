import BattleMap from '../combat/BattleMap.js';
import TurnManager from '../combat/TurnManager.js';
import StateMachine from '../../utils/StateMachine.js';
import Player from '../../entities/Player.js';
import Skeleton from '../../entities/Skeleton.js';
import timingConfig from '../../config/timingConfig.js';
import { balanceConfig } from '../../config/balanceConfig.js';
import MagicSystem, { BaseSpellId } from '../magic/MagicSystem.js';
import Item, { DISCOVERABLE_ITEM_LIBRARY } from '../../entities/Item.js';
import Wanderer from '../../entities/Wanderer.js';
import { CombatMove, getMoveLabel, isAttackMove, resolveDirectionalCombatExchange } from '../combat/DirectionalCombat.js';


type BattleCommandCallbacks = {
    onUpdateHUD: () => void;
    onAddBattleLog: (message: string, type?: string) => void;
    onEnableBattleButtons: (enabled: boolean) => void;
    onProcessTurn: () => void;
    onEndBattle: (result: 'victory' | 'fled') => void;
    onPlayerTurnTransitionStart: () => void;
    onPlayerTurnReady: () => void;
    getSelectedEnemy: () => Skeleton | null;
    setSelectedEnemy: (enemy: Skeleton | null) => void;
    onEnemyDefeated?: (enemy: Skeleton) => void;
};

export default class BattleCommandController {
    private stateMachine: StateMachine;
    private player: Player;
    private battleMap: BattleMap;
    private turnManager: TurnManager;
    private callbacks: BattleCommandCallbacks;
    private magicSystem: MagicSystem;
    private pendingLoot: Item[] = [];

    constructor(stateMachine: StateMachine, player: Player, battleMap: BattleMap, turnManager: TurnManager, magicSystem: MagicSystem, callbacks: BattleCommandCallbacks) {
        this.stateMachine = stateMachine;
        this.player = player;
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.magicSystem = magicSystem;
        this.callbacks = callbacks;
    }

    public handleEquipmentAction(actionDescription: string): boolean {
        const inBattle = this.stateMachine.isInState('BATTLE');
        if (!inBattle) {
            return true;
        }

        if (!this.canUseBattleTurnInput()) {
            this.callbacks.onAddBattleLog('You can only change equipment on your own turn.', 'system');
            return false;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.callbacks.onAddBattleLog(`${actionDescription} It takes 3 turns to complete.`, 'player');
        this.turnManager.consumeUpcomingTurns(this.player, 2);
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
        return true;
    }

    public handleAttack(): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;

        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        if (enemies.length === 0) {
            this.callbacks.onEndBattle('victory');
            return;
        }

        const target = this.resolveAttackTarget(enemies);
        if (!target) {
            this.callbacks.onAddBattleLog('No enemy in range! Move closer first.', 'system');
            this.callbacks.onPlayerTurnReady();
            this.turnManager.waitingForPlayer = true;
            this.callbacks.onEnableBattleButtons(true);
            return;
        }

        this.performAttack(target);
        this.callbacks.onUpdateHUD();
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    public handleDirectionalCombatMove(move: CombatMove): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        const target = this.resolveDirectionalTarget(enemies);
        if (!target) {
            this.callbacks.onAddBattleLog(`You tried to use ${getMoveLabel(move)}, but no adjacent enemy is available for directional melee combat.`, 'system');
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;

        this.performDirectionalCombatExchange(move, target);
        this.callbacks.onUpdateHUD();
        this.turnManager.consumeUpcomingTurn(target);
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    public handleCastSpell(spellId: BaseSpellId): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        const target = spellId === 'rage' ? this.player : this.resolveSpellTarget(spellId, enemies);
        if (!target) {
            this.callbacks.onAddBattleLog('No valid spell target selected.', 'system');
            return;
        }

        const result = this.magicSystem.castSpell(spellId, target);
        if (!result.ok) {
            this.callbacks.onAddBattleLog(result.message, 'system');
            this.callbacks.onUpdateHUD();
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.callbacks.onAddBattleLog(result.message, 'player');

        if (target instanceof Skeleton && target.isDead()) {
            this.performKillRewards(target);
        }

        this.callbacks.onUpdateHUD();
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    public handleFlee(): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }

        if (!this.battleMap.isEntityOnEdge(this.player)) {
            this.callbacks.onAddBattleLog('You can only flee when standing on the battle map edge.', 'system');
            return;
        }

        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));

        if (Math.random() < balanceConfig.combat.fleeChance) {
            this.callbacks.onAddBattleLog('You fled from battle!', 'system');
            setTimeout(() => this.callbacks.onEndBattle('fled'), timingConfig.battle.fleeSuccessDelay);
            return;
        }

        this.callbacks.onAddBattleLog('Failed to flee!', 'system');
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.fleeFailedDelay);
    }

    public handleWait(): void { /* unchanged */
        if (!this.canUseBattleTurnInput()) return;
        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.callbacks.onAddBattleLog('You waited.', 'player');
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.waitActionDelay);
    }


    public handleUseManaPotion(fromBattleControls: boolean): void {
        const inBattle = this.stateMachine.isInState('BATTLE');
        if (fromBattleControls && !inBattle) return;
        if (inBattle && !this.canUseBattleTurnInput()) return;

        if (!this.player.useManaPotion()) {
            this.callbacks.onAddBattleLog('No mana potions in inventory.', 'system');
            this.callbacks.onUpdateHUD();
            return;
        }

        this.callbacks.onAddBattleLog(`You drink a mana potion (+${balanceConfig.combat.manaPotionRestore} mana).`, inBattle ? 'player' : 'system');
        this.callbacks.onUpdateHUD();

        if (!inBattle) return;

        this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    public handleUsePotion(fromBattleControls: boolean): void {
        const inBattle = this.stateMachine.isInState('BATTLE');
        if (fromBattleControls && !inBattle) return;
        if (inBattle && !this.canUseBattleTurnInput()) return;

        if (!this.player.useHealingPotion()) {
            this.callbacks.onAddBattleLog('No healing potions in inventory.', 'system');
            this.callbacks.onUpdateHUD();
            return;
        }

        this.callbacks.onAddBattleLog('You drink a healing potion (+5 HP).', inBattle ? 'player' : 'system');
        this.callbacks.onUpdateHUD();

        if (!inBattle) return;

        this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), timingConfig.battle.playerActionDelay);
    }

    public resolvePendingLoot(): void {
        if (this.pendingLoot.length === 0) {
            return;
        }

        for (const item of this.pendingLoot) {
            if (this.player.addItemToInventory(item)) {
                this.callbacks.onAddBattleLog(`Looted ${item.name}.`, 'system');
                continue;
            }

            this.callbacks.onAddBattleLog(`Could not loot ${item.name}: inventory full.`, 'system');
        }

        this.pendingLoot = [];
        this.callbacks.onUpdateHUD();
    }

    public clearPendingLoot(): void {
        this.pendingLoot = [];
    }

    private canUseBattleTurnInput(): boolean { return this.turnManager.isPlayerTurn() && this.turnManager.waitingForPlayer; }

    private resolveAttackTarget(enemies: Skeleton[]): Skeleton | null {
        const selectedEnemy = this.callbacks.getSelectedEnemy();
        const attackRange = this.player.getAttackRange();
        if (selectedEnemy && !selectedEnemy.isDead() && this.battleMap.isInAttackRange(this.player, selectedEnemy, attackRange)) return selectedEnemy;
        return enemies.find((enemy) => this.battleMap.isInAttackRange(this.player, enemy, attackRange)) ?? null;
    }

    private resolveSpellTarget(spellId: BaseSpellId, enemies: Skeleton[]): Skeleton | null {
        const selectedEnemy = this.callbacks.getSelectedEnemy();
        const spellRange = (spellId === 'slow' ? balanceConfig.combat.spellRanges.slow : undefined) ?? this.player.getAttackRange();
        if (selectedEnemy && !selectedEnemy.isDead() && this.battleMap.isInAttackRange(this.player, selectedEnemy, spellRange)) return selectedEnemy;
        return enemies.find((enemy) => this.battleMap.isInAttackRange(this.player, enemy, spellRange)) ?? null;
    }

    private resolveDirectionalTarget(enemies: Skeleton[]): Skeleton | null {
        const selectedEnemy = this.callbacks.getSelectedEnemy();
        if (selectedEnemy && !selectedEnemy.isDead() && this.battleMap.isInMeleeRange(this.player, selectedEnemy)) return selectedEnemy;
        return enemies.find((enemy) => this.battleMap.isInMeleeRange(this.player, enemy)) ?? null;
    }

    private performAttack(target: Skeleton): void {
        const attackBonusMessages = this.player.consumeDirectionalAttackBonuses();
        this.callbacks.onAddBattleLog('You attack!', 'player');
        attackBonusMessages.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        if (target.shouldAvoidHit()) {
            this.callbacks.onAddBattleLog(`${target.name} dodges the hit!`, 'enemy');
            return;
        }

        const damage = this.player.getPhysicalDamageWithBuff();
        target.takeDamage(damage);
        this.callbacks.onAddBattleLog(`${target.name} takes ${damage} damage!`, 'damage');
        this.applyRetaliationEffects(target, true);

        if (target.isDead()) {
            this.performKillRewards(target);
        }
    }

    private performDirectionalCombatExchange(playerMove: CombatMove, target: Skeleton): void {
        const enemyMove = this.rollEnemyDirectionalMove();
        const exchange = resolveDirectionalCombatExchange({
            actorName: 'Player',
            opponentName: target.name,
            actorMove: playerMove,
            opponentMove: enemyMove,
            actorBaseDamage: this.player.getPhysicalDamageWithBuff(),
            opponentBaseDamage: target.getAttackDamage(),
            actorBuffs: this.player.getDirectionalCombatBuffSnapshot(),
            opponentBuffs: target.getDirectionalCombatBuffSnapshot(),
        });

        this.callbacks.onAddBattleLog(`You commit to ${getMoveLabel(playerMove)}. ${target.name} answers with ${getMoveLabel(enemyMove)}.`, 'player');
        exchange.summaryLogs.forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        exchange.actor.logs.forEach((message) => this.callbacks.onAddBattleLog(`Player: ${message}`, 'system'));
        exchange.opponent.logs.forEach((message) => this.callbacks.onAddBattleLog(`${target.name}: ${message}`, 'system'));

        if (exchange.actor.isAttack) {
            this.player.consumeDirectionalAttackBonuses().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        } else {
            this.player.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        }

        if (exchange.opponent.isAttack) {
            target.consumeDirectionalAttackBonuses().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        } else {
            target.expireDirectionalBonusesWithoutAttack().forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        }

        this.player.applyDirectionalCombatRewards(exchange.actorRewards).forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));
        target.applyDirectionalCombatRewards(exchange.opponentRewards).forEach((message) => this.callbacks.onAddBattleLog(message, 'system'));

        if (exchange.actor.damageDealt > 0) {
            target.takeDamage(exchange.actor.damageDealt);
            this.callbacks.onAddBattleLog(`${target.name} takes ${exchange.actor.damageDealt} damage from ${getMoveLabel(playerMove)}.`, 'damage');
            this.applyRetaliationEffects(target, true);
        } else if (isAttackMove(playerMove)) {
            this.callbacks.onAddBattleLog(`Your ${getMoveLabel(playerMove)} deals no damage this turn.`, 'system');
        }

        if (exchange.opponent.damageDealt > 0) {
            this.player.takeDamage(exchange.opponent.damageDealt);
            this.callbacks.onAddBattleLog(`Player takes ${exchange.opponent.damageDealt} damage from ${target.name}'s ${getMoveLabel(enemyMove)}.`, 'damage');
        } else if (isAttackMove(enemyMove)) {
            this.callbacks.onAddBattleLog(`${target.name}'s ${getMoveLabel(enemyMove)} fails to deal damage.`, 'system');
        }

        if (target.isDead()) {
            this.performKillRewards(target);
        }
    }

    private rollEnemyDirectionalMove(): CombatMove {
        const weightedPool = balanceConfig.combat.enemyDirectionalActionWeights;
        const entries = Object.entries(weightedPool) as [CombatMove, number][];
        const totalWeight = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);

        if (totalWeight <= 0) {
            return 'AttackCenter';
        }

        let roll = Math.random() * totalWeight;
        for (const [move, weight] of entries) {
            roll -= Math.max(0, weight);
            if (roll <= 0) {
                return move;
            }
        }

        return 'AttackCenter';
    }

    private performKillRewards(target: Skeleton): void {
        this.callbacks.onAddBattleLog(`${target.name} defeated!`, 'system');
        this.callbacks.onEnemyDefeated?.(target);
        if (target.xpValue && target.xpValue > 0) {
            const leveledUp = this.player.addXp(target.xpValue);
            this.callbacks.onAddBattleLog(`Gained ${target.xpValue} XP!`, 'system');
            if (leveledUp) {
                this.callbacks.onAddBattleLog(`LEVEL UP! Now level ${this.player.level}!`, 'system');
                this.callbacks.onAddBattleLog(`Gained ${balanceConfig.leveling.skillPointsPerLevel} skill points! HP and mana fully restored!`, 'system');
            }
        }

        this.collectLoot(target);
        if (this.callbacks.getSelectedEnemy() === target) {
            this.callbacks.setSelectedEnemy(null);
        }
    }

    private applyRetaliationEffects(target: Skeleton, isMelee: boolean): void {
        const retaliation = target.onDamagedByPlayer(isMelee);
        retaliation.logs.forEach((message) => this.callbacks.onAddBattleLog(message, 'enemy'));
        if (retaliation.retaliationDamage <= 0) {
            return;
        }

        this.player.takeDamage(retaliation.retaliationDamage);
        this.callbacks.onAddBattleLog(`Player takes ${retaliation.retaliationDamage} retaliation damage.`, 'damage');
        this.callbacks.onUpdateHUD();
    }

    private collectLoot(target: Skeleton): void {
        const loot: Item[] = [];

        const lootable = target as Skeleton & { getLootItems?: () => Item[] };
        if (lootable.getLootItems) {
            loot.push(...lootable.getLootItems());
        }

        if (!(target instanceof Wanderer)) {
            const randomDrop = this.rollMonsterDrop();
            if (randomDrop) {
                loot.push(randomDrop);
            }
        }

        for (const item of loot) {
            this.pendingLoot.push(item);
            this.callbacks.onAddBattleLog(`${item.name} dropped. It will be collected after battle.`, 'system');
        }
    }

    private rollMonsterDrop(): Item | null {
        if (Math.random() >= balanceConfig.items.monsterDropChance) {
            return null;
        }

        const weightedPool = balanceConfig.items.discoveryPool;
        const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
        if (totalWeight <= 0) {
            return null;
        }

        let roll = Math.random() * totalWeight;
        for (const candidate of weightedPool) {
            roll -= candidate.weight;
            if (roll <= 0) {
                const itemData = DISCOVERABLE_ITEM_LIBRARY.find((item) => item.id === candidate.id);
                return itemData ? new Item(itemData) : null;
            }
        }

        return null;
    }
}
