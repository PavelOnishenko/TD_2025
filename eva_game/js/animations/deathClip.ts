import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const DEATH_CLIP: AnimationClip = {
    name: 'death',
    getPose: (progress: number) => StickFigure.getDeathPose(progress)
};
