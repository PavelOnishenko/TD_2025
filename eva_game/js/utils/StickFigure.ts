/**
 * StickFigure utility for drawing animated stick figure characters.
 */

import type { ImportedAnimationMeta, ImportedAnimationParams, ImportedKeyframe } from '../animations/types.js';
import { decorationConfig } from '../config/decorationConfig.js';

export interface StickFigurePose {
    torsoTopX?: number;
    headY: number;
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
    private static readonly HEAD_RADIUS = 8;
    private static readonly FEET_Y_OFFSET = 25;
    private static readonly IMPORT_SCALE = 0.5;
    private static readonly IMPORT_BONE_SCALE_MULTIPLIER = 0.76;
    private static readonly IMPORT_HEAD_SCALE_MULTIPLIER = 0.82;
    private static readonly IMPORT_HEAD_UP_OFFSET = -9;
    private static readonly IMPORT_ORIGIN_X = 400;
    private static readonly IMPORT_ORIGIN_Y = 300;

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
        const outlineWidth = decorationConfig.stickFigure.outlineWidth * scale;
        const hasOutline = outlineWidth > 0;
        const outlineColor = decorationConfig.stickFigure.outlineColor;
        ctx.lineWidth = limbLineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const flip = facingRight ? 1 : -1;
        const headRadius = this.HEAD_RADIUS * scale * (pose.headScale ?? 1);
        const drawY = y - this.FEET_Y_OFFSET * scale;

        const torsoTopX = x + (pose.torsoTopX ?? 0) * flip * scale;
        const headX = torsoTopX;
        const headY = drawY + (pose.headY + (pose.headOffsetY ?? 0)) * scale;
        if (hasOutline) {
            ctx.beginPath();
            ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
            ctx.fillStyle = outlineColor;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(headX, headY, Math.max(0, headRadius - outlineWidth), 0, Math.PI * 2);
        ctx.fillStyle = color;
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
        this.drawCoreBoneRect(ctx, torsoTopX, headBottomY, shoulderCenterX, shoulderCenterY, coreBoneLineWidth, color, hasOutline, outlineColor, outlineWidth);
        this.drawCoreBoneRect(ctx, leftShoulderX, leftShoulderY, rightShoulderX, rightShoulderY, coreBoneLineWidth, color, hasOutline, outlineColor, outlineWidth);
        this.drawCoreBoneRect(ctx, shoulderCenterX, shoulderCenterY, hipCenterX, hipCenterY, coreBoneLineWidth, color, hasOutline, outlineColor, outlineWidth);
        this.drawCoreBoneRect(ctx, leftHipX, leftHipY, rightHipX, rightHipY, coreBoneLineWidth, color, hasOutline, outlineColor, outlineWidth);

        ctx.lineWidth = limbLineWidth;
        this.drawLimb(
            ctx,
            [
                [leftShoulderX, leftShoulderY],
                [x + pose.leftElbowX * flip * scale, drawY + pose.leftElbowY * scale],
                [x + pose.leftHandX * flip * scale, drawY + pose.leftHandY * scale]
            ],
            limbLineWidth,
            color,
            hasOutline,
            outlineColor,
            outlineWidth
        );

        this.drawLimb(
            ctx,
            [
                [rightShoulderX, rightShoulderY],
                [x + pose.rightElbowX * flip * scale, drawY + pose.rightElbowY * scale],
                [x + pose.rightHandX * flip * scale, drawY + pose.rightHandY * scale]
            ],
            limbLineWidth,
            color,
            hasOutline,
            outlineColor,
            outlineWidth
        );

        this.drawLimb(
            ctx,
            [
                [leftHipX, leftHipY],
                [x + pose.leftKneeX * flip * scale, drawY + pose.leftKneeY * scale],
                [x + pose.leftFootX * flip * scale, drawY + pose.leftFootY * scale]
            ],
            limbLineWidth,
            color,
            hasOutline,
            outlineColor,
            outlineWidth
        );

        this.drawLimb(
            ctx,
            [
                [rightHipX, rightHipY],
                [x + pose.rightKneeX * flip * scale, drawY + pose.rightKneeY * scale],
                [x + pose.rightFootX * flip * scale, drawY + pose.rightFootY * scale]
            ],
            limbLineWidth,
            color,
            hasOutline,
            outlineColor,
            outlineWidth
        );
    }

