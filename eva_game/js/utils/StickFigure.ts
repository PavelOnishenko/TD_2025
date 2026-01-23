/**
 * StickFigure utility for drawing animated stick figure characters
 * Animations use gradual value changes to create smooth continuous movement
 */

export interface StickFigurePose {
    // Head
    headY: number;

    // Torso
    torsoEndY: number;

    // Arms
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

    // Legs
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
    private static readonly LINE_WIDTH = 3;

    /**
     * Draw a stick figure at the specified position with the given pose
     */
    public static draw(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        pose: StickFigurePose,
        color: string,
        facingRight: boolean
    ): void {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = this.LINE_WIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Flip horizontally if facing left
        const flip = facingRight ? 1 : -1;

        // Draw head
        ctx.beginPath();
        ctx.arc(x, y + pose.headY, this.HEAD_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Draw torso
        ctx.beginPath();
        ctx.moveTo(x, y + pose.headY + this.HEAD_RADIUS);
        ctx.lineTo(x, y + pose.torsoEndY);
        ctx.stroke();

        // Draw left arm
        ctx.beginPath();
        ctx.moveTo(x + pose.leftShoulderX * flip, y + pose.leftShoulderY);
        ctx.lineTo(x + pose.leftElbowX * flip, y + pose.leftElbowY);
        ctx.lineTo(x + pose.leftHandX * flip, y + pose.leftHandY);
        ctx.stroke();

        // Draw right arm
        ctx.beginPath();
        ctx.moveTo(x + pose.rightShoulderX * flip, y + pose.rightShoulderY);
        ctx.lineTo(x + pose.rightElbowX * flip, y + pose.rightElbowY);
        ctx.lineTo(x + pose.rightHandX * flip, y + pose.rightHandY);
        ctx.stroke();

        // Draw left leg
        ctx.beginPath();
        ctx.moveTo(x + pose.leftHipX * flip, y + pose.leftHipY);
        ctx.lineTo(x + pose.leftKneeX * flip, y + pose.leftKneeY);
        ctx.lineTo(x + pose.leftFootX * flip, y + pose.leftFootY);
        ctx.stroke();

        // Draw right leg
        ctx.beginPath();
        ctx.moveTo(x + pose.rightHipX * flip, y + pose.rightHipY);
        ctx.lineTo(x + pose.rightKneeX * flip, y + pose.rightKneeY);
        ctx.lineTo(x + pose.rightFootX * flip, y + pose.rightFootY);
        ctx.stroke();
    }

    /**
     * Get idle pose - standing neutral
     */
    public static getIdlePose(): StickFigurePose {
        return {
            headY: -20,
            torsoEndY: 5,

            leftShoulderX: -5,
            leftShoulderY: -12,
            leftElbowX: -8,
            leftElbowY: 0,
            leftHandX: -8,
            leftHandY: 8,

            rightShoulderX: 5,
            rightShoulderY: -12,
            rightElbowX: 8,
            rightElbowY: 0,
            rightHandX: 8,
            rightHandY: 8,

            leftHipX: -3,
            leftHipY: 5,
            leftKneeX: -3,
            leftKneeY: 15,
            leftFootX: -3,
            leftFootY: 25,

            rightHipX: 3,
            rightHipY: 5,
            rightKneeX: 3,
            rightKneeY: 15,
            rightFootX: 3,
            rightFootY: 25
        };
    }

    /**
     * Get walking pose with animation progress (0-1)
     * Creates a walking cycle by moving legs and arms
     */
    public static getWalkPose(progress: number): StickFigurePose {
        // Create a cycling animation using sine wave
        const cycle = Math.sin(progress * Math.PI * 2) * 8;
        const armCycle = Math.sin(progress * Math.PI * 2) * 5;

        return {
            headY: -20 + Math.abs(Math.sin(progress * Math.PI * 4)) * 1, // Slight bob
            torsoEndY: 5,

            // Arms swing opposite to legs
            leftShoulderX: -5,
            leftShoulderY: -12,
            leftElbowX: -8,
            leftElbowY: 0 - armCycle,
            leftHandX: -8,
            leftHandY: 8 - armCycle * 1.5,

            rightShoulderX: 5,
            rightShoulderY: -12,
            rightElbowX: 8,
            rightElbowY: 0 + armCycle,
            rightHandX: 8,
            rightHandY: 8 + armCycle * 1.5,

            // Legs alternate forward and back
            leftHipX: -3,
            leftHipY: 5,
            leftKneeX: -3 + cycle * 0.5,
            leftKneeY: 15,
            leftFootX: -3 + cycle,
            leftFootY: 25,

            rightHipX: 3,
            rightHipY: 5,
            rightKneeX: 3 - cycle * 0.5,
            rightKneeY: 15,
            rightFootX: 3 - cycle,
            rightFootY: 25
        };
    }

    /**
     * Get punch/strike pose with animation progress (0-1)
     * Gradually extends the arm forward for a punch
     */
    public static getPunchPose(progress: number, facingRight: boolean): StickFigurePose {
        // Ease out for punch extension, ease in for retraction
        const punchProgress = progress < 0.5
            ? progress * 2 // Extend: 0 to 1 in first half
            : 2 - progress * 2; // Retract: 1 to 0 in second half

        const extension = punchProgress * 20;
        const shoulderRotation = punchProgress * 5;
        const legBrace = punchProgress * 4;

        return {
            headY: -20,
            torsoEndY: 5 + shoulderRotation,

            // Punch with right arm (direction handled by flip in draw)
            leftShoulderX: -5,
            leftShoulderY: -12 + shoulderRotation,
            leftElbowX: -8 - legBrace,
            leftElbowY: 0,
            leftHandX: -8 - legBrace,
            leftHandY: 8,

            rightShoulderX: 5,
            rightShoulderY: -12 - shoulderRotation,
            rightElbowX: 8 + extension * 0.6,
            rightElbowY: -8 - shoulderRotation,
            rightHandX: 8 + extension,
            rightHandY: -8 - shoulderRotation,

            // Brace legs for punch
            leftHipX: -3,
            leftHipY: 5,
            leftKneeX: -3 - legBrace,
            leftKneeY: 15,
            leftFootX: -3 - legBrace,
            leftFootY: 25,

            rightHipX: 3,
            rightHipY: 5,
            rightKneeX: 3 + legBrace,
            rightKneeY: 15,
            rightFootX: 3 + legBrace,
            rightFootY: 25
        };
    }

    /**
     * Get hurt pose with animation progress (0-1)
     * Recoils backward with a defensive posture
     */
    public static getHurtPose(progress: number): StickFigurePose {
        // Quick recoil, slow recovery
        const recoil = progress < 0.3
            ? (1 - progress / 0.3) * 10 // Fast recoil in first 30%
            : 0; // Hold for recovery

        const hunch = progress < 0.5 ? progress * 2 : 2 - progress * 2;

        return {
            headY: -20 + recoil * 0.5 + hunch * 2,
            torsoEndY: 5 + hunch * 3,

            // Arms come up defensively
            leftShoulderX: -5,
            leftShoulderY: -12 + hunch * 2,
            leftElbowX: -12 - hunch * 3,
            leftElbowY: -5 - hunch * 3,
            leftHandX: -10 - hunch * 2,
            leftHandY: -10 - hunch * 5,

            rightShoulderX: 5,
            rightShoulderY: -12 + hunch * 2,
            rightElbowX: 12 + hunch * 3,
            rightElbowY: -5 - hunch * 3,
            rightHandX: 10 + hunch * 2,
            rightHandY: -10 - hunch * 5,

            // Legs buckle slightly
            leftHipX: -3,
            leftHipY: 5 + hunch * 2,
            leftKneeX: -3 - hunch * 2,
            leftKneeY: 15 + hunch * 2,
            leftFootX: -3 - hunch,
            leftFootY: 25,

            rightHipX: 3,
            rightHipY: 5 + hunch * 2,
            rightKneeX: 3 + hunch * 2,
            rightKneeY: 15 + hunch * 2,
            rightFootX: 3 + hunch,
            rightFootY: 25
        };
    }

    /**
     * Get death pose with animation progress (0-1)
     * Falls to the ground gradually, lying on back with feet pointing forward
     */
    public static getDeathPose(progress: number): StickFigurePose {
        // Smooth fall using easing
        const fallProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        // Figure falls backward and lays flat
        // Body center moves down as figure collapses
        const dropHeight = fallProgress * 20;

        // Lying on back pose - body is horizontal
        return {
            // Head at ground level
            headY: -20 + dropHeight,
            torsoEndY: 5 + dropHeight,

            // Arms spread out to sides at shoulder level
            leftShoulderX: -5,
            leftShoulderY: -12 + dropHeight,
            leftElbowX: -15 * fallProgress - 5,
            leftElbowY: -12 + dropHeight,
            leftHandX: -20 * fallProgress - 5,
            leftHandY: -12 + dropHeight,

            rightShoulderX: 5,
            rightShoulderY: -12 + dropHeight,
            rightElbowX: 15 * fallProgress + 5,
            rightElbowY: -12 + dropHeight,
            rightHandX: 20 * fallProgress + 5,
            rightHandY: -12 + dropHeight,

            // Legs straight out pointing forward (in the direction of movement)
            leftHipX: -3,
            leftHipY: 5 + dropHeight,
            leftKneeX: -3,
            leftKneeY: 15 + dropHeight,
            leftFootX: -3,
            leftFootY: 25 + dropHeight,

            rightHipX: 3,
            rightHipY: 5 + dropHeight,
            rightKneeX: 3,
            rightKneeY: 15 + dropHeight,
            rightFootX: 3,
            rightFootY: 25 + dropHeight
        };
    }

    /**
     * Interpolate between two poses
     */
    public static lerpPose(poseA: StickFigurePose, poseB: StickFigurePose, t: number): StickFigurePose {
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        return {
            headY: lerp(poseA.headY, poseB.headY, t),
            torsoEndY: lerp(poseA.torsoEndY, poseB.torsoEndY, t),

            leftShoulderX: lerp(poseA.leftShoulderX, poseB.leftShoulderX, t),
            leftShoulderY: lerp(poseA.leftShoulderY, poseB.leftShoulderY, t),
            leftElbowX: lerp(poseA.leftElbowX, poseB.leftElbowX, t),
            leftElbowY: lerp(poseA.leftElbowY, poseB.leftElbowY, t),
            leftHandX: lerp(poseA.leftHandX, poseB.leftHandX, t),
            leftHandY: lerp(poseA.leftHandY, poseB.leftHandY, t),

            rightShoulderX: lerp(poseA.rightShoulderX, poseB.rightShoulderX, t),
            rightShoulderY: lerp(poseA.rightShoulderY, poseB.rightShoulderY, t),
            rightElbowX: lerp(poseA.rightElbowX, poseB.rightElbowX, t),
            rightElbowY: lerp(poseA.rightElbowY, poseB.rightElbowY, t),
            rightHandX: lerp(poseA.rightHandX, poseB.rightHandX, t),
            rightHandY: lerp(poseA.rightHandY, poseB.rightHandY, t),

            leftHipX: lerp(poseA.leftHipX, poseB.leftHipX, t),
            leftHipY: lerp(poseA.leftHipY, poseB.leftHipY, t),
            leftKneeX: lerp(poseA.leftKneeX, poseB.leftKneeX, t),
            leftKneeY: lerp(poseA.leftKneeY, poseB.leftKneeY, t),
            leftFootX: lerp(poseA.leftFootX, poseB.leftFootX, t),
            leftFootY: lerp(poseA.leftFootY, poseB.leftFootY, t),

            rightHipX: lerp(poseA.rightHipX, poseB.rightHipX, t),
            rightHipY: lerp(poseA.rightHipY, poseB.rightHipY, t),
            rightKneeX: lerp(poseA.rightKneeX, poseB.rightKneeX, t),
            rightKneeY: lerp(poseA.rightKneeY, poseB.rightKneeY, t),
            rightFootX: lerp(poseA.rightFootX, poseB.rightFootX, t),
            rightFootY: lerp(poseA.rightFootY, poseB.rightFootY, t)
        };
    }
}
