export interface PlatformInit {
    x?: number;
    y?: number;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
}

export default class Platform {
    public x: number;
    public y: number;
    public scale: number;
    public scaleX: number;
    public scaleY: number;

    constructor({ x = 0, y = 0, scale = 1, scaleX, scaleY }: PlatformInit = {}) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.scaleX = Number.isFinite(scaleX) ? scaleX : scale;
        this.scaleY = Number.isFinite(scaleY) ? scaleY : scale;
    }

    draw(ctx: CanvasRenderingContext2D | null | undefined, image: (CanvasImageSource & { width: number; height: number }) | null | undefined): void {
        if (!ctx || !image) {
            return;
        }

        const width = image.width * this.scaleX;
        const height = image.height * this.scaleY;
        const drawX = this.x - width / 2;
        const drawY = this.y - height / 2;

        ctx.drawImage(image, drawX, drawY, width, height);
    }
}
