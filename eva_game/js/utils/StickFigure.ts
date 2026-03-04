/**
 * StickFigure utility for drawing animated stick figure characters.
 */

import type { ImportedAnimationMeta, ImportedPoseKeyframe } from '../animations/types.js';
import { decorationConfig } from '../config/decorationConfig.js';

export interface StickFigurePose {
    headY: number;
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
    private static readonly HEAD_RADIUS = 8;
    private static readonly FEET_Y_OFFSET = 25;

    public static draw(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        pose: StickFigurePose,
        color: string,
        facingRight: boolean,
        scale: number = 1
    ): void {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        const limbLineWidth = decorationConfig.stickFigure.limbLineWidth * scale;
        const coreBoneLineWidth = decorationConfig.stickFigure.coreBoneLineWidth * scale;
        ctx.lineWidth = limbLineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const flip = facingRight ? 1 : -1;
        const headRadius = this.HEAD_RADIUS * scale;
        const drawY = y - this.FEET_Y_OFFSET * scale;

        ctx.beginPath();
        ctx.arc(x, drawY + pose.headY * scale, headRadius, 0, Math.PI * 2);
        ctx.fill();

        const leftShoulderX = x + pose.leftShoulderX * flip * scale;
        const leftShoulderY = drawY + pose.leftShoulderY * scale;
        const rightShoulderX = x + pose.rightShoulderX * flip * scale;
        const rightShoulderY = drawY + pose.rightShoulderY * scale;

        const leftHipX = x + pose.leftHipX * flip * scale;
        const leftHipY = drawY + pose.leftHipY * scale;
        const rightHipX = x + pose.rightHipX * flip * scale;
        const rightHipY = drawY + pose.rightHipY * scale;

        const shoulderCenterX = (leftShoulderX + rightShoulderX) / 2;
        const shoulderCenterY = (leftShoulderY + rightShoulderY) / 2;
        const hipCenterX = (leftHipX + rightHipX) / 2;
        const hipCenterY = (leftHipY + rightHipY) / 2;
        const headBottomY = drawY + pose.headY * scale + headRadius;

        ctx.lineWidth = coreBoneLineWidth;
        this.drawCoreBoneRect(ctx, x, headBottomY, shoulderCenterX, shoulderCenterY, coreBoneLineWidth);
        this.drawCoreBoneRect(ctx, leftShoulderX, leftShoulderY, rightShoulderX, rightShoulderY, coreBoneLineWidth);
        this.drawCoreBoneRect(ctx, shoulderCenterX, shoulderCenterY, hipCenterX, hipCenterY, coreBoneLineWidth);
        this.drawCoreBoneRect(ctx, leftHipX, leftHipY, rightHipX, rightHipY, coreBoneLineWidth);

        ctx.lineWidth = limbLineWidth;

        ctx.beginPath();
        ctx.moveTo(leftShoulderX, leftShoulderY);
        ctx.lineTo(x + pose.leftElbowX * flip * scale, drawY + pose.leftElbowY * scale);
        ctx.lineTo(x + pose.leftHandX * flip * scale, drawY + pose.leftHandY * scale);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightShoulderX, rightShoulderY);
        ctx.lineTo(x + pose.rightElbowX * flip * scale, drawY + pose.rightElbowY * scale);
        ctx.lineTo(x + pose.rightHandX * flip * scale, drawY + pose.rightHandY * scale);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(leftHipX, leftHipY);
        ctx.lineTo(x + pose.leftKneeX * flip * scale, drawY + pose.leftKneeY * scale);
        ctx.lineTo(x + pose.leftFootX * flip * scale, drawY + pose.leftFootY * scale);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightHipX, rightHipY);
        ctx.lineTo(x + pose.rightKneeX * flip * scale, drawY + pose.rightKneeY * scale);
        ctx.lineTo(x + pose.rightFootX * flip * scale, drawY + pose.rightFootY * scale);
        ctx.stroke();
    }

    private static drawCoreBoneRect(
        ctx: CanvasRenderingContext2D,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        thickness: number
    ): void {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.hypot(deltaX, deltaY);
        if (length === 0) return;

        const angle = Math.atan2(deltaY, deltaX);
        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
        ctx.fillRect(0, -thickness / 2, length, thickness);
        ctx.restore();
    }

    public static getVisualHeight(scale: number = 1): number {
        return (this.FEET_Y_OFFSET + 20 + this.HEAD_RADIUS) * scale;
    }

    public static getPoseFromImportedAnimation(
        keyframes: ImportedPoseKeyframe[],
        meta: ImportedAnimationMeta,
        progress: number
    ): StickFigurePose {
        if (!Array.isArray(keyframes) || keyframes.length === 0) {
            throw new Error('Animation keyframes cannot be empty');
        }

        if (keyframes.length === 1) {
            return keyframes[0].pose;
        }

        const sorted = [...keyframes].sort((a, b) => a.time - b.time);
        const clampedProgress = Math.max(0, Math.min(1, progress));
        const animationTime = clampedProgress * meta.duration;

        let previous = sorted[0];
        let next = sorted[sorted.length - 1];

        for (let i = 0; i < sorted.length - 1; i++) {
            if (animationTime >= sorted[i].time && animationTime <= sorted[i + 1].time) {
                previous = sorted[i];
                next = sorted[i + 1];
                break;
            }
        }

        if (previous.time === next.time) {
            return previous.pose;
        }

        const span = next.time - previous.time;
        const localProgress = (animationTime - previous.time) / span;
        return this.lerpPose(previous.pose, next.pose, localProgress);
    }

    public static lerpPose(poseA: StickFigurePose, poseB: StickFigurePose, t: number): StickFigurePose {
        const lerp = (a: number, b: number) => a + (b - a) * t;

        return {
            headY: lerp(poseA.headY, poseB.headY),
            torsoEndY: lerp(poseA.torsoEndY, poseB.torsoEndY),
            leftShoulderX: lerp(poseA.leftShoulderX, poseB.leftShoulderX),
            leftShoulderY: lerp(poseA.leftShoulderY, poseB.leftShoulderY),
            leftElbowX: lerp(poseA.leftElbowX, poseB.leftElbowX),
            leftElbowY: lerp(poseA.leftElbowY, poseB.leftElbowY),
            leftHandX: lerp(poseA.leftHandX, poseB.leftHandX),
            leftHandY: lerp(poseA.leftHandY, poseB.leftHandY),
            rightShoulderX: lerp(poseA.rightShoulderX, poseB.rightShoulderX),
            rightShoulderY: lerp(poseA.rightShoulderY, poseB.rightShoulderY),
            rightElbowX: lerp(poseA.rightElbowX, poseB.rightElbowX),
            rightElbowY: lerp(poseA.rightElbowY, poseB.rightElbowY),
            rightHandX: lerp(poseA.rightHandX, poseB.rightHandX),
            rightHandY: lerp(poseA.rightHandY, poseB.rightHandY),
            leftHipX: lerp(poseA.leftHipX, poseB.leftHipX),
            leftHipY: lerp(poseA.leftHipY, poseB.leftHipY),
            leftKneeX: lerp(poseA.leftKneeX, poseB.leftKneeX),
            leftKneeY: lerp(poseA.leftKneeY, poseB.leftKneeY),
            leftFootX: lerp(poseA.leftFootX, poseB.leftFootX),
            leftFootY: lerp(poseA.leftFootY, poseB.leftFootY),
            rightHipX: lerp(poseA.rightHipX, poseB.rightHipX),
            rightHipY: lerp(poseA.rightHipY, poseB.rightHipY),
            rightKneeX: lerp(poseA.rightKneeX, poseB.rightKneeX),
            rightKneeY: lerp(poseA.rightKneeY, poseB.rightKneeY),
            rightFootX: lerp(poseA.rightFootX, poseB.rightFootX),
            rightFootY: lerp(poseA.rightFootY, poseB.rightFootY)
        };
    }
}
