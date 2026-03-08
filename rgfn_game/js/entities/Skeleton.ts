import Entity from '../../../engine/core/Entity.js';
import { withDamageable } from '../../../engine/core/Damageable.js';
import { balanceConfig } from '../config/balanceConfig.js';
import { theme } from '../config/ThemeConfig.js';

export interface EnemyBehavior {
    avoidHitChance?: number;
    doubleDamageChance?: number;
    passEncounterChance?: number;
}

export interface EnemyConfig {
    hp: number;
    damage: number;
    xpValue: number;
    name: string;
    width: number;
    height: number;
    behavior?: EnemyBehavior;
}

// Extend Entity with Damageable functionality
const DamageableEntity = withDamageable(Entity);

export default class Skeleton extends DamageableEntity {
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

    // Skeleton-specific properties
    public damage: number;
    public name: string;
    public xpValue: number;
    public behavior: EnemyBehavior;
    public gridCol?: number;
    public gridRow?: number;

    constructor(x: number, y: number, enemyConfig?: EnemyConfig) {
        super(x, y);
        const config: EnemyConfig = enemyConfig ?? balanceConfig.enemies.skeleton;

        this.width = config.width;
        this.height = config.height;
        this.damage = config.damage;
        this.name = config.name;
        this.xpValue = config.xpValue;
        this.behavior = config.behavior ?? {};

        // Initialize Damageable functionality
        this.initDamageable(config.hp);
    }

    // Override takeDamage to deactivate when dead
    public takeDamage(amount: number): boolean {
        const died = super.takeDamage(amount);
        if (died) {
            this.active = false;
        }
        return died;
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: any): void {
        const screenX = this.x;
        const screenY = this.y;

        // Skeleton body
        ctx.fillStyle = theme.entities.skeleton.body;
        ctx.fillRect(
            screenX - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Skull features
        ctx.fillStyle = theme.entities.skeleton.features;
        // Eye sockets
        ctx.fillRect(screenX - 8, screenY - 8, 5, 5);
        ctx.fillRect(screenX + 3, screenY - 8, 5, 5);
        // Nose hole
        ctx.fillRect(screenX - 2, screenY - 1, 4, 3);

        // Teeth
        ctx.fillStyle = theme.entities.skeleton.body;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(screenX - 8 + i * 4, screenY + 5, 3, 4);
        }

        // Health bar
        this.drawHealthBar(ctx, screenX, screenY);
    }

    public shouldAvoidHit(): boolean {
        const chance = this.behavior.avoidHitChance ?? 0;
        return chance > 0 && Math.random() < chance;
    }

    public getAttackDamage(): number {
        const chance = this.behavior.doubleDamageChance ?? 0;
        if (chance > 0 && Math.random() < chance) {
            return this.damage * 2;
        }

        return this.damage;
    }

    public shouldPassEncounter(): boolean {
        const chance = this.behavior.passEncounterChance ?? 0;
        return chance > 0 && Math.random() < chance;
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth = this.width;
        const barHeight = 3;
        const barY = screenY - this.height / 2 - 6;

        // Background
        ctx.fillStyle = theme.entities.skeleton.healthBg;
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        // Health
        const healthPercent = this.hp / this.maxHp;
        const healthBarWidth = barWidth * healthPercent;
        ctx.fillStyle = theme.entities.skeleton.healthBar;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
