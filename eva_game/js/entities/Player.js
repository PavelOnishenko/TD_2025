import Entity from '../../../engine/core/Entity.js';

const PLAYER_SPEED = 200;
const ATTACK_DURATION = 300;
const ATTACK_COOLDOWN = 200;
const INVULNERABILITY_DURATION = 1000;
const ATTACK_RANGE = 50;

export default class Player extends Entity {
    constructor(x, y) {
        super(x, y);
        this.width = 40;
        this.height = 60;
        this.health = 100;
        this.maxHealth = 100;
        this.attackDamage = 25;
        this.isAttacking = false;
        this.invulnerable = false;
        this.attackTimer = 0;
        this.attackCooldownTimer = 0;
        this.invulnerabilityTimer = 0;
        this.animationState = 'idle';
        this.facingRight = true;
    }

    handleInput(horizontalInput, verticalInput, input) {
        this.updateMovement(horizontalInput, verticalInput);
        this.updateAttack(input);
    }

    updateMovement(horizontalInput, verticalInput) {
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

    updateAttack(input) {
        if (this.attackCooldownTimer > 0) {
            return;
        }

        if (input.wasActionPressed('attack') && !this.isAttacking) {
            this.startAttack();
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.attackTimer = ATTACK_DURATION;
        this.attackCooldownTimer = ATTACK_COOLDOWN;
        this.animationState = 'punch';
    }

    update(deltaTime) {
        this.move(deltaTime);
        this.updateAttackTimer(deltaTime);
        this.updateInvulnerability(deltaTime);
    }

    updateAttackTimer(deltaTime) {
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

    updateInvulnerability(deltaTime) {
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime * 1000;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
            }
        }
    }

    takeDamage(amount) {
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

    checkAttackHit(enemy) {
        if (!this.isAttacking) {
            return false;
        }

        return this.isEnemyInAttackRange(enemy);
    }

    isEnemyInAttackRange(enemy) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const isFacingEnemy = this.isFacingTowards(dx);
        return distance <= ATTACK_RANGE && isFacingEnemy;
    }

    isFacingTowards(dx) {
        return (this.facingRight && dx > 0) || (!this.facingRight && dx < 0);
    }

    draw(ctx, viewport) {
        const screenX = this.x;
        const screenY = this.y;

        this.drawPlayerBody(ctx, screenX, screenY);
        this.drawHealthBar(ctx, screenX, screenY);

        if (this.isAttacking) {
            this.drawAttackIndicator(ctx, screenX, screenY);
        }
    }

    drawPlayerBody(ctx, screenX, screenY) {
        const isFlashing = this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0;
        ctx.fillStyle = isFlashing ? 'rgba(100, 200, 255, 0.5)' : '#64c8ff';
        ctx.fillRect(screenX - this.width / 2, screenY - this.height / 2, this.width, this.height);

        this.drawPlayerFace(ctx, screenX, screenY);
    }

    drawPlayerFace(ctx, screenX, screenY) {
        ctx.fillStyle = '#ffffff';
        const faceOffset = this.facingRight ? 8 : -8;
        ctx.fillRect(screenX + faceOffset - 3, screenY - 15, 6, 6);
        ctx.fillRect(screenX + faceOffset - 3, screenY - 5, 6, 3);
    }

    drawHealthBar(ctx, screenX, screenY) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = screenY - this.height / 2 - 10;

        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        const healthPercent = this.health / this.maxHealth;
        const healthBarWidth = barWidth * healthPercent;
        const color = healthPercent > 0.6 ? '#4ade80' : healthPercent > 0.3 ? '#fbbf24' : '#ef4444';
        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }

    drawAttackIndicator(ctx, screenX, screenY) {
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const attackX = this.facingRight ? screenX + ATTACK_RANGE : screenX - ATTACK_RANGE;
        ctx.arc(attackX, screenY, 15, 0, Math.PI * 2);
        ctx.stroke();
    }
}
