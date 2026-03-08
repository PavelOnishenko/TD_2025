import type { ImportedAnimationMeta, ImportedKeyframe } from '../types.js';

export const KNOCKDOWN_FALL_KEYFRAMES: ImportedKeyframe[] = [
    {
        time: 0,
        params: {
            x: 400, y: 300, headTilt: 0, torsoAngle: 0, torsoLength: 50,
            leftUpperArmLength: 35, leftForearmLength: 30, rightUpperArmLength: 35, rightForearmLength: 30,
            leftThighLength: 40, leftCalfLength: 35, rightThighLength: 40, rightCalfLength: 35,
            hipLength: 24, shoulderLength: 28,
            leftShoulderAngle: -0.2, leftElbowAngle: 2.1, rightShoulderAngle: 1.0, rightElbowAngle: 2.0,
            leftHipAngle: -0.04, leftKneeAngle: -0.06, rightHipAngle: -0.02, rightKneeAngle: 0.04
        }
    },
    {
        time: 0.5,
        params: {
            x: 382, y: 320, headTilt: -0.45, torsoAngle: 0.7, torsoLength: 50,
            leftUpperArmLength: 35, leftForearmLength: 30, rightUpperArmLength: 35, rightForearmLength: 30,
            leftThighLength: 40, leftCalfLength: 35, rightThighLength: 40, rightCalfLength: 35,
            hipLength: 24, shoulderLength: 28,
            leftShoulderAngle: -0.8, leftElbowAngle: 1.0, rightShoulderAngle: 1.2, rightElbowAngle: 1.0,
            leftHipAngle: 0.7, leftKneeAngle: -0.1, rightHipAngle: 0.55, rightKneeAngle: 0.08
        }
    },
    {
        time: 1,
        params: {
            x: 340, y: 390, headTilt: -1.57, torsoAngle: 1.57, torsoLength: 50,
            leftUpperArmLength: 35, leftForearmLength: 30, rightUpperArmLength: 35, rightForearmLength: 30,
            leftThighLength: 40, leftCalfLength: 35, rightThighLength: 40, rightCalfLength: 35,
            hipLength: 24, shoulderLength: 28,
            leftShoulderAngle: -1.55, leftElbowAngle: -0.2, rightShoulderAngle: 1.55, rightElbowAngle: 0.05,
            leftHipAngle: 1.57, leftKneeAngle: -0.08, rightHipAngle: 1.45, rightKneeAngle: 0.04
        }
    }
];

export const KNOCKDOWN_FALL_META: ImportedAnimationMeta = {
    name: 'KnockdownFall',
    duration: 1,
    loop: false
};
