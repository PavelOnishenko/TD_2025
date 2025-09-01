export default class Enemy {
    constructor(maxHp, color, x, y, speedX, speedY) {
        this.x = x;
        this.y = y;
        this.w = 30;
        this.h = 30;
        this.speedX = speedX;
        this.speedY = speedY;
        this.maxHp = maxHp;
        this.hp = this.maxHp;
        this.color = color;
    }

    update(dt) {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
    }

    draw(ctx, assets) {
        const propertyName = `swarm_${this.color.charAt(0)}`;
        const sprite = assets[propertyName];
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);

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

    isOutOfBounds(canvasHeight) {
        return this.y >= canvasHeight;
    }
}

export class TankEnemy extends Enemy {
    constructor(maxHp = 15, color = 'red', x = 0, y = 0) {
        super(maxHp, color, x, y, 50, 34);
    }
}

export class SwarmEnemy extends Enemy {
    constructor(maxHp = 1, color = 'red', x = 0, y = 0) {
        super(maxHp, color, x, y, 100, 76);
    }
}