import Entity from '../../../engine/core/Entity.js';

export default class Skeleton extends Entity {
    constructor(x, y) {
        super(x, y);
        this.width = 30;
        this.height = 30;
        this.hp = 30;
        this.maxHp = 30;
        this.damage = 8;
        this.name = 'Skeleton';
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) {
            this.hp = 0;
        }
        if (this.hp === 0) {
            this.active = false;
        }
    }

    isDead() {
        return this.hp <= 0;
    }

    draw(ctx, viewport) {
        const screenX = this.x;
        const screenY = this.y;

        // Skeleton body (bone white with red tint)
        ctx.fillStyle = '#e6d5c3';
        ctx.fillRect(
            screenX - this.width / 2,
            screenY - this.height / 2,
            this.width,
            this.height
        );

        // Skull features
        ctx.fillStyle = '#000';
        // Eye sockets
        ctx.fillRect(screenX - 8, screenY - 8, 5, 5);
        ctx.fillRect(screenX + 3, screenY - 8, 5, 5);
        // Nose hole
        ctx.fillRect(screenX - 2, screenY - 1, 4, 3);

        // Teeth
        ctx.fillStyle = '#e6d5c3';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(screenX - 8 + i * 4, screenY + 5, 3, 4);
        }

        // Health bar
        this.drawHealthBar(ctx, screenX, screenY);
    }

    drawHealthBar(ctx, screenX, screenY) {
        const barWidth = this.width;
        const barHeight = 3;
        const barY = screenY - this.height / 2 - 6;

        // Background
        ctx.fillStyle = '#222';
        ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

        // Health
        const healthPercent = this.hp / this.maxHp;
        const healthBarWidth = barWidth * healthPercent;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(screenX - barWidth / 2, barY, healthBarWidth, barHeight);
    }
}
