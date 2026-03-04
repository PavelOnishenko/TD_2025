import type { ImportedAnimationMeta, ImportedPoseKeyframe } from './types.js';

export const JUMP_KEYFRAMES: ImportedPoseKeyframe[] = [
    {
        "time": 0,
        "pose": {
            "headY": -12,
            "torsoEndY": 13,
            "leftShoulderX": -5,
            "leftShoulderY": -4,
            "leftElbowX": -10,
            "leftElbowY": 0,
            "leftHandX": -12,
            "leftHandY": 6,
            "rightShoulderX": 5,
            "rightShoulderY": -4,
            "rightElbowX": 10,
            "rightElbowY": 0,
            "rightHandX": 12,
            "rightHandY": 6,
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
            "headY": -17,
            "torsoEndY": 8,
            "leftShoulderX": -5,
            "leftShoulderY": -9,
            "leftElbowX": -13,
            "leftElbowY": -3,
            "leftHandX": -15,
            "leftHandY": 3,
            "rightShoulderX": 5,
            "rightShoulderY": -9,
            "rightElbowX": 13,
            "rightElbowY": -3,
            "rightHandX": 15,
            "rightHandY": 3,
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
            "headY": -22,
            "torsoEndY": 3,
            "leftShoulderX": -5,
            "leftShoulderY": -14,
            "leftElbowX": -16,
            "leftElbowY": -6,
            "leftHandX": -18,
            "leftHandY": 0,
            "rightShoulderX": 5,
            "rightShoulderY": -14,
            "rightElbowX": 16,
            "rightElbowY": -6,
            "rightHandX": 18,
            "rightHandY": 0,
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

export const JUMP_META: ImportedAnimationMeta = {
    "name": "Jump",
    "duration": 1,
    "loop": false
};
