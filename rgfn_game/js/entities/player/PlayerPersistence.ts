import { createItemById } from '../Item.js';
import PlayerInventoryAndRender from './PlayerInventoryAndRender.js';

export default class PlayerPersistence extends PlayerInventoryAndRender {
    public getState(): Record<string, unknown> {
        const inventoryState = this.inventorySystem.getState();
        const combat = this.getCombatState();
        return {
            level: this.level,
            name: this.name,
            xp: this.xp,
            xpToNextLevel: this.xpToNextLevel,
            vitality: this.vitality,
            toughness: this.toughness,
            strength: this.strength,
            agility: this.agility,
            connection: this.connection,
            intelligence: this.intelligence,
            skillPoints: this.skillPoints,
            magicPoints: this.magicPoints,
            hp: this.hp,
            mana: this.mana,
            gold: this.gold,
            fatigue: this.fatigue,
            armorAbsorbedHp: this.armorAbsorbedHp,
            rageTurns: combat.rageTurns,
            rageMultiplier: combat.rageMultiplier,
            blockAdvantage: combat.blockAdvantage,
            successfulDodgeMultiplier: combat.successfulDodgeMultiplier,
            inventoryItemIds: inventoryState.inventoryItemIds,
            equippedWeaponId: inventoryState.equippedWeaponId,
            equippedOffhandWeaponId: inventoryState.equippedOffhandWeaponId,
            equippedArmorId: inventoryState.equippedArmorId,
        };
    }

    public restoreState(state: Record<string, unknown>): void {
        this.level = this.toNumber(state.level, this.level);
        this.name = typeof state.name === 'string' && state.name.trim().length > 0 ? state.name : this.name;
        this.xp = this.toNumber(state.xp, this.xp);
        this.xpToNextLevel = this.toNumber(state.xpToNextLevel, this.xpToNextLevel);
        this.vitality = this.toNumber(state.vitality, this.vitality);
        this.toughness = this.toNumber(state.toughness, this.toughness);
        this.strength = this.toNumber(state.strength, this.strength);
        this.agility = this.toNumber(state.agility, this.agility);
        this.connection = this.toNumber(state.connection, this.connection);
        this.intelligence = this.toNumber(state.intelligence, this.intelligence);
        this.skillPoints = this.toNumber(state.skillPoints, this.skillPoints);
        this.magicPoints = this.toNumber(state.magicPoints, this.magicPoints);
        this.gold = this.toNumber(state.gold, this.gold);
        this.fatigue = Math.max(0, Math.min(this.getMaxFatigue(), this.toNumber(state.fatigue, this.fatigue)));
        this.armorAbsorbedHp = this.toNumber(state.armorAbsorbedHp, 0);
        this.setCombatState({
            rageTurns: this.toNumber(state.rageTurns, 0),
            rageMultiplier: this.toNumber(state.rageMultiplier, 1),
            blockAdvantage: Boolean(state.blockAdvantage),
            successfulDodgeMultiplier: typeof state.successfulDodgeMultiplier === 'number' ? state.successfulDodgeMultiplier : null,
        });

        const inventoryItemIds = Array.isArray(state.inventoryItemIds) ? state.inventoryItemIds.filter((id): id is string => typeof id === 'string') : [];
        const equippedWeaponId = typeof state.equippedWeaponId === 'string' ? state.equippedWeaponId : null;
        const equippedOffhandWeaponId = typeof state.equippedOffhandWeaponId === 'string' ? state.equippedOffhandWeaponId : null;
        const equippedArmorId = typeof state.equippedArmorId === 'string' ? state.equippedArmorId : null;
        this.inventorySystem.restoreState(inventoryItemIds, equippedWeaponId, equippedArmorId, createItemById, equippedOffhandWeaponId);

        this.updateStats();
        this.hp = Math.max(0, Math.min(this.maxHp, this.toNumber(state.hp, this.hp)));
        this.mana = Math.max(0, Math.min(this.maxMana, this.toNumber(state.mana, this.mana)));
    }

    private toNumber(value: unknown, fallback: number): number {
        return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }
}
