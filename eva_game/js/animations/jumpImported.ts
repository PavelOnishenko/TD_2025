import type { ImportedAnimationMeta, ImportedKeyframe } from './types.js';

export const JUMP_KEYFRAMES: ImportedKeyframe[] = [
    {
        "time": 0,
        "params": {
            "x": 400,
            "y": 300,
            "headTilt": 0,
            "torsoAngle": -0.15,
            "torsoLength": 50,
            "leftUpperArmLength": 35,
            "leftForearmLength": 30,
            "rightUpperArmLength": 35,
            "rightForearmLength": 30,
            "leftThighLength": 40,
            "leftCalfLength": 35,
            "rightThighLength": 40,
            "rightCalfLength": 35,
            "hipLength": 30,
            "shoulderLength": 30,
            "leftShoulderAngle": -0.05,
            "leftElbowAngle": 0.31,
            "rightShoulderAngle": 0.05,
            "rightElbowAngle": -0.27,
            "leftHipAngle": 0.25,
            "leftKneeAngle": -0.55,
            "rightHipAngle": 0.25,
            "rightKneeAngle": -0.55
        }
    },
    {
        "time": 0.5,
        "params": {
            "x": 400,
            "y": 300,
            "headTilt": -0.04,
            "torsoAngle": 0.1,
            "torsoLength": 50,
            "leftUpperArmLength": 35,
            "leftForearmLength": 30,
            "rightUpperArmLength": 35,
            "rightForearmLength": 30,
            "leftThighLength": 40,
            "leftCalfLength": 35,
            "rightThighLength": 40,
            "rightCalfLength": 35,
            "hipLength": 30,
            "shoulderLength": 30,
            "leftShoulderAngle": -0.9,
            "leftElbowAngle": 0.31,
            "rightShoulderAngle": 0.9,
            "rightElbowAngle": -0.27,
            "leftHipAngle": -0.2,
            "leftKneeAngle": 0.15,
            "rightHipAngle": -0.2,
            "rightKneeAngle": 0.15
        }
    },
    {
        "time": 1,
        "params": {
            "x": 400,
            "y": 300,
            "headTilt": 0,
            "torsoAngle": 0,
            "torsoLength": 50,
            "leftUpperArmLength": 35,
            "leftForearmLength": 30,
            "rightUpperArmLength": 35,
            "rightForearmLength": 30,
            "leftThighLength": 40,
            "leftCalfLength": 35,
            "rightThighLength": 40,
            "rightCalfLength": 35,
            "hipLength": 30,
            "shoulderLength": 30,
            "leftShoulderAngle": -0.23,
            "leftElbowAngle": 0.31,
            "rightShoulderAngle": 0.22,
            "rightElbowAngle": -0.27,
            "leftHipAngle": -0.01,
            "leftKneeAngle": -0.08,
            "rightHipAngle": 0.01,
            "rightKneeAngle": 0
        }
    }
];

export const JUMP_META: ImportedAnimationMeta = {
    "name": "Jump",
    "duration": 1,
    "loop": false
};
