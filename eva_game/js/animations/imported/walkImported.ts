import type { ImportedAnimationMeta, ImportedKeyframe } from '../types.js';

export const WALK_KEYFRAMES: ImportedKeyframe[] = [
    {
        "time": 0,
        "params": {
            "x": 400,
            "y": 300,
            "headTilt": -0.02,
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
            "leftShoulderAngle": -0.15,
            "leftElbowAngle": 0.31,
            "rightShoulderAngle": 0.15,
            "rightElbowAngle": -0.27,
            "leftHipAngle": -0.35,
            "leftKneeAngle": 0.2,
            "rightHipAngle": 0.35,
            "rightKneeAngle": -0.15
        }
    },
    {
        "time": 0.5,
        "params": {
            "x": 400,
            "y": 300,
            "headTilt": 0.02,
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
            "leftShoulderAngle": -0.35,
            "leftElbowAngle": 0.31,
            "rightShoulderAngle": 0.35,
            "rightElbowAngle": -0.27,
            "leftHipAngle": 0.35,
            "leftKneeAngle": -0.15,
            "rightHipAngle": -0.35,
            "rightKneeAngle": 0.2
        }
    },
    {
        "time": 1,
        "params": {
            "x": 400,
            "y": 300,
            "headTilt": -0.02,
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
            "leftShoulderAngle": -0.15,
            "leftElbowAngle": 0.31,
            "rightShoulderAngle": 0.15,
            "rightElbowAngle": -0.27,
            "leftHipAngle": -0.35,
            "leftKneeAngle": 0.2,
            "rightHipAngle": 0.35,
            "rightKneeAngle": -0.15
        }
    }
];

export const WALK_META: ImportedAnimationMeta = {
    "name": "Walk",
    "duration": 1,
    "loop": true
};
