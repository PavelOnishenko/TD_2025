/**
 * Type declarations for engine modules
 */

import { ResizeCanvasOptions } from './types/engine';

declare module '../../engine/systems/ViewportManager.js' {
    export function resizeCanvas(options: ResizeCanvasOptions): void;
}

declare module '../../engine/core/GameLoop.js' {
    export default class GameLoop {
        constructor(updateCallback: (deltaTime: number) => void, renderCallback: (deltaTime: number) => void);
        start(): void;
        stop(): void;
        pause(): void;
        resume(): void;
    }
}

declare module '../../engine/core/Renderer.js' {
    import { Entity, Viewport } from './types/engine';
    export default class Renderer {
        constructor(canvas: HTMLCanvasElement, ctx?: CanvasRenderingContext2D | null);
        beginFrame(): void;
        endFrame(): void;
        fillRect(x: number, y: number, width: number, height: number, color: string): void;
        drawEntities(entities: Entity[], sortByY?: boolean): void;
        setViewport(viewport: Viewport): void;
    }
}

declare module '../../engine/systems/InputManager.js' {
    export default class InputManager {
        constructor();
        mapAction(actionName: string, keys: string[]): void;
        mapAxis(axisName: string, negativeKeys: string[], positiveKeys: string[]): void;
        handleKeyDown(event: KeyboardEvent): void;
        handleKeyUp(event: KeyboardEvent): void;
        wasActionPressed(actionName: string): boolean;
        getAxis(axisName: string): number;
        update(): void;
    }
}

declare module '../../engine/core/Entity.js' {
    import { Bounds, Viewport } from './types/engine';
    export default class Entity {
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
}
