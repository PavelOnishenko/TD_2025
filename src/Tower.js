export default class Tower {
    constructor(x, y, color = 'red', level = 1) {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 40;
        this.baseRange = 120;
        this.baseDamage = 1;
        this.lastShot = 0;
        this.color = color;
        this.level = level;
        this.updateStats();
    }

    updateStats() {
        const rangeMultiplier = 1 + 0.2 * (this.level - 1);
        const damageMultiplier = 1 + 0.8 * (this.level - 1);
        this.range = this.baseRange * rangeMultiplier;
        this.damage = this.baseDamage * damageMultiplier;
    }

    center() {
        return {
            x: this.x + this.w / 2,
            y: this.y + this.h / 2
        };
    }

    draw(ctx) {
        const c = this.center();
        ctx.beginPath();
        ctx.arc(c.x, c.y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = this.color === 'red'
            ? 'rgba(255,0,0,0.3)'
            : 'rgba(0,0,255,0.3)';
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);

        if (this.level > 1) {
            ctx.strokeStyle = 'yellow';
            ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
        }

        ctx.fillStyle = 'black';
        ctx.font = '10px sans-serif';
        ctx.fillText(String(this.level), this.x + this.w + 2, this.y + 10);
    }
}
