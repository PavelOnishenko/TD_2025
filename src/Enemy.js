export default class Enemy {
    constructor(maxHp = 3, color = 'red', x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.speed = 100;
        this.maxHp = maxHp;
        this.hp = this.maxHp;
        this.color = color;
    }

    update(dt) {
        this.y -= this.speed * dt;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);

        const barWidth = this.w;
        const barHeight = 4;
        const barX = this.x;
        const barY = this.y - barHeight - 2;

        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    isOutOfBounds() {
        return this.y + this.h <= 0;
    }
}

export class TankEnemy extends Enemy {
    constructor(maxHp = 15, color = 'red', x = 0, y = 0) {
        super(maxHp, color, x, y);
        this.speed = 40;
    }
}

export class SwarmEnemy extends Enemy {
    constructor(maxHp = 1, color = 'red', x = 0, y = 0) {
        super(maxHp, color, x, y);
        this.speed = 160;
    }
}
