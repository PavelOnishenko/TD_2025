import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const STRONG_PUNCH_CLIP: AnimationClip = {
    name: 'strongPunch',
    getPose: (progress: number, facingRight: boolean) => StickFigure.getStrongPunchPose(progress, facingRight)
};
