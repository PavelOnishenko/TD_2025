import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const PUNCH_CLIP: AnimationClip = {
    name: 'punch',
    getPose: (progress: number, facingRight: boolean, punchHand: 'left' | 'right' = 'right') => StickFigure.getPunchPose(progress, facingRight, punchHand)
};
