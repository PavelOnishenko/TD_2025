import Entity from '../../../engine/core/Entity.js';
import { withDamageable } from '../../../engine/core/Damageable.js';
import {
    getXpForLevel,
    calculateMaxHp,
    calculateTotalDamage,
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
    public skillPoints: number = 0;

    // Equipment
    public equippedWeapon: Item | null = null;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = balanceConfig.player.width;
        this.height = balanceConfig.player.height;

        // Initialize stats
        this.vitality = 0;
        this.toughness = 0;
        this.strength = 0;
        this.skillPoints = 0;

        // Calculate initial stats
        this.updateStats();
        this.xpToNextLevel = getXpForLevel(2);

        // Initialize Damageable functionality with calculated maxHp
        this.initDamageable(this.maxHp);
    }

    /**
     * Override takeDamage to apply armor reduction before damage
     */
    public takeDamage(amount: number): boolean {
        // Apply armor reduction
        const damageAfterArmor = Math.max(0, amount - this.armor);
        // Call parent implementation with reduced damage
        return super.takeDamage(damageAfterArmor);
    }

    /**
     * Update derived stats based on allocated stat points
     */
    public updateStats(): void {
        this.maxHp = calculateMaxHp(this.vitality);
        this.damage = calculateTotalDamage(this.strength);
        this.armor = calculateArmor(this.toughness);
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
    public addStat(stat: 'vitality' | 'toughness' | 'strength', amount: number = 1): boolean {
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

        // Player body
        ctx.fillStyle = theme.entities.player.body;
        ctx.fillRect(
            screenX - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Player face
        ctx.fillStyle = theme.entities.player.face;
        const faceX = screenX - 6;
        const faceY = screenY - 8;
        ctx.fillRect(faceX, faceY, 4, 4); // eye
        ctx.fillRect(faceX + 8, faceY, 4, 4); // eye
        ctx.fillRect(faceX + 2, faceY + 8, 8, 2); // mouth

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
