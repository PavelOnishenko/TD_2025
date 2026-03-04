import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const FLY_CLIP: AnimationClip = {
    name: 'fly',
    getPose: (progress: number) => StickFigure.getFlyPose(progress)
};
