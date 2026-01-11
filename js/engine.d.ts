// Type declarations for engine modules

// Viewport interface
export interface Viewport {
    scale: number;
    offsetX: number;
    offsetY: number;
    dpr: number;
    worldBounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    renderWidth: number;
    renderHeight: number;
}

// Entity class from engine/core/Entity.js
export class Entity {
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
    draw(ctx: CanvasRenderingContext2D, viewport: Viewport): void;
    move(deltaTime: number): void;
    getBounds(): { left: number; right: number; top: number; bottom: number };
    checkCollision(other: Entity): boolean;
}

// GameLoop class from engine/core/GameLoop.js
export class GameLoop {
    updateCallback: (deltaTime: number, timestamp: number) => void;
    renderCallback: (deltaTime: number, timestamp: number) => void;
    isPaused: boolean;
    pauseReason: string | null;
    isRunning: boolean;
    timeScale: number;
    lastTime: number;
    elapsedTime: number;
    animationFrameId: number | null;

    constructor(
        updateCallback: (deltaTime: number, timestamp: number) => void,
        renderCallback: (deltaTime: number, timestamp: number) => void
    );
    start(): void;
    stop(): void;
    pause(reason?: string): void;
    resume(): boolean;
    setTimeScale(scale: number): number;
    getTimeScale(): number;
}

// InputManager class from engine/systems/InputManager.js
export class InputManager {
    keys: Map<string, boolean>;
    keysPressed: Set<string>;
    keysReleased: Set<string>;
    actions: Map<string, string[]>;
    axes: Map<string, { negative: string[]; positive: string[] }>;

    constructor();
    handleKeyDown(event: KeyboardEvent): void;
    handleKeyUp(event: KeyboardEvent): void;
    isKeyDown(code: string): boolean;
    wasPressed(code: string): boolean;
    wasReleased(code: string): boolean;
    mapAction(actionName: string, keyCodes: string[]): void;
    isActionActive(actionName: string): boolean;
    wasActionPressed(actionName: string): boolean;
    wasActionReleased(actionName: string): boolean;
    mapAxis(axisName: string, negativeKeys: string[], positiveKeys: string[]): void;
    getAxis(axisName: string): number;
    update(): void;
    reset(): void;
}
