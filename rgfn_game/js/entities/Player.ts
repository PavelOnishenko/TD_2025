import Entity from '../../../engine/core/Entity.js';
import { withDamageable } from '../../../engine/core/Damageable.js';
import {
    getXpForLevel,
    calculateMaxHp,
    calculateMeleeDamageBonus,
    calculateBowDamageBonus,
    calculateTotalMeleeDamage,
    calculateTotalBowDamage,
    calculateAvoidChance,
    calculateArmor,
    calculateMana,
    levelConfig
} from '../config/levelConfig.js';
import { balanceConfig } from '../config/balanceConfig.js';
import Item from './Item.js';
import { createItemById } from './Item.js';
import PlayerInventory from './PlayerInventory.js';
import PlayerRenderer from './PlayerRenderer.js';

const DamageableEntity = withDamageable(Entity);

type PlayerStat = 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence';
const RANDOM_NAME_POOL = [
    'Arin', 'Kael', 'Nyx', 'Sable', 'Thorne', 'Mira', 'Orin', 'Vex', 'Lyra', 'Dorian',
    'Selene', 'Riven', 'Kara', 'Juno', 'Bram', 'Talia', 'Ezra', 'Nora', 'Cassian', 'Iris'
];
const RANDOM_STAT_POOL: PlayerStat[] = ['vitality', 'toughness', 'strength', 'agility', 'connection', 'intelligence'];

export default class Player extends DamageableEntity {
    declare x: number;
    declare y: number;
    declare width: number;
    declare height: number;
    declare velocityX: number;
    declare velocityY: number;
    declare active: boolean;
    declare id: number;

    declare move: (deltaTime: number) => void;
    declare getBounds: () => { left: number; right: number; top: number; bottom: number };
    declare checkCollision: (other: any) => boolean;

    declare hp: number;
    declare maxHp: number;

    declare initDamageable: (maxHp: number) => void;
    declare heal: (amount: number) => void;
    declare isDead: () => boolean;
    declare getHealthPercent: () => number;
    declare healToFull: () => void;

    public damage: number;
    public name: string;
    public armor: number = 0;
    public avoidChance: number = 0;
    public gridCol?: number;
    public gridRow?: number;

    public level: number = 1;
    public xp: number = 0;
    public xpToNextLevel: number;

    public vitality: number = 0;
    public toughness: number = 0;
    public strength: number = 0;
    public agility: number = 0;
    public connection: number = 0;
    public intelligence: number = 0;
    public skillPoints: number = 0;
    public magicPoints: number = 0;
    public mana: number = 0;
    public maxMana: number = 0;
    public gold: number = 0;

    private rageTurns: number = 0;
    private rageMultiplier: number = 1;

    private readonly inventorySystem: PlayerInventory;
    private readonly renderer: PlayerRenderer;
    private armorAbsorbedHp: number = 0;

    public get equippedWeapon(): Item | null {
        return this.inventorySystem.getEquippedWeapon();
    }


    public get equippedArmor(): Item | null {
        return this.inventorySystem.getEquippedArmor();
    }

    public set equippedArmor(armor: Item | null) {
        this.inventorySystem.setEquippedArmor(armor);
    }
    public set equippedWeapon(weapon: Item | null) {
        this.inventorySystem.setEquippedWeapon(weapon);
    }

    constructor(x: number, y: number) {
        super(x, y);
        this.name = Player.generateRandomName();
        this.width = balanceConfig.player.width;
        this.height = balanceConfig.player.height;

        this.vitality = balanceConfig.player.initialVitality;
        this.toughness = balanceConfig.player.initialToughness;
        this.strength = balanceConfig.player.initialStrength;
        this.agility = balanceConfig.player.initialAgility;
        this.connection = balanceConfig.player.initialConnection;
        this.intelligence = balanceConfig.player.initialIntelligence;
        this.skillPoints = balanceConfig.player.initialSkillPoints;
        this.allocateRandomStartingStats();

        this.inventorySystem = new PlayerInventory({
            onEquipmentChanged: () => this.updateStats(),
            onHealingPotionUsed: () => this.heal(5),
            onManaPotionUsed: () => this.restoreMana(balanceConfig.combat.manaPotionRestore),
            canEquip: (item) => this.canEquipItem(item),
        });
        this.renderer = new PlayerRenderer();

        this.updateStats();
        this.mana = this.maxMana;
        this.gold = Math.floor(Math.random() * 6);
        this.xpToNextLevel = getXpForLevel(2);

        this.initDamageable(this.maxHp);
    }

