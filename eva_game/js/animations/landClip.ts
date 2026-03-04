import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const LAND_CLIP: AnimationClip = {
    name: 'land',
    getPose: (progress: number) => StickFigure.getLandPose(progress)
};
