export default class Platform {
    constructor({ x = 0, y = 0, scale = 1 } = {}) {
        this.x = x;
        this.y = y;
        this.scale = scale;
    }

    draw(ctx, image) {
        if (!ctx || !image) {
            return;
        }

        const width = image.width * this.scale;
        const height = image.height * this.scale;
        const drawX = this.x - width / 2;
        const drawY = this.y - height / 2;

        ctx.drawImage(image, drawX, drawY, width, height);
    }
}
