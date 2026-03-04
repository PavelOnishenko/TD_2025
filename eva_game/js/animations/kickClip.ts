import StickFigure from '../utils/StickFigure.js';
import type { AnimationClip } from './types.js';
import { KICK_KEYFRAMES, KICK_META } from './kickImported.js';

export const KICK_CLIP: AnimationClip = {
    name: 'kick',
    getPose: (progress: number) => StickFigure.getPoseFromImportedAnimation(KICK_KEYFRAMES, KICK_META, progress)
};
