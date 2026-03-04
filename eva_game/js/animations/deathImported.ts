import type { ImportedAnimationMeta, ImportedPoseKeyframe } from './types.js';

export const DEATH_KEYFRAMES: ImportedPoseKeyframe[] = [
    {
        "time": 0,
        "pose": {
            "headY": -20,
            "torsoEndY": 5,
            "leftShoulderX": -5,
            "leftShoulderY": -12,
            "leftElbowX": -8,
            "leftElbowY": 0,
            "leftHandX": -8,
            "leftHandY": 8,
            "rightShoulderX": 5,
            "rightShoulderY": -12,
            "rightElbowX": 8,
            "rightElbowY": 0,
            "rightHandX": 8,
            "rightHandY": 8,
            "leftHipX": -3,
            "leftHipY": 5,
            "leftKneeX": -3,
            "leftKneeY": 15,
            "leftFootX": -3,
            "leftFootY": 25,
            "rightHipX": 3,
            "rightHipY": 5,
            "rightKneeX": 3,
            "rightKneeY": 15,
            "rightFootX": 3,
            "rightFootY": 25
        }
    },
    {
        "time": 0.5,
        "pose": {
            "headY": 10.625,
            "torsoEndY": 13.75,
            "leftShoulderX": -7.625,
            "leftShoulderY": 11.625,
            "leftElbowX": -14.125,
            "leftElbowY": 10.5,
            "leftHandX": -18.5,
            "leftHandY": 9.75,
            "rightShoulderX": 7.625,
            "rightShoulderY": 11.625,
            "rightElbowX": 14.125,
            "rightElbowY": 15.75,
            "rightHandX": 18.5,
            "rightHandY": 18.5,
            "leftHipX": -2.125,
            "leftHipY": 13.75,
            "leftKneeX": 6.625,
            "leftKneeY": 15.875,
            "leftFootX": 15.375,
            "leftFootY": 18,
            "rightHipX": 2.125,
            "rightHipY": 13.75,
            "rightKneeX": 10.875,
            "rightKneeY": 14.125,
            "rightFootX": 19.625,
            "rightFootY": 14.5
        }
    },
    {
        "time": 1,
        "pose": {
            "headY": 15,
            "torsoEndY": 15,
            "leftShoulderX": -8,
            "leftShoulderY": 15,
            "leftElbowX": -15,
            "leftElbowY": 12,
            "leftHandX": -20,
            "leftHandY": 10,
            "rightShoulderX": 8,
            "rightShoulderY": 15,
            "rightElbowX": 15,
            "rightElbowY": 18,
            "rightHandX": 20,
            "rightHandY": 20,
            "leftHipX": -2,
            "leftHipY": 15,
            "leftKneeX": 8,
            "leftKneeY": 16,
            "leftFootX": 18,
            "leftFootY": 17,
            "rightHipX": 2,
            "rightHipY": 15,
            "rightKneeX": 12,
            "rightKneeY": 14,
            "rightFootX": 22,
            "rightFootY": 13
        }
    }
];

export const DEATH_META: ImportedAnimationMeta = {
    "name": "Death",
    "duration": 1,
    "loop": false
};
