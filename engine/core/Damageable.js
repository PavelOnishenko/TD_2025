/**
 * Damageable Component
 * Provides HP/damage functionality for entities
 * Can be used as a mixin or base class for entities that can take damage
 */
export default class Damageable {
    /**
     * Initialize damageable properties
     * @param {number} maxHp - Maximum hit points
     */
    constructor(maxHp) {
        this.maxHp = maxHp;
        this.hp = maxHp;
    }

    /**
     * Apply damage to this entity
     * @param {number} amount - Amount of damage to apply
     * @returns {boolean} - True if entity died from this damage
     */
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) {
            this.hp = 0;
        }
        return this.isDead();
    }

    /**
     * Heal this entity
     * @param {number} amount - Amount of HP to restore
     */
    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
    }

    /**
     * Check if entity is dead (HP <= 0)
     * @returns {boolean}
     */
    isDead() {
        return this.hp <= 0;
    }

    /**
     * Get current HP percentage (0-1)
     * @returns {number}
     */
    getHealthPercent() {
        return this.hp / this.maxHp;
    }

    /**
     * Set HP to maximum
     */
    healToFull() {
        this.hp = this.maxHp;
    }
}

/**
 * Mixin function to add Damageable functionality to an existing class
 * @param {class} BaseClass - The base class to extend
 * @returns {class} - Extended class with Damageable functionality
 *
 * Usage:
 *   class MyEntity extends withDamageable(Entity) {
 *     constructor(x, y, maxHp) {
 *       super(x, y);
 *       this.initDamageable(maxHp);
 *     }
 *   }
 */
export function withDamageable(BaseClass) {
    return class extends BaseClass {
        /**
         * Initialize damageable properties
         * Call this in your constructor
         * @param {number} maxHp - Maximum hit points
         */
        initDamageable(maxHp) {
            this.maxHp = maxHp;
            this.hp = maxHp;
        }

        /**
         * Apply damage to this entity
         * @param {number} amount - Amount of damage to apply
         * @returns {boolean} - True if entity died from this damage
         */
        takeDamage(amount) {
            this.hp -= amount;
            if (this.hp < 0) {
                this.hp = 0;
            }
            return this.isDead();
        }

        /**
         * Heal this entity
         * @param {number} amount - Amount of HP to restore
         */
        heal(amount) {
            this.hp += amount;
            if (this.hp > this.maxHp) {
                this.hp = this.maxHp;
            }
        }

        /**
         * Check if entity is dead (HP <= 0)
         * @returns {boolean}
         */
        isDead() {
            return this.hp <= 0;
        }

        /**
         * Get current HP percentage (0-1)
         * @returns {number}
         */
        getHealthPercent() {
            return this.hp / this.maxHp;
        }

        /**
         * Set HP to maximum
         */
        healToFull() {
            this.hp = this.maxHp;
        }
    };
}
