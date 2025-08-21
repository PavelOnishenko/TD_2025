export default class Enemy {
    constructor(maxHp = 3, color = 'red', y = 365) {
        this.x = 0;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.speed = 100;
        this.maxHp = maxHp;
        this.hp = this.maxHp;
        this.color = color;
    }

    update(dt) {
        this.x += this.speed * dt;
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

    isOutOfBounds(width) {
        return this.x + this.w >= width;
    }
}

export class TankEnemy extends Enemy {
    constructor(maxHp = 15) {
        super(maxHp);
        this.speed = 40;
    }
}