    private static drawLimb(
        ctx: CanvasRenderingContext2D,
        points: Array<[number, number]>,
        baseWidth: number,
        color: string,
        hasOutline: boolean,
        outlineColor: string,
        outlineWidth: number
    ): void {
        if (points.length < 2) {
            return;
        }

        if (hasOutline) {
            this.strokePolyline(ctx, points, baseWidth + outlineWidth * 2, outlineColor);
        }

        this.strokePolyline(ctx, points, baseWidth, color);
    }

    private static strokePolyline(
        ctx: CanvasRenderingContext2D,
        points: Array<[number, number]>,
        lineWidth: number,
        color: string
    ): void {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.stroke();
    }

    private static drawCoreBoneRect(
        ctx: CanvasRenderingContext2D,
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        thickness: number,
        color: string,
        hasOutline: boolean,
        outlineColor: string,
        outlineWidth: number
    ): void {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.hypot(deltaX, deltaY);
        if (length === 0) {
            return;
        }

        const angle = Math.atan2(deltaY, deltaX);
        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
        if (hasOutline) {
            ctx.fillStyle = outlineColor;
            ctx.fillRect(0, -(thickness / 2 + outlineWidth), length, thickness + outlineWidth * 2);
        }
        ctx.fillStyle = color;
        ctx.fillRect(0, -thickness / 2, length, thickness);
        ctx.restore();
    }

    public static getVisualHeight(scale: number = 1): number {
        return (this.FEET_Y_OFFSET + 20 + this.HEAD_RADIUS) * scale;
    }

    public static getPoseFromImportedAnimation(
        keyframes: ImportedKeyframe[],
        meta: ImportedAnimationMeta,
        progress: number
    ): StickFigurePose {
        if (!Array.isArray(keyframes) || keyframes.length === 0) {
            throw new Error('Animation keyframes cannot be empty');
        }

        const normalizedProgress = Math.max(0, Math.min(1, progress));
        const time = normalizedProgress * meta.duration;
        const params = this.interpolateImportedParams(keyframes, meta, time);
        return this.convertImportedParamsToPose(params);
    }

    private static interpolateImportedParams(
        keyframes: ImportedKeyframe[],
        meta: ImportedAnimationMeta,
        time: number
    ): ImportedAnimationParams {
        if (keyframes.length === 1) {
            return keyframes[0].params;
        }

        const duration = Math.max(0.0001, meta.duration);
        const wrappedTime = meta.loop ? ((time % duration) + duration) % duration : Math.max(0, Math.min(duration, time));
        const sorted = [...keyframes].sort((a, b) => a.time - b.time);

        let previous = sorted[0];
        let next = sorted[sorted.length - 1];

        for (let i = 0; i < sorted.length - 1; i++) {
            if (wrappedTime >= sorted[i].time && wrappedTime <= sorted[i + 1].time) {
                previous = sorted[i];
                next = sorted[i + 1];
                break;
            }
        }

        if (previous.time === next.time) {
            return previous.params;
        }

        const localProgress = (wrappedTime - previous.time) / (next.time - previous.time);
        return this.lerpImportedParams(previous.params, next.params, localProgress);
    }

    private static lerpImportedParams(a: ImportedAnimationParams, b: ImportedAnimationParams, t: number): ImportedAnimationParams {
        const lerp = (start: number, end: number): number => start + (end - start) * t;
        return {
            x: lerp(a.x, b.x),
            y: lerp(a.y, b.y),
            headTilt: lerp(a.headTilt, b.headTilt),
            torsoAngle: lerp(a.torsoAngle, b.torsoAngle),
            torsoLength: lerp(a.torsoLength, b.torsoLength),
            leftUpperArmLength: lerp(a.leftUpperArmLength, b.leftUpperArmLength),
            leftForearmLength: lerp(a.leftForearmLength, b.leftForearmLength),
            rightUpperArmLength: lerp(a.rightUpperArmLength, b.rightUpperArmLength),
            rightForearmLength: lerp(a.rightForearmLength, b.rightForearmLength),
            leftThighLength: lerp(a.leftThighLength, b.leftThighLength),
            leftCalfLength: lerp(a.leftCalfLength, b.leftCalfLength),
            rightThighLength: lerp(a.rightThighLength, b.rightThighLength),
            rightCalfLength: lerp(a.rightCalfLength, b.rightCalfLength),
            hipLength: lerp(a.hipLength, b.hipLength),
            shoulderLength: lerp(a.shoulderLength, b.shoulderLength),
            leftShoulderAngle: lerp(a.leftShoulderAngle, b.leftShoulderAngle),
            leftElbowAngle: lerp(a.leftElbowAngle, b.leftElbowAngle),
            rightShoulderAngle: lerp(a.rightShoulderAngle, b.rightShoulderAngle),
            rightElbowAngle: lerp(a.rightElbowAngle, b.rightElbowAngle),
            leftHipAngle: lerp(a.leftHipAngle, b.leftHipAngle),
            leftKneeAngle: lerp(a.leftKneeAngle, b.leftKneeAngle),
            rightHipAngle: lerp(a.rightHipAngle, b.rightHipAngle),
            rightKneeAngle: lerp(a.rightKneeAngle, b.rightKneeAngle)
        };
    }

