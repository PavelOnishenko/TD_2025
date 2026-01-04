import Entity from '../../../engine/core/Entity.js';
const ENEMY_SPEED = 80;
const ENEMY_ATTACK_RANGE = 40;
const ENEMY_ATTACK_COOLDOWN = 1500;
const ENEMY_DAMAGE = 10;
export default class Enemy extends Entity {
    constructor(x, y) {
        super(x, y);
        // Enemy-specific properties
        this.health = 50;
        this.maxHealth = 50;
        this.facingRight = true;
        this.animationState = 'idle';
        this.attackCooldownTimer = 0;
        this.width = 35;
        this.height = 55;
    }
    update(deltaTime) {
        this.move(deltaTime);
        this.updateAttackCooldown(deltaTime);
        this.updateAnimationState();
    }
    updateAttackCooldown(deltaTime) {
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= deltaTime * 1000;
        }
    }
    updateAnimationState() {
        this.animationState = (this.velocityX !== 0 || this.velocityY !== 0) ? 'walk' : 'idle';
    }
    moveToward(targetX, targetY, deltaTime) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < ENEMY_ATTACK_RANGE) {
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }
        this.updateFacingDirection(dx);
        this.setVelocityTowardTarget(dx, dy, distance);
    }
    updateFacingDirection(dx) {
        this.facingRight = dx > 0;
    }
    setVelocityTowardTarget(dx, dy, distance) {
        const dirX = dx / distance;
        const dirY = dy / distance;
        this.velocityX = dirX * ENEMY_SPEED;
        this.velocityY = dirY * ENEMY_SPEED;
    }
    canAttackPlayer(player) {
        if (this.attackCooldownTimer > 0) {
            return false;
        }
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= ENEMY_ATTACK_RANGE;
    }
    attackPlayer(player) {
        if (!this.canAttackPlayer(player)) {
            return;
        }
        player.takeDamage(ENEMY_DAMAGE);
        this.attackCooldownTimer = ENEMY_ATTACK_COOLDOWN;
    }
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.active = false;
        }
    }
    draw(ctx, viewport) {
        const screenX = this.x;
        const screenY = this.y;
        this.drawEnemyBody(ctx, screenX, screenY);
        this.drawHealthBar(ctx, screenX, screenY);
    }
    drawEnemyBody(ctx, screenX, screenY) {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(screenX - this.width / 2, screenY - this.height / 2, this.width, this.height);
        this.drawEnemyFace(ctx, screenX, screenY);
    }
    drawEnemyFace(ctx, screenX, screenY) {
        ctx.fillStyle = '#ffffff';
        const faceOffset = this.facingRight ? 6 : -6;
        ctx.fillRect(screenX + faceOffset - 2, screenY - 12, 4, 4);
        ctx.fillRect(screenX + faceOffset - 2, screenY - 4, 4, 2);
    }
    drawHealthBar(ctx, screenX, screenY) {
        const barWidth = this.width;
        const barHeight = 3;
        const barY = screenY - this.height / 2 - 8;
        ctx.fillStyle = '#222';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);
        const healthPercent = this.health / this.maxHealth;
        const healthBarWidth = barWidth * healthPercent;
        const color = healthPercent > 0.5 ? '#ff4444' : '#ff8888';
        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
//# sourceMappingURL=Enemy.js.map