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
    public xpValue: number;
    public behavior: EnemyBehavior;
    public gridCol?: number;
    public gridRow?: number;
    private cursedArmorReduction: number = 0;
    private curseTurns: number = 0;
    private slowTurns: number = 0;

    constructor(x: number, y: number, enemyConfig?: EnemyConfig) {
        super(x, y);
        const config: EnemyConfig = enemyConfig ?? balanceConfig.enemies.skeleton;

        this.width = config.width;
        this.height = config.height;
        this.damage = config.damage;
        this.name = config.name;
        this.xpValue = config.xpValue;
        this.behavior = config.behavior ?? {};
        this.initDamageable(config.hp);
    }

    public takeDamage(amount: number): boolean {
        const effectiveArmor = Math.max(0, this.cursedArmorReduction);
        const damageAfterArmor = amount <= 0
            ? 0
            : Math.max(balanceConfig.combat.minDamageAfterArmor, amount - effectiveArmor);
        const died = super.takeDamage(damageAfterArmor);
        if (died) {
            this.active = false;
        }
        return died;
    }

    public takeMagicDamage(amount: number): boolean {
        const died = super.takeDamage(Math.max(0, amount));
        if (died) {
            this.active = false;
        }
        return died;
    }

    public applyCurse(armorReduction: number, duration: number): void {
        this.cursedArmorReduction = Math.max(this.cursedArmorReduction, armorReduction);
        this.curseTurns = Math.max(this.curseTurns, duration);
    }

    public applySlow(duration: number): void {
        this.slowTurns = Math.max(this.slowTurns, duration);
    }

    public shouldSkipTurnFromSlow(): boolean {
        return this.slowTurns > 0;
    }

    public consumeTurnEffects(): string[] {
        const events: string[] = [];

        if (this.slowTurns > 0) {
            this.slowTurns -= 1;
            events.push(`${this.name} is slowed and skips this turn.`);
        }

        if (this.curseTurns > 0) {
            this.curseTurns -= 1;
            if (this.curseTurns === 0) {
                this.cursedArmorReduction = 0;
                events.push(`${this.name} shakes off the curse.`);
            }
        }

        return events;
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: any): void {
        const x = this.x;
        const y = this.y;
        const left = x - this.width / 2;
        const top = y - this.height / 2;

        switch (this.name) {
            case 'Zombie':
                this.drawZombie(ctx, left, top);
                break;
            case 'Ninja':
                this.drawNinja(ctx, left, top);
                break;
            case 'Dark Knight':
                this.drawDarkKnight(ctx, left, top);
                break;
            case 'Dragon':
                this.drawDragon(ctx, left, top);
                break;
            default:
                this.drawSkeleton(ctx, left, top);
                break;
        }

        this.drawHealthBar(ctx, x, y);
    }

    private drawSkeleton(ctx: CanvasRenderingContext2D, left: number, top: number): void {
        ctx.fillStyle = theme.entities.skeleton.body;
        ctx.beginPath();
        ctx.ellipse(left + this.width / 2, top + this.height / 2, this.width * 0.34, this.height * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = theme.entities.skeleton.features;
        ctx.fillRect(left + 8, top + 7, 4, 4);
        ctx.fillRect(left + this.width - 12, top + 7, 4, 4);
        ctx.fillRect(left + this.width / 2 - 2, top + 13, 4, 3);
    }

    private drawZombie(ctx: CanvasRenderingContext2D, left: number, top: number): void {
        ctx.fillStyle = theme.worldMap.terrain.forest;
        ctx.fillRect(left + 5, top + 4, this.width - 10, this.height - 7);
        ctx.fillStyle = theme.entities.player.face;
        ctx.fillRect(left + 8, top + 7, this.width - 16, 9);
        ctx.fillStyle = theme.ui.enemyColor;
        ctx.fillRect(left + 10, top + 10, 3, 2);
        ctx.fillRect(left + this.width - 13, top + 10, 3, 2);
    }

    private drawNinja(ctx: CanvasRenderingContext2D, left: number, top: number): void {
        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.fillRect(left + 5, top + 5, this.width - 10, this.height - 8);
        ctx.fillStyle = theme.entities.player.face;
        ctx.fillRect(left + 8, top + 10, this.width - 16, 5);
        ctx.fillStyle = theme.ui.enemyColor;
        ctx.fillRect(left + 9, top + 11, 2, 2);
        ctx.fillRect(left + this.width - 11, top + 11, 2, 2);
    }

    private drawDarkKnight(ctx: CanvasRenderingContext2D, left: number, top: number): void {
        ctx.fillStyle = theme.ui.textMuted;
        ctx.fillRect(left + 4, top + 4, this.width - 8, this.height - 4);
        ctx.fillStyle = theme.ui.secondaryAccent;
        ctx.fillRect(left + this.width / 2 - 1, top + 6, 2, this.height - 8);
        ctx.fillStyle = theme.ui.enemyColor;
        ctx.fillRect(left + this.width / 2 - 3, top + 9, 6, 4);
    }

    private drawDragon(ctx: CanvasRenderingContext2D, left: number, top: number): void {
        ctx.fillStyle = theme.ui.enemyColor;
        ctx.beginPath();
        ctx.moveTo(left + 4, top + this.height - 6);
        ctx.lineTo(left + this.width / 2, top + 4);
        ctx.lineTo(left + this.width - 4, top + this.height - 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = theme.ui.warningColor;
        ctx.fillRect(left + this.width / 2 - 2, top + 10, 4, 4);
        ctx.fillStyle = theme.ui.primaryAccent;
        ctx.fillRect(left + this.width / 2 - 5, top + this.height - 9, 10, 3);
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

        ctx.fillStyle = theme.entities.skeleton.healthBg;
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        const healthPercent = this.hp / this.maxHp;
        const healthBarWidth = barWidth * healthPercent;
        ctx.fillStyle = theme.entities.skeleton.healthBar;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
