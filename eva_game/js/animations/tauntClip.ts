import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const TAUNT_CLIP: AnimationClip = {
    name: 'taunt',
    getPose: (progress: number) => StickFigure.getTauntPose(progress)
};
