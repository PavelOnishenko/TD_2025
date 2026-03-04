import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const WALK_CLIP: AnimationClip = {
    name: 'walk',
    getPose: (progress: number) => StickFigure.getWalkPose(progress)
};
