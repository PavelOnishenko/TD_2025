import Item, { DISCOVERABLE_ITEM_LIBRARY } from '../../entities/Item.js';
import Skeleton from '../../entities/Skeleton.js';
import Wanderer from '../../entities/Wanderer.js';
import Player from '../../entities/player/Player.js';
import { balanceConfig } from '../../config/balance/balanceConfig.js';

type LootCallbacks = {
    onAddBattleLog: (message: string, type?: string) => void;
    onUpdateHUD: () => void;
    onEnemyDefeated?: (enemy: Skeleton) => void;
    getSelectedEnemy: () => Skeleton | null;
    setSelectedEnemy: (enemy: Skeleton | null) => void;
};

export default class BattleLootManager {
    private pendingLoot: Item[] = [];

    public collectLoot(target: Skeleton, callbacks: LootCallbacks): void {
        this.collectLootInternal(target, callbacks);
    }

    public handleKillRewards(target: Skeleton, player: Player, callbacks: LootCallbacks): void {
        callbacks.onAddBattleLog(`${target.name} defeated!`, 'system');
        callbacks.onEnemyDefeated?.(target);

        if (target.xpValue && target.xpValue > 0) {
            const leveledUp = player.addXp(target.xpValue);
            callbacks.onAddBattleLog(`Gained ${target.xpValue} XP!`, 'system');
            if (leveledUp) {
                callbacks.onAddBattleLog(`LEVEL UP! Now level ${player.level}!`, 'system');
                callbacks.onAddBattleLog(`Gained ${balanceConfig.leveling.skillPointsPerLevel} skill points! HP and mana fully restored!`, 'system');
            }
        }

        this.collectLootInternal(target, callbacks);
        if (callbacks.getSelectedEnemy() === target) {
            callbacks.setSelectedEnemy(null);
        }
    }

    public resolvePendingLoot(player: Player, callbacks: LootCallbacks): void {
        if (this.pendingLoot.length === 0) {
            return;
        }

        for (const item of this.pendingLoot) {
            if (player.addItemToInventory(item)) {
                callbacks.onAddBattleLog(`Looted ${item.name}.`, 'system');
                continue;
            }

            callbacks.onAddBattleLog(`Could not loot ${item.name}: inventory full.`, 'system');
        }

        this.pendingLoot = [];
        callbacks.onUpdateHUD();
    }

    public clearPendingLoot = (): void => {
        this.pendingLoot = [];
    };

    private collectLootInternal(target: Skeleton, callbacks: LootCallbacks): void {
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
            callbacks.onAddBattleLog(`${item.name} dropped. It will be collected after battle.`, 'system');
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
            if (roll > 0) {
                continue;
            }

            const itemData = DISCOVERABLE_ITEM_LIBRARY.find((item) => item.id === candidate.id);
            return itemData ? new Item(itemData) : null;
        }

        return null;
    }
}