    private static generateRandomName(): string {
        return RANDOM_NAME_POOL[Math.floor(Math.random() * RANDOM_NAME_POOL.length)];
    }

    private allocateRandomStartingStats(): void {
        const pointsToAllocate = Math.max(0, balanceConfig.player.initialRandomAllocatedSkillPoints ?? 0);
        for (let i = 0; i < pointsToAllocate; i++) {
            const randomStat = RANDOM_STAT_POOL[Math.floor(Math.random() * RANDOM_STAT_POOL.length)];
            this[randomStat] += 1;
        }
    }

    public takeDamage(amount: number): boolean {
        if (amount <= 0) {
            return super.takeDamage(0);
        }

        const equippedArmor = this.equippedArmor;
        const armorReductionPercent = equippedArmor?.effects.damageReductionPercent ?? 0;
        const reducedByPercent = Math.floor(amount * (1 - armorReductionPercent));
        const armorCap = equippedArmor?.effects.maxAbsorbHp;
        const armorDepleted = typeof armorCap === 'number' && this.armorAbsorbedHp >= armorCap;

        const effectiveArmor = armorDepleted ? 0 : this.armor;
        const damageAfterArmor = Math.max(
            balanceConfig.combat.minDamageAfterArmor,
            reducedByPercent - effectiveArmor
        );

        if (effectiveArmor > 0 && typeof armorCap === 'number') {
            const absorbed = Math.max(0, reducedByPercent - damageAfterArmor);
            this.armorAbsorbedHp += absorbed;
        }

        return super.takeDamage(damageAfterArmor);
    }

    public takeMagicDamage(amount: number): boolean {
        return super.takeDamage(Math.max(0, amount));
    }

    public updateStats(): void {
        const previousMaxMana = this.maxMana;
        const previousMana = this.mana;
        const hadFullMana = previousMaxMana > 0 && previousMana === previousMaxMana;
        this.maxMana = calculateMana(this.connection, this.intelligence);
        this.maxMana = calculateMana(this.connection, this.intelligence);
        const equippedArmor = this.equippedArmor;
        const armorFlatBonus = equippedArmor?.effects.flatArmor ?? 0;
        this.armor = calculateArmor(this.toughness) + armorFlatBonus;
        this.maxHp = calculateMaxHp(this.vitality);
        this.avoidChance = calculateAvoidChance(this.agility);

        const meleeStatBonus = calculateMeleeDamageBonus(this.strength, this.agility);
        const rangedStatBonus = calculateBowDamageBonus(this.strength, this.agility);
        const fistBaseDamage = balanceConfig.combat.fistDamagePerHand;

        if (!this.equippedWeapon) {
            this.damage = fistBaseDamage * 2 + meleeStatBonus;
            return;
        }

        if (previousMaxMana === 0 || hadFullMana) {
            this.mana = this.maxMana;
            return;
        }

        this.mana = Math.min(this.maxMana, previousMana);
        const offhandFist = this.equippedWeapon.handsRequired === 1 ? fistBaseDamage : 0;
        const weaponDamage = this.equippedWeapon.damageBonus;
        const statBonus = this.equippedWeapon.isRanged ? rangedStatBonus : meleeStatBonus;
        this.damage = weaponDamage + offhandFist + statBonus;
    }

    public addXp(amount: number): boolean {
        if (this.level >= levelConfig.maxLevel) {
            return false;
        }

        this.xp += amount;

        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
            return true;
        }

