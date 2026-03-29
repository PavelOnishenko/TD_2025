/**
 * EVA-specific wrapper over shared engine stick figure renderer.
 * Keeps local imports stable while delegating animation playback logic to engine.
 */

import EngineStickFigure from '../../../engine/rendering/StickFigure.js';
import type { ImportedAnimationMeta, ImportedKeyframe } from '../animations/types.js';
import { decorationConfig } from '../config/decorationConfig.js';

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
    public static draw(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        pose: StickFigurePose,
        color: string,
        facingRight: boolean,
        scale: number = 1
    ): void {
        EngineStickFigure.draw(ctx, x, y, pose, color, facingRight, scale, {
            limbLineWidth: decorationConfig.stickFigure.limbLineWidth,
            coreBoneLineWidth: decorationConfig.stickFigure.coreBoneLineWidth,
            outlineWidth: decorationConfig.stickFigure.outlineWidth,
            outlineColor: decorationConfig.stickFigure.outlineColor
        });
    }

    public static getPoseFromImportedAnimation(
        keyframes: ImportedKeyframe[],
        meta: ImportedAnimationMeta,
        progress: number
    ): StickFigurePose {
        return EngineStickFigure.getPoseFromImportedAnimation(keyframes, meta, progress) as StickFigurePose;
    }
}
