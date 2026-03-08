import type { ImportedAnimationMeta, ImportedKeyframe } from '../types.js';

export const GET_UP_KEYFRAMES: ImportedKeyframe[] = [
    {
        time: 0,
        params: {
            x: 340, y: 390, headTilt: -1.57, torsoAngle: 1.57, torsoLength: 50,
            leftUpperArmLength: 35, leftForearmLength: 30, rightUpperArmLength: 35, rightForearmLength: 30,
            leftThighLength: 40, leftCalfLength: 35, rightThighLength: 40, rightCalfLength: 35,
            hipLength: 24, shoulderLength: 28,
            leftShoulderAngle: -1.5, leftElbowAngle: -0.1, rightShoulderAngle: 1.5, rightElbowAngle: 0.1,
            leftHipAngle: 1.5, leftKneeAngle: -0.08, rightHipAngle: 1.4, rightKneeAngle: 0.04
        }
    },
    {
        time: 0.6,
        params: {
            x: 370, y: 330, headTilt: -0.3, torsoAngle: 0.75, torsoLength: 50,
            leftUpperArmLength: 35, leftForearmLength: 30, rightUpperArmLength: 35, rightForearmLength: 30,
            leftThighLength: 40, leftCalfLength: 35, rightThighLength: 40, rightCalfLength: 35,
            hipLength: 24, shoulderLength: 28,
            leftShoulderAngle: -0.7, leftElbowAngle: 0.85, rightShoulderAngle: 1.15, rightElbowAngle: 1.0,
            leftHipAngle: 0.65, leftKneeAngle: -0.2, rightHipAngle: 0.52, rightKneeAngle: -0.15
        }
    },
    {
        time: 1,
        params: {
            x: 400, y: 300, headTilt: 0, torsoAngle: 0, torsoLength: 50,
            leftUpperArmLength: 35, leftForearmLength: 30, rightUpperArmLength: 35, rightForearmLength: 30,
            leftThighLength: 40, leftCalfLength: 35, rightThighLength: 40, rightCalfLength: 35,
            hipLength: 24, shoulderLength: 28,
            leftShoulderAngle: -0.23, leftElbowAngle: 2.7, rightShoulderAngle: 1.08, rightElbowAngle: 2.15,
            leftHipAngle: -0.04, leftKneeAngle: -0.06, rightHipAngle: -0.02, rightKneeAngle: 0.04
        }
    }
];

export const GET_UP_META: ImportedAnimationMeta = {
    name: 'GetUp',
    duration: 1,
    loop: false
};
