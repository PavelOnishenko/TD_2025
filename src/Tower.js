export default class Tower {
    constructor(x, y, color = 'red') {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 40;
        this.range = 120;
        this.lastShot = 0;
        this.color = color;
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
    }
}
