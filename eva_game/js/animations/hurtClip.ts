import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const HURT_CLIP: AnimationClip = {
    name: 'hurt',
    getPose: (progress: number) => StickFigure.getHurtPose(progress)
};
