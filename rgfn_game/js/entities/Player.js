import Entity from '../../../engine/core/Entity.js';

export default class Player extends Entity {
    constructor(x, y) {
        super(x, y);
        this.width = 32;
        this.height = 32;
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 10;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) {
            this.hp = 0;
        }
    }

    heal(amount) {
        this.hp += amount;
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
    }

    isDead() {
        return this.hp <= 0;
    }

    draw(ctx, viewport) {
        const screenX = this.x;
        const screenY = this.y;

        // Player body (blue)
        ctx.fillStyle = '#00ccff';
        ctx.fillRect(
            screenX - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Player face
        ctx.fillStyle = '#ffffff';
        const faceX = screenX - 6;
        const faceY = screenY - 8;
        ctx.fillRect(faceX, faceY, 4, 4); // eye
        ctx.fillRect(faceX + 8, faceY, 4, 4); // eye
        ctx.fillRect(faceX + 2, faceY + 8, 8, 2); // mouth

        // Health bar
        this.drawHealthBar(ctx, screenX, screenY);
    }

    drawHealthBar(ctx, screenX, screenY) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = screenY - this.height / 2 - 8;

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        // Health
        const healthPercent = this.hp / this.maxHp;
        const healthBarWidth = barWidth * healthPercent;
        const color = healthPercent > 0.6 ? '#4ade80' : healthPercent > 0.3 ? '#fbbf24' : '#ef4444';
        ctx.fillStyle = color;
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
