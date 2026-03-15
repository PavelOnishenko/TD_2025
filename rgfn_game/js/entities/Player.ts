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
    levelConfig
} from '../config/levelConfig.js';
import { balanceConfig } from '../config/balanceConfig.js';
import Item from './Item.js';
import PlayerInventory from './PlayerInventory.js';
import PlayerRenderer from './PlayerRenderer.js';

// Extend Entity with Damageable functionality
const DamageableEntity = withDamageable(Entity);

export default class Player extends DamageableEntity {
    // Explicitly declare inherited properties from Entity
    declare x: number;
    declare y: number;
    declare width: number;
    declare height: number;
    declare velocityX: number;
    declare velocityY: number;
    declare active: boolean;
    declare id: number;

    // Explicitly declare inherited methods from Entity
    declare move: (deltaTime: number) => void;
    declare getBounds: () => { left: number; right: number; top: number; bottom: number };
    declare checkCollision: (other: any) => boolean;

    // Explicitly declare inherited properties from Damageable
    declare hp: number;
    declare maxHp: number;

    // Explicitly declare inherited methods from Damageable
    declare initDamageable: (maxHp: number) => void;
    declare heal: (amount: number) => void;
    declare isDead: () => boolean;
    declare getHealthPercent: () => number;
    declare healToFull: () => void;

    // Player-specific properties
    public damage: number;
    public armor: number = 0;
    public avoidChance: number = 0;
    public gridCol?: number;
    public gridRow?: number;

    // Level system
    public level: number = 1;
    public xp: number = 0;
    public xpToNextLevel: number;

    // Stats
    public vitality: number = 0;
    public toughness: number = 0;
    public strength: number = 0;
    public agility: number = 0;
    public skillPoints: number = 0;
    public gold: number = 20;

    // Equipment & Inventory
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
        this.width = balanceConfig.player.width;
        this.height = balanceConfig.player.height;

        // Initialize stats from balance config
        this.vitality = balanceConfig.player.initialVitality;
        this.toughness = balanceConfig.player.initialToughness;
        this.strength = balanceConfig.player.initialStrength;
        this.agility = balanceConfig.player.initialAgility;
        this.skillPoints = balanceConfig.player.initialSkillPoints;

        this.inventorySystem = new PlayerInventory({
            onEquipmentChanged: () => this.updateStats(),
            onHealingPotionUsed: () => this.heal(5),
            onManaPotionUsed: () => this.restoreMana(balanceConfig.combat.manaPotionRestore),
            canEquip: (item) => this.canEquipItem(item),
        });
        this.renderer = new PlayerRenderer();

        // Calculate initial stats
        this.updateStats();
        this.xpToNextLevel = getXpForLevel(2);

        // Initialize Damageable functionality with calculated maxHp
        this.initDamageable(this.maxHp);
    }

    /**
     * Override takeDamage to apply armor reduction before damage.
     * Armor can never completely negate a positive incoming hit.
     */
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

    /**
     * Update derived stats based on allocated stat points
     */
    public updateStats(): void {
        const previousMaxMana = this.maxMana;
        const previousMana = this.mana;
        const hadFullMana = previousMaxMana > 0 && previousMana === previousMaxMana;

        this.maxMana = calculateMana(this.connection, this.intelligence);
        const equippedArmor = this.equippedArmor;
        const armorFlatBonus = equippedArmor?.effects.flatArmor ?? 0;
        this.armor = calculateArmor(this.toughness) + armorFlatBonus;
        this.maxHp = calculateMaxHp(this.vitality);
        this.armor = calculateArmor(this.toughness) + armorFlatBonus;
        this.avoidChance = calculateAvoidChance(this.agility);

        const meleeStatBonus = calculateMeleeDamageBonus(this.strength, this.agility);
        const rangedStatBonus = calculateBowDamageBonus(this.strength, this.agility);
        const fistBaseDamage = balanceConfig.combat.fistDamagePerHand;

        if (!this.equippedWeapon) {
            this.damage = fistBaseDamage * 2 + meleeStatBonus;
            return;
        }

        const offhandFist = this.equippedWeapon.handsRequired === 1 ? fistBaseDamage : 0;
        const weaponDamage = this.equippedWeapon.damageBonus;
        const statBonus = this.equippedWeapon.isRanged ? rangedStatBonus : meleeStatBonus;
        this.damage = weaponDamage + offhandFist + statBonus;
    }

    /**
     * Add experience points and handle level ups
     * @returns true if player leveled up
     */
    public addXp(amount: number): boolean {
        if (this.level >= levelConfig.maxLevel) {
            return false;
        }

        this.xp += amount;

        // Check for level up
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
            return true;
        }

        return false;
    }

    /**
     * Level up the player
     */
    private levelUp(): void {
        if (this.level >= levelConfig.maxLevel) {
            return;
        }

        this.level++;
        this.xp -= this.xpToNextLevel;

        // Grant skill points
        this.skillPoints += levelConfig.skillPointsPerLevel;

        // Update XP requirement for next level
        this.xpToNextLevel = getXpForLevel(this.level + 1);

        // Update stats (this recalculates maxHp)
        this.updateStats();

        // Heal to full HP (use Damageable method)
        this.healToFull();
    }

    /**
     * Allocate a skill point to a stat
     * @returns true if allocation was successful
     */
    public addStat(stat: 'vitality' | 'toughness' | 'strength' | 'agility', amount: number = 1): boolean {
        if (this.skillPoints < amount) {
            return false;
        }

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
            default:
                return false;
        }

        this.skillPoints -= amount;

        // Store current HP percentage
        // Update derived stats
        this.updateStats();

        // Restore HP percentage (so increasing vitality doesn't heal you mid-battle)
        this.hp = Math.min(this.hp, this.maxHp);

        return true;
    }

    /**
     * Get the actual damage reduction from armor
     */
    public getArmorReduction(): number {
        return this.armor;
    }

    /**
     * Add an item to inventory and auto-equip weapons when obtained.
     * @returns true if item was added successfully
     */
    public addItemToInventory(item: Item): boolean {
        return this.inventorySystem.addItem(item);
    }

    /**
     * Use one healing potion from inventory if available.
     * @returns true if a potion was used
     */
    public useHealingPotion(): boolean {
        return this.inventorySystem.useHealingPotion();
    }

    /**
     * Returns a copy of inventory contents for UI rendering.
     */
    public getInventory(): Item[] {
        return this.inventorySystem.getItems();
    }

    public getHealingPotionCount(): number {
        return this.inventorySystem.getHealingPotionCount();
    }

    public removeHealingPotionFromInventory(): boolean {
        return this.inventorySystem.removeHealingPotion();
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

    /**
     * Check if the player has a specific item equipped
     */
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
}