    private static convertImportedParamsToPose(params: ImportedAnimationParams): StickFigurePose {
        const scale = this.IMPORT_SCALE * this.IMPORT_BONE_SCALE_MULTIPLIER;
        const translationX = (params.x - this.IMPORT_ORIGIN_X) * scale;
        const translationY = (params.y - this.IMPORT_ORIGIN_Y) * scale;
        const torsoTopX = 0;
        const torsoTopY = -20;
        const torsoEndX = torsoTopX + Math.sin(params.torsoAngle) * params.torsoLength * scale;
        const torsoEndY = torsoTopY + Math.cos(params.torsoAngle) * params.torsoLength * scale;

        const shoulderHalf = (params.shoulderLength * scale) / 2;
        const hipHalf = (params.hipLength * scale) / 2;

        const leftShoulderX = torsoTopX - shoulderHalf;
        const rightShoulderX = torsoTopX + shoulderHalf;
        const shouldersY = torsoTopY + 2;

        const leftHipX = torsoEndX - hipHalf;
        const rightHipX = torsoEndX + hipHalf;
        const hipsY = torsoEndY;

        const leftElbow = this.pointFromAngle(leftShoulderX, shouldersY, params.leftUpperArmLength * scale, params.leftShoulderAngle);
        const leftHand = this.pointFromAngle(leftElbow.x, leftElbow.y, params.leftForearmLength * scale, params.leftShoulderAngle + params.leftElbowAngle);

        const rightElbow = this.pointFromAngle(rightShoulderX, shouldersY, params.rightUpperArmLength * scale, params.rightShoulderAngle);
        const rightHand = this.pointFromAngle(rightElbow.x, rightElbow.y, params.rightForearmLength * scale, params.rightShoulderAngle + params.rightElbowAngle);

        const leftKnee = this.pointFromAngle(leftHipX, hipsY, params.leftThighLength * scale, params.leftHipAngle);
        const leftFoot = this.pointFromAngle(leftKnee.x, leftKnee.y, params.leftCalfLength * scale, params.leftHipAngle + params.leftKneeAngle);

        const rightKnee = this.pointFromAngle(rightHipX, hipsY, params.rightThighLength * scale, params.rightHipAngle);
        const rightFoot = this.pointFromAngle(rightKnee.x, rightKnee.y, params.rightCalfLength * scale, params.rightHipAngle + params.rightKneeAngle);

        return {
            torsoTopX: translationX,
            headY: torsoTopY - params.headTilt * 8 + translationY,
            headScale: this.IMPORT_HEAD_SCALE_MULTIPLIER,
            headOffsetY: this.IMPORT_HEAD_UP_OFFSET,
            torsoEndY: torsoEndY + translationY,
            leftShoulderX: leftShoulderX + translationX,
            leftShoulderY: shouldersY + translationY,
            leftElbowX: leftElbow.x + translationX,
            leftElbowY: leftElbow.y + translationY,
            leftHandX: leftHand.x + translationX,
            leftHandY: leftHand.y + translationY,
            rightShoulderX: rightShoulderX + translationX,
            rightShoulderY: shouldersY + translationY,
            rightElbowX: rightElbow.x + translationX,
            rightElbowY: rightElbow.y + translationY,
            rightHandX: rightHand.x + translationX,
            rightHandY: rightHand.y + translationY,
            leftHipX: leftHipX + translationX,
            leftHipY: hipsY + translationY,
            leftKneeX: leftKnee.x + translationX,
            leftKneeY: leftKnee.y + translationY,
            leftFootX: leftFoot.x + translationX,
            leftFootY: leftFoot.y + translationY,
            rightHipX: rightHipX + translationX,
            rightHipY: hipsY + translationY,
            rightKneeX: rightKnee.x + translationX,
            rightKneeY: rightKnee.y + translationY,
            rightFootX: rightFoot.x + translationX,
            rightFootY: rightFoot.y + translationY
        };
    }

    private static pointFromAngle(originX: number, originY: number, length: number, angle: number): { x: number; y: number } {
        return {
            x: originX + Math.sin(angle) * length,
            y: originY + Math.cos(angle) * length
        };
    }
}
