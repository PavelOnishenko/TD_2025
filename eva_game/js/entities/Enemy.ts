import Entity from '../../../engine/core/Entity.js';
import { Viewport } from '../types/engine';
import { AnimationState } from '../types/game';
import Player from './Player';

const ENEMY_SPEED: number = 80;
const ENEMY_ATTACK_RANGE: number = 40;
const ENEMY_ATTACK_COOLDOWN: number = 1500;
const ENEMY_DAMAGE: number = 10;

export default class Enemy extends Entity {
    // Explicitly declare inherited properties from Entity
    declare x: number;
    declare y: number;
    declare velocityX: number;
    declare velocityY: number;
    declare active: boolean;
    declare id: number;
    declare width: number;
    declare height: number;

    // Explicitly declare inherited methods from Entity
    declare move: (deltaTime: number) => void;
    declare getBounds: () => { left: number; right: number; top: number; bottom: number };
    declare checkCollision: (other: any) => boolean;

    // Enemy-specific properties
    public health: number = 50;
    public maxHealth: number = 50;
    public facingRight: boolean = true;
    public animationState: AnimationState = 'idle';

    private attackCooldownTimer: number = 0;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 35;
        this.height = 55;
    }

    public update(deltaTime: number): void {
        this.move(deltaTime);
        this.updateAttackCooldown(deltaTime);
        this.updateAnimationState();
    }

    private updateAttackCooldown(deltaTime: number): void {
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= deltaTime * 1000;
        }
    }

    private updateAnimationState(): void {
        this.animationState = (this.velocityX !== 0 || this.velocityY !== 0) ? 'walk' : 'idle';
    }

    public moveToward(targetX: number, targetY: number, deltaTime: number): void {
        const dx: number = targetX - this.x;
        const dy: number = targetY - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        if (distance < ENEMY_ATTACK_RANGE) {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }

        this.updateFacingDirection(dx);
        this.setVelocityTowardTarget(dx, dy, distance);
    }

    private updateFacingDirection(dx: number): void {
        this.facingRight = dx > 0;
    }

    private setVelocityTowardTarget(dx: number, dy: number, distance: number): void {
        const dirX: number = dx / distance;
        const dirY: number = dy / distance;
        this.velocityX = dirX * ENEMY_SPEED;
        this.velocityY = dirY * ENEMY_SPEED;
    }

    public canAttackPlayer(player: Player): boolean {
        if (this.attackCooldownTimer > 0) {
            return false;
        }

        const dx: number = player.x - this.x;
        const dy: number = player.y - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        return distance <= ENEMY_ATTACK_RANGE;
    }

    public attackPlayer(player: Player): void {
        if (!this.canAttackPlayer(player)) {
            return;
        }

        player.takeDamage(ENEMY_DAMAGE);
        this.attackCooldownTimer = ENEMY_ATTACK_COOLDOWN;
    }

    public takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.active = false;
        }
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: Viewport): void {
        const screenX: number = this.x;
        const screenY: number = this.y;

        this.drawEnemyBody(ctx, screenX, screenY);
        this.drawHealthBar(ctx, screenX, screenY);
    }

    private drawEnemyBody(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(screenX - this.width / 2, screenY - this.height / 2, this.width, this.height);

        this.drawEnemyFace(ctx, screenX, screenY);
    }

    private drawEnemyFace(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        ctx.fillStyle = '#ffffff';
        const faceOffset: number = this.facingRight ? 6 : -6;
        ctx.fillRect(screenX + faceOffset - 2, screenY - 12, 4, 4);
        ctx.fillRect(screenX + faceOffset - 2, screenY - 4, 4, 2);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth: number = this.width;
        const barHeight: number = 3;
        const barY: number = screenY - this.height / 2 - 8;

        ctx.fillStyle = '#222';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        const healthPercent: number = this.health / this.maxHealth;
        const healthBarWidth: number = barWidth * healthPercent;
        const color: string = healthPercent > 0.5 ? '#ff4444' : '#ff8888';

        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
