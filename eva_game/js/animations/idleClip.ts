import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';

export const IDLE_CLIP: AnimationClip = {
    name: 'idle',
    getPose: () => StickFigure.getIdlePose()
};
