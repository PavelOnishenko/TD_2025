import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const JUMP_CLIP: AnimationClip = {
    name: 'jump',
    getPose: (progress: number) => StickFigure.getJumpPose(progress)
};
