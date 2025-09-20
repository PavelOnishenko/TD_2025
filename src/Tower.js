export default class Tower {
    constructor(x, y, color = 'red', level = 1) {
        this.x = x;
        this.y = y;
        this.w = 60;
        this.h = 90;
        this.baseRange = 120;
        this.baseDamage = 1;
        this.lastShot = 0;
        this.color = color;
        this.level = level;
        this.cell = null;
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

    draw(ctx, assets) {
        const c = this.center();
        this.drawRange(ctx, c);
        ctx.fillStyle = this.color;
        this.drawBody(ctx, c, assets);

        if (this.level > 1) {
            this.highlight(ctx);
        }

        this.drawLevelIndicator(ctx);
    }

    drawRange(ctx, c) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = this.color === 'red'
            ? 'rgba(255,0,0,0.3)'
            : 'rgba(0,0,255,0.3)';
        ctx.stroke();
    }

    drawBody(ctx, c, assets) {
        const propertyName = `tower_${this.level}${this.color.charAt(0)}`;
        const sprite = assets?.[propertyName];
        if (sprite) {
            ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
            return;
        }

        this.drawFallbackBody(ctx, c);
    }

    drawFallbackBody(ctx, c) {
        ctx.beginPath();
        if (this.level <= 1) {
            ctx.moveTo(c.x, this.y);
            ctx.lineTo(this.x, this.y + this.h);
            ctx.lineTo(this.x + this.w, this.y + this.h);
        } else {
            const quarterHeight = this.h / 3;
            ctx.moveTo(c.x, this.y);
            ctx.lineTo(this.x + this.w, this.y + quarterHeight);
            ctx.lineTo(this.x + this.w, this.y + this.h - quarterHeight);
            ctx.lineTo(c.x, this.y + this.h);
            ctx.lineTo(this.x, this.y + this.h - quarterHeight);
            ctx.lineTo(this.x, this.y + quarterHeight);
        }
        ctx.closePath();
        ctx.fill();
    }

    highlight(ctx) {
        ctx.strokeStyle = 'yellow';
        ctx.strokeRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
    }

    drawLevelIndicator(ctx) {
        ctx.fillStyle = 'black';
        ctx.font = '10px sans-serif';
        ctx.fillText(String(this.level), this.x + this.w + 2, this.y + 10);
    }
}
