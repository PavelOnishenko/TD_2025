import type { StickFigurePose } from '../utils/StickFigure.js';

export interface ImportedPoseKeyframe {
    time: number;
    pose: StickFigurePose;
}

export interface ImportedAnimationMeta {
    name: string;
    duration: number;
    loop: boolean;
}

export interface ImportedAnimationAsset {
    keyframes: ImportedPoseKeyframe[];
    meta: ImportedAnimationMeta;
}
