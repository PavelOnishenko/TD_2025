import type { ImportedAnimationMeta, ImportedPoseKeyframe } from './types.js';

export const IDLE_KEYFRAMES: ImportedPoseKeyframe[] = [
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
    }
];

export const IDLE_META: ImportedAnimationMeta = {
    "name": "Idle",
    "duration": 1,
    "loop": true
};
