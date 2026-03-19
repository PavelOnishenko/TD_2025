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
import {
    BattleActionIntent,
    CombatIntentType,
    CombatUiActionId,
    PLAYER_COMBAT_ACTIONS,
} from '../../types/combat.js';
import CombatAi from '../combat/CombatAi.js';
import CombatResolver from '../combat/CombatResolver.js';
import {
    ensureCombatState,
    getParticipantId,
    isHostileIntent,
    resetEncounterCombatState,
} from '../combat/CombatParticipantUtils.js';

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
};

export default class BattleCommandController {
    private readonly stateMachine: StateMachine;
    private readonly player: Player;
    private readonly battleMap: BattleMap;
    private readonly turnManager: TurnManager;
    private readonly callbacks: BattleCommandCallbacks;
    private readonly magicSystem: MagicSystem;
    private readonly combatAi: CombatAi;
    private readonly combatResolver: CombatResolver;
    private pendingLoot: Item[] = [];
    private pendingPlayerIntent: BattleActionIntent | null = null;
    private playerIntentConsumed = false;

    constructor(stateMachine: StateMachine, player: Player, battleMap: BattleMap, turnManager: TurnManager, magicSystem: MagicSystem, callbacks: BattleCommandCallbacks) {
        this.stateMachine = stateMachine;
        this.player = player;
        this.battleMap = battleMap;
        this.turnManager = turnManager;
        this.magicSystem = magicSystem;
        this.callbacks = callbacks;
        this.combatAi = new CombatAi();
        this.combatResolver = new CombatResolver();
    }

