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
    // Feet Y position in the idle pose (used to anchor drawing at feet)
    private static readonly FEET_Y_OFFSET = 25;

    /**
     * Draw a stick figure at the specified position with the given pose
     * The (x, y) coordinates represent the feet position (ground level)
     */
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
        ctx.lineWidth = this.LINE_WIDTH * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Flip horizontally if facing left
        const flip = facingRight ? 1 : -1;

        // Scale the head radius
        const headRadius = this.HEAD_RADIUS * scale;

        // Offset drawing so that feet are at the passed y coordinate
        // In idle pose, feet are at y + FEET_Y_OFFSET * scale relative to center
        // So we shift drawing up by that amount
        const drawY = y - this.FEET_Y_OFFSET * scale;

        // Draw head
        ctx.beginPath();
        ctx.arc(x, drawY + pose.headY * scale, headRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw torso
        ctx.beginPath();
        ctx.moveTo(x, drawY + pose.headY * scale + headRadius);
        ctx.lineTo(x, drawY + pose.torsoEndY * scale);
        ctx.stroke();

        // Draw left arm
        ctx.beginPath();
        ctx.moveTo(x + pose.leftShoulderX * flip * scale, drawY + pose.leftShoulderY * scale);
        ctx.lineTo(x + pose.leftElbowX * flip * scale, drawY + pose.leftElbowY * scale);
        ctx.lineTo(x + pose.leftHandX * flip * scale, drawY + pose.leftHandY * scale);
        ctx.stroke();

        // Draw right arm
        ctx.beginPath();
        ctx.moveTo(x + pose.rightShoulderX * flip * scale, drawY + pose.rightShoulderY * scale);
        ctx.lineTo(x + pose.rightElbowX * flip * scale, drawY + pose.rightElbowY * scale);
        ctx.lineTo(x + pose.rightHandX * flip * scale, drawY + pose.rightHandY * scale);
        ctx.stroke();

        // Draw left leg
        ctx.beginPath();
        ctx.moveTo(x + pose.leftHipX * flip * scale, drawY + pose.leftHipY * scale);
        ctx.lineTo(x + pose.leftKneeX * flip * scale, drawY + pose.leftKneeY * scale);
        ctx.lineTo(x + pose.leftFootX * flip * scale, drawY + pose.leftFootY * scale);
        ctx.stroke();

        // Draw right leg
        ctx.beginPath();
        ctx.moveTo(x + pose.rightHipX * flip * scale, drawY + pose.rightHipY * scale);
        ctx.lineTo(x + pose.rightKneeX * flip * scale, drawY + pose.rightKneeY * scale);
        ctx.lineTo(x + pose.rightFootX * flip * scale, drawY + pose.rightFootY * scale);
        ctx.stroke();
    }

    /**
     * Get the visual height of the stick figure from feet to top of head
     */
    public static getVisualHeight(scale: number = 1): number {
        // Head is at -20, with radius 8, so top is at -28
        // Feet are at 25
        // Total height: 25 - (-28) = 53, scaled
        return (this.FEET_Y_OFFSET + 20 + this.HEAD_RADIUS) * scale;
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
     * Falls to the ground gradually, lying on back with feet pointing in movement direction
     */
    public static getDeathPose(progress: number): StickFigurePose {
        // Smooth fall using easing
        const fallProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        // Get the idle (standing) pose
        const standingPose = this.getIdlePose();

        // Define the final lying-down pose (lying on back, body horizontal)
        // Body extends horizontally with head on left, feet on right (when facingRight=true)
        const lyingPose: StickFigurePose = {
            // Head is on the left side when lying down
            headY: 15, // Near ground level

            // Torso center (between head and hips)
            torsoEndY: 15,

            // Left arm (far arm when lying on back) - slightly back
            leftShoulderX: -8,
            leftShoulderY: 15,
            leftElbowX: -15,
            leftElbowY: 12,
            leftHandX: -20,
            leftHandY: 10,

            // Right arm (near arm when lying on back) - slightly forward
            rightShoulderX: 8,
            rightShoulderY: 15,
            rightElbowX: 15,
            rightElbowY: 18,
            rightHandX: 20,
            rightHandY: 20,

            // Left leg (far leg when lying on back) - extended toward feet direction
            leftHipX: -2,
            leftHipY: 15,
            leftKneeX: 8,
            leftKneeY: 16,
            leftFootX: 18,
            leftFootY: 17,

            // Right leg (near leg when lying on back) - extended toward feet direction
            rightHipX: 2,
            rightHipY: 15,
            rightKneeX: 12,
            rightKneeY: 14,
            rightFootX: 22,
            rightFootY: 13
        };

        // Interpolate between standing and lying poses
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        return {
            headY: lerp(standingPose.headY, lyingPose.headY, fallProgress),
            torsoEndY: lerp(standingPose.torsoEndY, lyingPose.torsoEndY, fallProgress),

            leftShoulderX: lerp(standingPose.leftShoulderX, lyingPose.leftShoulderX, fallProgress),
            leftShoulderY: lerp(standingPose.leftShoulderY, lyingPose.leftShoulderY, fallProgress),
            leftElbowX: lerp(standingPose.leftElbowX, lyingPose.leftElbowX, fallProgress),
            leftElbowY: lerp(standingPose.leftElbowY, lyingPose.leftElbowY, fallProgress),
            leftHandX: lerp(standingPose.leftHandX, lyingPose.leftHandX, fallProgress),
            leftHandY: lerp(standingPose.leftHandY, lyingPose.leftHandY, fallProgress),

            rightShoulderX: lerp(standingPose.rightShoulderX, lyingPose.rightShoulderX, fallProgress),
            rightShoulderY: lerp(standingPose.rightShoulderY, lyingPose.rightShoulderY, fallProgress),
            rightElbowX: lerp(standingPose.rightElbowX, lyingPose.rightElbowX, fallProgress),
            rightElbowY: lerp(standingPose.rightElbowY, lyingPose.rightElbowY, fallProgress),
            rightHandX: lerp(standingPose.rightHandX, lyingPose.rightHandX, fallProgress),
            rightHandY: lerp(standingPose.rightHandY, lyingPose.rightHandY, fallProgress),

            leftHipX: lerp(standingPose.leftHipX, lyingPose.leftHipX, fallProgress),
            leftHipY: lerp(standingPose.leftHipY, lyingPose.leftHipY, fallProgress),
            leftKneeX: lerp(standingPose.leftKneeX, lyingPose.leftKneeX, fallProgress),
            leftKneeY: lerp(standingPose.leftKneeY, lyingPose.leftKneeY, fallProgress),
            leftFootX: lerp(standingPose.leftFootX, lyingPose.leftFootX, fallProgress),
            leftFootY: lerp(standingPose.leftFootY, lyingPose.leftFootY, fallProgress),

            rightHipX: lerp(standingPose.rightHipX, lyingPose.rightHipX, fallProgress),
            rightHipY: lerp(standingPose.rightHipY, lyingPose.rightHipY, fallProgress),
            rightKneeX: lerp(standingPose.rightKneeX, lyingPose.rightKneeX, fallProgress),
            rightKneeY: lerp(standingPose.rightKneeY, lyingPose.rightKneeY, fallProgress),
            rightFootX: lerp(standingPose.rightFootX, lyingPose.rightFootX, fallProgress),
            rightFootY: lerp(standingPose.rightFootY, lyingPose.rightFootY, fallProgress)
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
