// Module declarations for engine classes used by RGFN game

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
    export default class Renderer {
        ctx: CanvasRenderingContext2D;
        canvas: HTMLCanvasElement;

        constructor(canvas: HTMLCanvasElement);
        beginFrame(): void;
        endFrame(): void;
        drawEntities(entities: any[]): void;
    }
}

declare module '../../engine/systems/InputManager.js' {
    export default class InputManager {
        constructor();
        mapAction(actionName: string, keys: string[]): void;
        handleKeyDown(event: KeyboardEvent): void;
        handleKeyUp(event: KeyboardEvent): void;
        update(): void;
        wasActionPressed(actionName: string): boolean;
        isActionHeld(actionName: string): boolean;
    }
}

declare module '../../engine/core/Entity.js' {
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
        move(deltaTime: number): void;
        getBounds(): { left: number; right: number; top: number; bottom: number };
        checkCollision(other: Entity): boolean;
        draw(ctx: CanvasRenderingContext2D, viewport?: any): void;
    }
}

declare module '../../engine/utils/MathUtils.js' {
    export function randomInt(min: number, max: number): number;
    export function clamp(value: number, min: number, max: number): number;
    export function lerp(start: number, end: number, t: number): number;
}

declare module '../../../engine/rendering/StickFigure.js' {
    export interface StickFigurePose {
        torsoTopX?: number;
        headY: number;
        headTilt?: number;
        headScale?: number;
        headOffsetY?: number;
        torsoEndY: number;
        leftShoulderX: number;
        leftShoulderY: number;
        leftElbowX: number;
        leftElbowY: number;
        leftHandX: number;
        leftHandY: number;
        rightShoulderX: number;
        rightShoulderY: number;
        rightElbowX: number;
        rightElbowY: number;
        rightHandX: number;
        rightHandY: number;
        leftHipX: number;
        leftHipY: number;
        leftKneeX: number;
        leftKneeY: number;
        leftFootX: number;
        leftFootY: number;
        rightHipX: number;
        rightHipY: number;
        rightKneeX: number;
        rightKneeY: number;
        rightFootX: number;
        rightFootY: number;
    }

    export default class StickFigure {
        static draw(
            ctx: CanvasRenderingContext2D,
            x: number,
            y: number,
            pose: StickFigurePose,
            color: string,
            facingRight: boolean,
            scale?: number,
            style?: { limbLineWidth?: number; coreBoneLineWidth?: number; outlineWidth?: number; outlineColor?: string }
        ): void;
        static getPoseFromImportedAnimation(keyframes: any[], meta: any, progress: number): StickFigurePose;
    }
}

declare module '../../../../engine/animation/imported/walkImported.js' {
    export const WALK_KEYFRAMES: any[];
    export const WALK_META: any;
}