    public handleCombatAction(actionId: CombatUiActionId): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }
        const action = PLAYER_COMBAT_ACTIONS.find((entry) => entry.id === actionId);
        if (!action) {
            return;
        }
        if (action.requiresRangedWeapon && this.player.getAttackRange() <= 1) {
            this.callbacks.onAddBattleLog('You need a bow or another ranged weapon for that shot.', 'system');
            return;
        }
        const target = this.resolveAttackTarget(this.turnManager.getActiveEnemies() as Skeleton[]);
        if (this.requiresTarget(action.type) && !target) {
            this.callbacks.onAddBattleLog('No enemy in range for that action.', 'system');
            return;
        }
        this.beginPlayerTurnResolution();
        this.pendingPlayerIntent = this.createPlayerIntent(action.type, action.direction, target);
        this.playerIntentConsumed = action.type === 'heavy';
        this.logPlayerIntent(action.type, action.direction, target);
        if (action.type === 'heavy') {
            ensureCombatState(this.player).preparedHeavyAttack = {
                direction: action.direction ?? 'center',
                targetId: getParticipantId(target),
                targetName: target?.name ?? 'target',
            };
        }
        this.advanceToEnemyPhase(timingConfig.battle.playerActionDelay);
    }

    public triggerPreparedPlayerAction(): boolean {
        const state = ensureCombatState(this.player);
        if (!state.preparedHeavyAttack || !this.canUseBattleTurnInput()) {
            return false;
        }
        this.beginPlayerTurnResolution();
        this.pendingPlayerIntent = this.createPlayerIntent('heavy-release', state.preparedHeavyAttack.direction, this.findEnemyById(state.preparedHeavyAttack.targetId));
        this.playerIntentConsumed = false;
        this.callbacks.onAddBattleLog(`You release the prepared ${state.preparedHeavyAttack.direction} heavy strike.`, 'player');
        state.preparedHeavyAttack = null;
        this.advanceToEnemyPhase(timingConfig.battle.playerActionDelay);
        return true;
    }

    public resolveEnemyTurn(enemy: Skeleton): 'continue' | 'defeat' | 'victory' {
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        const enemyIntent = this.combatAi.chooseIntent(enemy, this.player, this.battleMap, this.pendingPlayerIntent);
        const playerUsedAction = this.resolvePlayerIntentAgainstEnemy(enemy, enemyIntent);
        if (playerUsedAction && (enemyIntent.type === 'counter' || enemy.isDead())) {
            return this.evaluateBattleState();
        }
        const outcome = this.resolveIntent(enemy, this.player, enemyIntent, this.pendingPlayerIntent);
        if (enemyIntent.type === 'move') {
            this.handleEnemyMove(enemy);
        }
        if (this.player.isDead()) {
            this.callbacks.onAddBattleLog('You have been defeated!', 'system');
            return 'defeat';
        }
        this.flushLogs(outcome.logs);
        this.callbacks.onUpdateHUD();
        return this.evaluateBattleState();
    }

    public finishEnemyRound(): void {
        this.playerIntentConsumed = false;
        this.pendingPlayerIntent = null;
        this.combatResolver.finalizeRound(this.player, this.turnManager.getActiveEnemies() as Skeleton[]);
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
        this.beginPlayerTurnResolution();
        this.callbacks.onAddBattleLog(result.message, 'player');
        if (target instanceof Skeleton && target.isDead()) {
            this.performKillRewards(target);
        }
        this.callbacks.onUpdateHUD();
        this.advanceToEnemyPhase(timingConfig.battle.playerActionDelay);
    }

    public handleFlee(): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }
        if (!this.battleMap.isEntityOnEdge(this.player)) {
            this.callbacks.onAddBattleLog('You can only flee when standing on the battle map edge.', 'system');
            return;
        }
        this.beginPlayerTurnResolution();
        if (Math.random() < balanceConfig.combat.fleeChance) {
            this.callbacks.onAddBattleLog('You fled from battle!', 'system');
            setTimeout(() => this.callbacks.onEndBattle('fled'), timingConfig.battle.fleeSuccessDelay);
            return;
        }
        this.callbacks.onAddBattleLog('Failed to flee!', 'system');
        this.advanceToEnemyPhase(timingConfig.battle.fleeFailedDelay);
    }

    public handleWait(): void {
        if (!this.canUseBattleTurnInput()) {
            return;
        }
        this.beginPlayerTurnResolution();
        this.pendingPlayerIntent = { type: 'wait', direction: null, targetId: null, source: 'player' };
        this.callbacks.onAddBattleLog('You wait and watch the enemy.', 'player');
        this.advanceToEnemyPhase(timingConfig.battle.waitActionDelay);
    }

    public handleUseManaPotion(fromBattleControls: boolean): void {
        const inBattle = this.stateMachine.isInState('BATTLE');
        if (fromBattleControls && !inBattle) {
            return;
        }
        if (inBattle && !this.canUseBattleTurnInput()) {
            return;
        }
        if (!this.player.useManaPotion()) {
            this.callbacks.onAddBattleLog('No mana potions in inventory.', 'system');
            this.callbacks.onUpdateHUD();
            return;
        }
        this.callbacks.onAddBattleLog(`You drink a mana potion (+${balanceConfig.combat.manaPotionRestore} mana).`, inBattle ? 'player' : 'system');
        this.callbacks.onUpdateHUD();
        if (!inBattle) {
            return;
        }
        this.beginPlayerTurnResolution();
        this.pendingPlayerIntent = { type: 'item', direction: null, targetId: null, source: 'player' };
        this.advanceToEnemyPhase(timingConfig.battle.playerActionDelay);
    }

    public handleUsePotion(fromBattleControls: boolean): void {
        const inBattle = this.stateMachine.isInState('BATTLE');
        if (fromBattleControls && !inBattle) {
            return;
        }
        if (inBattle && !this.canUseBattleTurnInput()) {
            return;
        }
        if (!this.player.useHealingPotion()) {
            this.callbacks.onAddBattleLog('No healing potions in inventory.', 'system');
            this.callbacks.onUpdateHUD();
            return;
        }
        this.callbacks.onAddBattleLog('You drink a healing potion (+5 HP).', inBattle ? 'player' : 'system');
        this.callbacks.onUpdateHUD();
        if (!inBattle) {
            return;
        }
        this.beginPlayerTurnResolution();
        this.pendingPlayerIntent = { type: 'item', direction: null, targetId: null, source: 'player' };
        this.advanceToEnemyPhase(timingConfig.battle.playerActionDelay);
    }

    public onBattleStarted(enemies: Skeleton[]): void {
        resetEncounterCombatState(this.player);
        enemies.forEach((enemy) => resetEncounterCombatState(enemy));
        this.pendingPlayerIntent = null;
        this.playerIntentConsumed = false;
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
        this.pendingPlayerIntent = null;
        this.playerIntentConsumed = false;
    }

    private beginPlayerTurnResolution(): void {
        this.callbacks.onEnableBattleButtons(false);
        this.callbacks.onPlayerTurnTransitionStart();
        this.turnManager.waitingForPlayer = false;
    }

    private advanceToEnemyPhase(delay: number): void {
        this.turnManager.nextTurn();
        setTimeout(() => this.callbacks.onProcessTurn(), delay);
    }

    private canUseBattleTurnInput(): boolean {
        return this.turnManager.isPlayerTurn() && this.turnManager.waitingForPlayer;
    }

    private requiresTarget(type: CombatIntentType): boolean {
        return ['attack', 'heavy', 'shoot', 'heavy-release'].includes(type);
    }

    private createPlayerIntent(type: CombatIntentType, direction: BattleActionIntent['direction'], target: Skeleton | null): BattleActionIntent {
        return { type, direction, targetId: getParticipantId(target), source: 'player' };
    }

    private logPlayerIntent(type: CombatIntentType, direction: BattleActionIntent['direction'], target: Skeleton | null): void {
        const targetName = target?.name ?? 'enemy';
        const messages: Record<string, string> = {
            attack: `You line up a ${direction} attack on ${targetName}.`,
            heavy: `You begin a heavy ${direction} strike toward ${targetName}.`,
            counter: 'You raise a counterattack stance.',
            dodge: `You shift ${direction}.`,
            shoot: direction === 'center'
                ? `You aim a straight shot at ${targetName}.`
                : `You aim a ${direction} lead shot at ${targetName}.`,
        };
        this.callbacks.onAddBattleLog(messages[type] ?? 'You act.', 'player');
    }

    private resolveAttackTarget(enemies: Skeleton[]): Skeleton | null {
        const selectedEnemy = this.callbacks.getSelectedEnemy();
        const attackRange = this.player.getAttackRange();
        if (selectedEnemy && !selectedEnemy.isDead() && this.battleMap.isInAttackRange(this.player, selectedEnemy, attackRange)) {
            return selectedEnemy;
        }
        return enemies.find((enemy) => this.battleMap.isInAttackRange(this.player, enemy, attackRange)) ?? null;
    }

    private resolveSpellTarget(spellId: BaseSpellId, enemies: Skeleton[]): Skeleton | null {
        const selectedEnemy = this.callbacks.getSelectedEnemy();
        const spellRange = (spellId === 'slow' ? balanceConfig.combat.spellRanges.slow : undefined) ?? this.player.getAttackRange();
        if (selectedEnemy && !selectedEnemy.isDead() && this.battleMap.isInAttackRange(this.player, selectedEnemy, spellRange)) {
            return selectedEnemy;
        }
        return enemies.find((enemy) => this.battleMap.isInAttackRange(this.player, enemy, spellRange)) ?? null;
    }

    private resolvePlayerIntentAgainstEnemy(enemy: Skeleton, enemyIntent: BattleActionIntent): boolean {
        if (!this.pendingPlayerIntent || this.playerIntentConsumed) {
            return false;
        }
        if (!isHostileIntent(this.pendingPlayerIntent) || this.pendingPlayerIntent.targetId !== enemy.id) {
            return false;
        }
        const outcome = this.resolveIntent(this.player, enemy, this.pendingPlayerIntent, enemyIntent);
        this.playerIntentConsumed = true;
        this.flushLogs(outcome.logs);
        if (enemy.isDead()) {
            this.performKillRewards(enemy);
        }
        this.callbacks.onUpdateHUD();
        return true;
    }

    private resolveIntent(attacker: Player | Skeleton, defender: Player | Skeleton, intent: BattleActionIntent, opposingIntent: BattleActionIntent | null) {
        return this.combatResolver.resolve(attacker, defender, intent, opposingIntent, this.battleMap);
    }

    private handleEnemyMove(enemy: Skeleton): void {
        const moved = this.battleMap.moveEntityToward(enemy, this.player, 1);
        this.callbacks.onAddBattleLog(moved ? `${enemy.name} stalks closer...` : `${enemy.name} hesitates.`, 'enemy');
    }

    private flushLogs(logs: Array<{ message: string; type: string }>): void {
        logs.forEach((entry) => this.callbacks.onAddBattleLog(entry.message, entry.type));
    }

    private evaluateBattleState(): 'continue' | 'defeat' | 'victory' {
        if (this.player.isDead()) {
            return 'defeat';
        }
        return this.turnManager.getActiveEnemies().length === 0 ? 'victory' : 'continue';
    }

    private findEnemyById(targetId: number | null): Skeleton | null {
        if (targetId === null) {
            return null;
        }
        const enemies = this.turnManager.getActiveEnemies() as Skeleton[];
        return enemies.find((enemy) => enemy.id === targetId) ?? null;
    }

    private performKillRewards(target: Skeleton): void {
        this.callbacks.onAddBattleLog(`${target.name} defeated!`, 'system');
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
        loot.forEach((item) => {
            this.pendingLoot.push(item);
            this.callbacks.onAddBattleLog(`${item.name} dropped. It will be collected after battle.`, 'system');
        });
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