        return false;
    }

    private levelUp(): void {
        if (this.level >= levelConfig.maxLevel) {
            return;
        }

        this.level++;
        this.xp -= this.xpToNextLevel;
        this.skillPoints += levelConfig.skillPointsPerLevel;
        this.xpToNextLevel = getXpForLevel(this.level + 1);

        // Update stats (this recalculates maxHp)
        this.updateStats();

        this.healToFull();
        this.mana = this.maxMana;
    }

    public addStat(stat: PlayerStat, amount: number = 1): boolean {
        if (this.skillPoints < amount) {
            return false;
        }

        const previousIntelligence = this.intelligence;

        switch (stat) {
            case 'vitality':
                this.vitality += amount;
                break;
            case 'toughness':
                this.toughness += amount;
                break;
            case 'strength':
                this.strength += amount;
                break;
            case 'agility':
                this.agility += amount;
                break;
            case 'connection':
                this.connection += amount;
                break;
            case 'intelligence':
                this.intelligence += amount;
                break;
            default:
                return false;
        }

        this.skillPoints -= amount;

        // Store current HP percentage
        // Update derived stats
        this.updateStats();
        this.hp = Math.min(this.hp, this.maxHp);

        if (stat === 'intelligence') {
            const gainedMagicPoints = Math.floor(this.intelligence / 3) - Math.floor(previousIntelligence / 3);
            if (gainedMagicPoints > 0) {
                this.magicPoints += gainedMagicPoints;
            }
        }

        return true;
    }


    public restoreMana(amount: number): void {
        if (amount <= 0) {
            return;
        }

        this.mana = Math.min(this.maxMana, this.mana + amount);
    }

    public spendMana(amount: number): boolean {
        if (amount <= 0) {
            return true;
        }

        if (this.mana < amount) {
            return false;
        }

        this.mana -= amount;
        return true;
    }

    public canSpendMana(amount: number): boolean {
        return this.mana >= amount;
    }

    public getPhysicalDamageWithBuff(): number {
        return Math.round(this.damage * this.rageMultiplier);
    }

    public getMagicPowerMultiplier(): number {
        return this.rageMultiplier;
    }

    public applyRage(turns: number, multiplier: number): void {
        this.rageTurns = Math.max(this.rageTurns, turns);
        this.rageMultiplier = Math.max(this.rageMultiplier, multiplier);
    }

    public consumePlayerTurnEffects(): string[] {
        const events: string[] = [];

        if (this.rageTurns > 0) {
            this.rageTurns -= 1;
            if (this.rageTurns === 0) {
                this.rageMultiplier = 1;
                events.push('Rage fades.');
            }
        }

        return events;
    }

    public getArmorReduction(): number {
        return this.armor;
    }

    public addItemToInventory(item: Item): boolean {
        return this.inventorySystem.addItem(item);
    }

    public useHealingPotion(): boolean {
        return this.inventorySystem.useHealingPotion();
    }

    public getInventory(): Item[] {
        return this.inventorySystem.getItems();
    }

    public getHealingPotionCount(): number {
        return this.inventorySystem.getHealingPotionCount();
    }

    public getManaPotionCount(): number {
        return this.inventorySystem.getManaPotionCount();
    }

    public useManaPotion(): boolean {
        return this.inventorySystem.useManaPotion();
    }

    public removeHealingPotionFromInventory(): boolean {
        return this.inventorySystem.removeHealingPotion();
    }

    public removeManaPotionFromInventory(): boolean {
        return this.inventorySystem.removeManaPotion();
    }


    public removeInventoryItemAt(index: number): Item | null {
        return this.inventorySystem.removeItemAt(index);
    }


    public unequipWeapon(): Item | null {
        return this.inventorySystem.unequipWeapon();
    }

    public unequipArmor(): Item | null {
        return this.inventorySystem.unequipArmor();
    }

    /**
     * Get the player's current attack range
     * @returns number of cells the player can attack from
     */
    public getAttackRange(): number {
        return this.inventorySystem.getAttackRange();
    }

    public hasWeapon(): boolean {
        return this.inventorySystem.hasWeapon();
    }

    public getAvoidFormulaText(): string {
        const scale = balanceConfig.stats.avoidChanceScale;
        const capPercent = Math.round(balanceConfig.stats.avoidChanceCap * 100);
        const scaledAgility = this.agility * scale;
        const rawChance = 1 - (1 / (1 + scaledAgility));
        const finalChance = Math.min(balanceConfig.stats.avoidChanceCap, rawChance);
        const finalPercent = (finalChance * 100).toFixed(1);

        return `min(${capPercent}%, (1 - 1/(1 + AGI×${scale.toFixed(3)}))×100) = ${finalPercent}%`;
    }

    public getDamageFormulaText(): string {
        const fistBaseDamage = balanceConfig.combat.fistDamagePerHand;
        const weapon = this.equippedWeapon;

        if (!weapon) {
            const statBonus = calculateMeleeDamageBonus(this.strength, this.agility);
            return `Unarmed: ${fistBaseDamage} + ${fistBaseDamage} + melee bonus (${statBonus}) = ${this.damage}`;
        }

        const statBonus = weapon.isRanged
            ? calculateBowDamageBonus(this.strength, this.agility)
            : calculateMeleeDamageBonus(this.strength, this.agility);
        const offhand = weapon.handsRequired === 1 ? fistBaseDamage : 0;
        const style = weapon.isRanged ? 'Ranged' : 'Melee';

        return `${style}: weapon ${weapon.damageBonus} + off-hand ${offhand} + stat bonus ${statBonus} = ${this.damage}`;
    }

    public canEquipItem(item: Item): boolean {
        const requiredAgility = item.requirements.agility ?? 0;
        const requiredStrength = item.requirements.strength ?? 0;
        return this.agility >= requiredAgility && this.strength >= requiredStrength;
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: any): void {
        this.renderer.draw(ctx, this);
    }

    public getState(): Record<string, unknown> {
        const inventoryState = this.inventorySystem.getState();
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
            armorAbsorbedHp: this.armorAbsorbedHp,
            rageTurns: this.rageTurns,
            rageMultiplier: this.rageMultiplier,
            inventoryItemIds: inventoryState.inventoryItemIds,
            equippedWeaponId: inventoryState.equippedWeaponId,
            equippedArmorId: inventoryState.equippedArmorId,
        };
    }

    public restoreState(state: Record<string, unknown>): void {
        const toNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

        this.level = toNumber(state.level, this.level);
        this.name = typeof state.name === 'string' && state.name.trim().length > 0 ? state.name : this.name;
        this.xp = toNumber(state.xp, this.xp);
        this.xpToNextLevel = toNumber(state.xpToNextLevel, this.xpToNextLevel);
        this.vitality = toNumber(state.vitality, this.vitality);
        this.toughness = toNumber(state.toughness, this.toughness);
        this.strength = toNumber(state.strength, this.strength);
        this.agility = toNumber(state.agility, this.agility);
        this.connection = toNumber(state.connection, this.connection);
        this.intelligence = toNumber(state.intelligence, this.intelligence);
        this.skillPoints = toNumber(state.skillPoints, this.skillPoints);
        this.magicPoints = toNumber(state.magicPoints, this.magicPoints);
        this.gold = toNumber(state.gold, this.gold);
        this.armorAbsorbedHp = toNumber(state.armorAbsorbedHp, 0);
        this.rageTurns = toNumber(state.rageTurns, 0);
        this.rageMultiplier = toNumber(state.rageMultiplier, 1);

        const inventoryItemIds = Array.isArray(state.inventoryItemIds) ? state.inventoryItemIds.filter((id): id is string => typeof id === 'string') : [];
        const equippedWeaponId = typeof state.equippedWeaponId === 'string' ? state.equippedWeaponId : null;
        const equippedArmorId = typeof state.equippedArmorId === 'string' ? state.equippedArmorId : null;
        this.inventorySystem.restoreState(inventoryItemIds, equippedWeaponId, equippedArmorId, createItemById);

        this.updateStats();
        this.hp = Math.max(0, Math.min(this.maxHp, toNumber(state.hp, this.hp)));
        this.mana = Math.max(0, Math.min(this.maxMana, toNumber(state.mana, this.mana)));
    }
}
