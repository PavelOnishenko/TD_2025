import type { AnimationClip } from './types.js';
import { IDLE_CLIP } from './idleClip.js';
import { WALK_CLIP } from './walkClip.js';
import { PUNCH_CLIP } from './punchClip.js';
import { HURT_CLIP } from './hurtClip.js';
import { DEATH_CLIP } from './deathClip.js';
import { TAUNT_CLIP } from './tauntClip.js';

export type EnemyAnimationState = 'idle' | 'walk' | 'punch' | 'hurt' | 'death' | 'taunt';

export const ENEMY_ANIMATIONS: Record<EnemyAnimationState, AnimationClip> = {
    idle: IDLE_CLIP,
    walk: WALK_CLIP,
    punch: PUNCH_CLIP,
    hurt: HURT_CLIP,
    death: DEATH_CLIP,
    taunt: TAUNT_CLIP
};
