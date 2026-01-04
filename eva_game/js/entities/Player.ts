import Entity from '../../../engine/core/Entity.js';
import InputManager from '../../../engine/systems/InputManager.js';
import { Viewport } from '../types/engine';
import { AnimationState } from '../types/game';

const PLAYER_SPEED: number = 200;
const ATTACK_DURATION: number = 300;
const ATTACK_COOLDOWN: number = 200;
const INVULNERABILITY_DURATION: number = 1000;
const ATTACK_RANGE: number = 50;

export default class Player extends Entity {
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

    // Player-specific properties
    public health: number = 100;
    public maxHealth: number = 100;
    public attackDamage: number = 25;
    public isAttacking: boolean = false;
    public invulnerable: boolean = false;
    public facingRight: boolean = true;
    public animationState: AnimationState = 'idle';

    private attackTimer: number = 0;
    private attackCooldownTimer: number = 0;
    private invulnerabilityTimer: number = 0;

    constructor(x: number, y: number) {
        super(x, y);
        this.width = 40;
        this.height = 60;
    }

    public handleInput(horizontalInput: number, verticalInput: number, input: InputManager): void {
        this.updateMovement(horizontalInput, verticalInput);
        this.updateAttack(input);
    }

    private updateMovement(horizontalInput: number, verticalInput: number): void {
        if (this.isAttacking) {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }

        this.velocityX = horizontalInput * PLAYER_SPEED;
        this.velocityY = verticalInput * PLAYER_SPEED;

        if (horizontalInput > 0) {
            this.facingRight = true;
        } else if (horizontalInput < 0) {
            this.facingRight = false;
        }

        this.animationState = (this.velocityX !== 0 || this.velocityY !== 0) ? 'walk' : 'idle';
    }

    private updateAttack(input: InputManager): void {
        if (this.attackCooldownTimer > 0) {
            return;
        }

        if (input.wasActionPressed('attack') && !this.isAttacking) {
            this.startAttack();
        }
    }

    private startAttack(): void {
        console.log('Player attack initiated');
        this.isAttacking = true;
        this.attackTimer = ATTACK_DURATION;
        this.attackCooldownTimer = ATTACK_COOLDOWN;
        this.animationState = 'punch';
    }

    public update(deltaTime: number): void {
        this.move(deltaTime);
        this.updateAttackTimer(deltaTime);
        this.updateInvulnerability(deltaTime);
    }

    private updateAttackTimer(deltaTime: number): void {
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime * 1000;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.animationState = 'idle';
            }
        }

        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= deltaTime * 1000;
        }
    }

    private updateInvulnerability(deltaTime: number): void {
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime * 1000;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
    }

    public takeDamage(amount: number): void {
        if (this.invulnerable) {
            return;
        }

        this.health -= amount;
        if (this.health < 0) {
            this.health = 0;
        }

        this.invulnerable = true;
        this.invulnerabilityTimer = INVULNERABILITY_DURATION;
    }

    public checkAttackHit(enemy: Entity): boolean {
        if (!this.isAttacking) {
            return false;
        }

        return this.isEnemyInAttackRange(enemy);
    }

    private isEnemyInAttackRange(enemy: Entity): boolean {
        const dx: number = enemy.x - this.x;
        const dy: number = enemy.y - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        const isFacingEnemy: boolean = this.isFacingTowards(dx);

        return distance <= ATTACK_RANGE && isFacingEnemy;
    }

    private isFacingTowards(dx: number): boolean {
        return (this.facingRight && dx > 0) || (!this.facingRight && dx < 0);
    }

    public draw(ctx: CanvasRenderingContext2D, viewport?: Viewport): void {
        const screenX: number = this.x;
        const screenY: number = this.y;

        this.drawPlayerBody(ctx, screenX, screenY);
        this.drawHealthBar(ctx, screenX, screenY);

        if (this.isAttacking) {
            this.drawAttackIndicator(ctx, screenX, screenY);
        }
    }

    private drawPlayerBody(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const isFlashing: boolean = this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0;
        ctx.fillStyle = isFlashing ? 'rgba(100, 200, 255, 0.5)' : '#64c8ff';
        ctx.fillRect(screenX - this.width / 2, screenY - this.height / 2, this.width, this.height);

        this.drawPlayerFace(ctx, screenX, screenY);
    }

    private drawPlayerFace(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        ctx.fillStyle = '#ffffff';
        const faceOffset: number = this.facingRight ? 8 : -8;
        ctx.fillRect(screenX + faceOffset - 3, screenY - 15, 6, 6);
        ctx.fillRect(screenX + faceOffset - 3, screenY - 5, 6, 3);
    }

    private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const barWidth: number = this.width;
        const barHeight: number = 4;
        const barY: number = screenY - this.height / 2 - 10;

        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        const healthPercent: number = this.health / this.maxHealth;
        const healthBarWidth: number = barWidth * healthPercent;
        const color: string = healthPercent > 0.6 ? '#4ade80' : healthPercent > 0.3 ? '#fbbf24' : '#ef4444';

        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }

    private drawAttackIndicator(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const attackX: number = this.facingRight ? screenX + ATTACK_RANGE : screenX - ATTACK_RANGE;
        ctx.arc(attackX, screenY, 15, 0, Math.PI * 2);
        ctx.stroke();
    }
}
