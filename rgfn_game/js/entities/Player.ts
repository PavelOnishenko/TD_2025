import Entity from '../../../engine/core/Entity.js';
import { withDamageable } from '../../../engine/core/Damageable.js';
import {
    getXpForLevel,
    calculateMaxHp,
    calculateTotalMeleeDamage,
    calculateTotalBowDamage,
    calculateAvoidChance,
    calculateArmor,
    levelConfig
} from '../config/levelConfig.js';
import { balanceConfig } from '../config/balanceConfig.js';
import { theme } from '../config/ThemeConfig.js';
import Item from './Item.js';

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

    // Equipment
    public equippedWeapon: Item | null = null;

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
     * Equip an item (automatically equipped when obtained)
     */
    public equipItem(item: Item): void {
        if (item.type === 'weapon') {
            this.equippedWeapon = item;
            this.updateStats();
        }
    }

    /**
     * Get the player's current attack range
     * @returns number of cells the player can attack from
     */
    public getAttackRange(): number {
        if (this.equippedWeapon) {
            return this.equippedWeapon.attackRange;
        }
        return 1; // Default melee range
    }

    /**
     * Check if the player has a specific item equipped
     */
    public hasWeapon(): boolean {
        return this.equippedWeapon !== null;
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: any): void {
        const screenX = this.x;
        const screenY = this.y;
        const left = screenX - this.width / 2;
        const top = screenY - this.height / 2;

        // Cloak/body silhouette
        ctx.fillStyle = theme.entities.player.body;
        ctx.beginPath();
        ctx.moveTo(screenX, top + 2);
        ctx.lineTo(left + 4, top + this.height - 2);
        ctx.lineTo(left + this.width - 4, top + this.height - 2);
        ctx.closePath();
        ctx.fill();

        // Tunic highlight
        ctx.fillStyle = theme.entities.player.face;
        ctx.fillRect(screenX - 4, top + 10, 8, 10);

        // Head
        ctx.fillStyle = theme.entities.player.face;
        ctx.beginPath();
        ctx.arc(screenX, top + 8, 6, 0, Math.PI * 2);
        ctx.fill();

        // Hair/hood outline
        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.beginPath();
        ctx.arc(screenX, top + 8, 7, Math.PI, Math.PI * 2);
        ctx.fill();

        // Face features
        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.fillRect(screenX - 3, top + 7, 2, 2);
        ctx.fillRect(screenX + 1, top + 7, 2, 2);
        ctx.fillRect(screenX - 2, top + 11, 4, 1);

        // Shoulder armor
        ctx.fillStyle = theme.ui.secondaryAccent;
        ctx.fillRect(left + 2, top + 12, 5, 4);
        ctx.fillRect(left + this.width - 7, top + 12, 5, 4);

        // Health bar
        this.drawHealthBar(ctx, screenX, screenY);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = screenY - this.height / 2 - 8;

        // Background
        ctx.fillStyle = theme.entities.player.healthBg;
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        // Health
        const healthPercent = this.hp / this.maxHp;
        const healthBarWidth = barWidth * healthPercent;
        const color = healthPercent > 0.6 ? theme.entities.player.healthHigh :
                      healthPercent > 0.3 ? theme.entities.player.healthMid :
                      theme.entities.player.healthLow;
        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
