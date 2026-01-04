export function getViewportMetrics(windowRef?: Window & typeof globalThis): {
    width: number;
    height: number;
    dpr: number;
};
export function computeDisplaySize(metrics: any): {
    displayWidth: number;
    displayHeight: number;
    dpr: any;
};
export function createViewport(displaySize: any, options?: {}): {
    scale: number;
    offsetX: number;
    offsetY: number;
    dpr: any;
    worldBounds: {
        minX: any;
        maxX: any;
        minY: any;
        maxY: any;
    };
    renderWidth: number;
    renderHeight: number;
};
export function resizeCanvas({ canvasElement, gameContainerElement, gameInstance, metrics }: {
    canvasElement: any;
    gameContainerElement: any;
    gameInstance: any;
    metrics: any;
}): {
    scale: number;
    offsetX: number;
    offsetY: number;
    dpr: any;
    worldBounds: {
        minX: any;
        maxX: any;
        minY: any;
        maxY: any;
    };
    renderWidth: number;
    renderHeight: number;
} | null;
export function resizeCanvas(options: import("../../eva_game/js/types/engine").ResizeCanvasOptions): void;
export function __testResolveDimension(value: any, fallback: any): any;
export function __testNormalizeBounds(bounds: any, fallbackWidth: any, fallbackHeight: any): {
    minX: any;
    maxX: any;
    minY: any;
    maxY: any;
};
//# sourceMappingURL=ViewportManager.d.ts.map