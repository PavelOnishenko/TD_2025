import type { AnimationState } from '../types/game.js';
import type { AnimationClip } from './types.js';
import { IDLE_CLIP } from './idleClip.js';
import { WALK_CLIP } from './walkClip.js';
import { PUNCH_CLIP } from './punchClip.js';
import { STRONG_PUNCH_CLIP } from './strongPunchClip.js';
import { KICK_CLIP } from './kickClip.js';
import { JUMP_CLIP } from './jumpClip.js';
import { FLY_CLIP } from './flyClip.js';
import { LAND_CLIP } from './landClip.js';
import { HURT_CLIP } from './hurtClip.js';
import { DEATH_CLIP } from './deathClip.js';

export type PlayerAnimationState = Exclude<AnimationState, 'taunt'>;

export const PLAYER_ANIMATIONS: Record<PlayerAnimationState, AnimationClip> = {
    idle: IDLE_CLIP,
    walk: WALK_CLIP,
    punch: PUNCH_CLIP,
    strongPunch: STRONG_PUNCH_CLIP,
    kick: KICK_CLIP,
    jump: JUMP_CLIP,
    fly: FLY_CLIP,
    land: LAND_CLIP,
    hurt: HURT_CLIP,
    death: DEATH_CLIP
};
