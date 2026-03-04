import type { ImportedAnimationMeta, ImportedPoseKeyframe } from './types.js';

export const LAND_KEYFRAMES: ImportedPoseKeyframe[] = [
    {
        "time": 0,
        "pose": {
            "headY": -12,
            "torsoEndY": 13,
            "leftShoulderX": -5,
            "leftShoulderY": -4,
            "leftElbowX": -14,
            "leftElbowY": -4,
            "leftHandX": -16,
            "leftHandY": 2,
            "rightShoulderX": 5,
            "rightShoulderY": -4,
            "rightElbowX": 14,
            "rightElbowY": -4,
            "rightHandX": 16,
            "rightHandY": 2,
            "leftHipX": -3,
            "leftHipY": 13,
            "leftKneeX": -4,
            "leftKneeY": 23,
            "leftFootX": -4,
            "leftFootY": 25,
            "rightHipX": 3,
            "rightHipY": 13,
            "rightKneeX": 4,
            "rightKneeY": 23,
            "rightFootX": 4,
            "rightFootY": 25
        }
    },
    {
        "time": 0.5,
        "pose": {
            "headY": -16,
            "torsoEndY": 9,
            "leftShoulderX": -5,
            "leftShoulderY": -8,
            "leftElbowX": -12,
            "leftElbowY": -2,
            "leftHandX": -14,
            "leftHandY": 4,
            "rightShoulderX": 5,
            "rightShoulderY": -8,
            "rightElbowX": 12,
            "rightElbowY": -2,
            "rightHandX": 14,
            "rightHandY": 4,
            "leftHipX": -3,
            "leftHipY": 9,
            "leftKneeX": -4,
            "leftKneeY": 19,
            "leftFootX": -4,
            "leftFootY": 25,
            "rightHipX": 3,
            "rightHipY": 9,
            "rightKneeX": 4,
            "rightKneeY": 19,
            "rightFootX": 4,
            "rightFootY": 25
        }
    },
    {
        "time": 1,
        "pose": {
            "headY": -20,
            "torsoEndY": 5,
            "leftShoulderX": -5,
            "leftShoulderY": -12,
            "leftElbowX": -10,
            "leftElbowY": 0,
            "leftHandX": -12,
            "leftHandY": 6,
            "rightShoulderX": 5,
            "rightShoulderY": -12,
            "rightElbowX": 10,
            "rightElbowY": 0,
            "rightHandX": 12,
            "rightHandY": 6,
            "leftHipX": -3,
            "leftHipY": 5,
            "leftKneeX": -4,
            "leftKneeY": 15,
            "leftFootX": -4,
            "leftFootY": 25,
            "rightHipX": 3,
            "rightHipY": 5,
            "rightKneeX": 4,
            "rightKneeY": 15,
            "rightFootX": 4,
            "rightFootY": 25
        }
    }
];

export const LAND_META: ImportedAnimationMeta = {
    "name": "Land",
    "duration": 1,
    "loop": false
};
