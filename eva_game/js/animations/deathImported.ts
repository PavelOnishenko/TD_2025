import type { ImportedAnimationMeta, ImportedKeyframe } from './types.js';

export const DEATH_KEYFRAMES: ImportedKeyframe[] = [
    {
        "time": 0,
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
    },
    {
        "time": 0.5,
        "params": {
            "x": 400,
            "y": 300,
            "headTilt": 1.2,
            "torsoAngle": 1.1,
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
            "leftShoulderAngle": -1.6,
            "leftElbowAngle": 0.8,
            "rightShoulderAngle": 1.4,
            "rightElbowAngle": -0.7,
            "leftHipAngle": 1.4,
            "leftKneeAngle": -0.4,
            "rightHipAngle": 1.2,
            "rightKneeAngle": -0.2
        }
    },
    {
        "time": 1,
        "params": {
            "x": 400,
            "y": 300,
            "headTilt": 1.5,
            "torsoAngle": 1.45,
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
            "leftShoulderAngle": -1.8,
            "leftElbowAngle": 0.9,
            "rightShoulderAngle": 1.6,
            "rightElbowAngle": -0.8,
            "leftHipAngle": 1.6,
            "leftKneeAngle": -0.5,
            "rightHipAngle": 1.4,
            "rightKneeAngle": -0.3
        }
    }
];

export const DEATH_META: ImportedAnimationMeta = {
    "name": "Death",
    "duration": 1,
    "loop": false
};
