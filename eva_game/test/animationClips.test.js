import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAYER_ANIMATIONS } from '../dist/animations/playerAnimations.js';
import { ENEMY_ANIMATIONS } from '../dist/animations/enemyAnimations.js';
import StickFigure from '../dist/utils/StickFigure.js';
import { KICK_KEYFRAMES, KICK_META } from '../dist/animations/kickImported.js';

const PLAYER_STATES = ['idle', 'walk', 'punch', 'strongPunch', 'kick', 'jump', 'fly', 'land', 'hurt', 'death'];
const ENEMY_STATES = ['idle', 'walk', 'punch', 'hurt', 'death', 'taunt'];

test('player animation map defines a file-based clip for every player state', () => {
    assert.deepEqual(Object.keys(PLAYER_ANIMATIONS).sort(), PLAYER_STATES.sort());

    for (const state of PLAYER_STATES) {
        const pose = PLAYER_ANIMATIONS[state].getPose(0.5, true, 'right');
        assert.ok(typeof pose.headY === 'number');
        assert.ok(typeof pose.rightFootY === 'number');
    }
});

test('enemy animation map defines a file-based clip for every enemy state', () => {
    assert.deepEqual(Object.keys(ENEMY_ANIMATIONS).sort(), ENEMY_STATES.sort());

    for (const state of ENEMY_STATES) {
        const pose = ENEMY_ANIMATIONS[state].getPose(0.5, false);
        assert.ok(typeof pose.headY === 'number');
        assert.ok(typeof pose.leftFootX === 'number');
    }
});

test('kick clip continues to use imported kick keyframe file data', () => {
    const fromClip = PLAYER_ANIMATIONS.kick.getPose(0.45, true);
    const fromImportedData = StickFigure.getPoseFromImportedAnimation(KICK_KEYFRAMES, KICK_META, 0.45);

    assert.equal(fromClip.rightFootX, fromImportedData.rightFootX);
    assert.equal(fromClip.rightFootY, fromImportedData.rightFootY);
});
