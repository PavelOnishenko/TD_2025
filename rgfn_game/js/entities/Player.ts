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

    public get equippedWeapon(): Item | null {
        return this.inventorySystem.getEquippedWeapon();
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
        this.skillPoints = 0;

        this.inventorySystem = new PlayerInventory({
            onWeaponChanged: () => this.updateStats(),
            onHealingPotionUsed: () => this.heal(5)
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

        const damageAfterArmor = Math.max(
            balanceConfig.combat.minDamageAfterArmor,
            amount - this.armor
        );

        return super.takeDamage(damageAfterArmor);
    }

    /**
     * Update derived stats based on allocated stat points
     */
    public updateStats(): void {
        this.maxHp = calculateMaxHp(this.vitality);
        this.armor = calculateArmor(this.toughness);
        this.avoidChance = calculateAvoidChance(this.agility);

        if (this.getAttackRange() > 1) {
            this.damage = calculateTotalBowDamage(this.strength, this.agility);
        } else {
            this.damage = calculateTotalMeleeDamage(this.strength, this.agility);
        }
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
        const oldMaxHp = this.maxHp;
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
        const hpPercent = this.hp / this.maxHp;

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
        const isBowAttack = this.getAttackRange() > 1;
        const baseDamage = balanceConfig.player.baseDamage;

        if (isBowAttack) {
            const strengthBonus = Math.floor(this.strength / balanceConfig.stats.strengthToBowDamage);
            const agilityBonus = Math.floor(this.agility / balanceConfig.stats.agilityToBowDamage);
            const total = baseDamage + calculateBowDamageBonus(this.strength, this.agility);

            return `Bow: ${baseDamage} + ⌊STR/${balanceConfig.stats.strengthToBowDamage}⌋ (${strengthBonus}) + ⌊AGI/${balanceConfig.stats.agilityToBowDamage}⌋ (${agilityBonus}) = ${total}`;
        }

        const strengthBonus = Math.floor(this.strength / balanceConfig.stats.strengthToMeleeDamage);
        const agilityBonus = Math.floor(this.agility / balanceConfig.stats.agilityToMeleeDamage);
        const total = baseDamage + calculateMeleeDamageBonus(this.strength, this.agility);

        return `Melee: ${baseDamage} + ⌊STR/${balanceConfig.stats.strengthToMeleeDamage}⌋ (${strengthBonus}) + ⌊AGI/${balanceConfig.stats.agilityToMeleeDamage}⌋ (${agilityBonus}) = ${total}`;
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: any): void {
        this.renderer.draw(ctx, this);
    }
}
