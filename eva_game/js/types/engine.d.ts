/**
 * Type definitions for the game engine
 */

export interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
}

export interface Bounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface WorldBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export declare class Entity {
    x: number;
    y: number;
    width: number;
    height: number;
    velocityX: number;
    velocityY: number;
    active: boolean;
    id: number;

    constructor(x: number, y: number);
    update(deltaTime: number): void;
    draw(ctx: CanvasRenderingContext2D, viewport?: Viewport): void;
    move(deltaTime: number): void;
    getBounds(): Bounds;
    checkCollision(other: Entity): boolean;
}

export declare class GameLoop {
    constructor(updateCallback: (deltaTime: number) => void, renderCallback: (deltaTime: number) => void);
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
}

export declare class Renderer {
    constructor(canvas: HTMLCanvasElement, ctx?: CanvasRenderingContext2D | null);
    beginFrame(): void;
    endFrame(): void;
    fillRect(x: number, y: number, width: number, height: number, color: string): void;
    drawEntities(entities: Entity[], sortByY?: boolean): void;
    setViewport(viewport: Viewport): void;
}

export interface InputAction {
    pressed: boolean;
    justPressed: boolean;
    justReleased: boolean;
}

export declare class InputManager {
    constructor();
    mapAction(actionName: string, keys: string[]): void;
    mapAxis(axisName: string, negativeKeys: string[], positiveKeys: string[]): void;
    handleKeyDown(event: KeyboardEvent): void;
    handleKeyUp(event: KeyboardEvent): void;
    wasActionPressed(actionName: string): boolean;
    getAxis(axisName: string): number;
    update(): void;
}

export interface ResizeCanvasOptions {
    canvasElement: HTMLCanvasElement;
    gameInstance?: {
        updateViewport?: (viewport: Viewport) => void;
        computeWorldBounds?: () => WorldBounds;
    };
}

export declare function resizeCanvas(options: ResizeCanvasOptions): void;

// Module declaration for ViewportManager
declare module '../../engine/systems/ViewportManager' {
    export function resizeCanvas(options: ResizeCanvasOptions): void;
}

declare module '../../engine/systems/ViewportManager.js' {
    export function resizeCanvas(options: ResizeCanvasOptions): void;
}
