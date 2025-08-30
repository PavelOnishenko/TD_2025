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
        const size = this.w / 2;
        ctx.beginPath();

        const tower1Size = 70; 

        // const sprite = this.color === 'red' ? assets.tower1 : assets.tower2;

        const propertyName = `tower_${this.level}${this.color.charAt(0)}`;
        const sprite = assets[propertyName];
        if (!sprite) {
            console.warn(`No sprite found for property name: ${propertyName}`);
            return;
        }

        if (this.level === 1) {
            ctx.drawImage(sprite, c.x-tower1Size/2, c.y-tower1Size/2, tower1Size, tower1Size);
        } else if (this.level === 2) {
            this.drawRegularPolygon(ctx, c, 6, size, -Math.PI / 6);
        } else {
            this.drawStar(ctx, c, 5, size, size / 2);
        }

        ctx.closePath();
        ctx.fill();
    }

    // todo remove if not needed
    drawTriangle(ctx, c) {
        ctx.moveTo(c.x, this.y);
        ctx.lineTo(this.x, this.y + this.h);
        ctx.lineTo(this.x + this.w, this.y + this.h);
    }

    drawRegularPolygon(ctx, c, sides, radius, offset = 0) {
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides + offset;
            const x = c.x + radius * Math.cos(angle);
            const y = c.y + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }

    drawStar(ctx, c, spikes, outer, inner) {
        for (let i = 0; i < spikes * 2; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const angle = (Math.PI / spikes) * i - Math.PI / 2;
            const x = c.x + r * Math.cos(angle);
            const y = c.y + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
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
