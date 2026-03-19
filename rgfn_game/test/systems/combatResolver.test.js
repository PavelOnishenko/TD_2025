import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../dist/entities/Player.js';
import Skeleton from '../../dist/entities/Skeleton.js';
import CombatResolver from '../../dist/systems/combat/CombatResolver.js';
import CombatAi from '../../dist/systems/combat/CombatAi.js';
import EncounterSystem from '../../dist/systems/encounter/EncounterSystem.js';
import { ensureCombatState } from '../../dist/systems/combat/CombatParticipantUtils.js';
import { withMockedRandom } from '../helpers/testUtils.js';

function createBattleMapStub(inRange = true, inMeleeRange = true) {
  return {
    isInAttackRange: () => inRange,
    isInMeleeRange: () => inMeleeRange,
    moveEntityToward: () => true,
  };
}

function createActors() {
  const player = new Player(0, 0, { startingSkillAllocation: { strength: 6, agility: 4 } });
  const enemy = new Skeleton(0, 0);
  player.id = 1;
  enemy.id = 2;
  player.gridCol = 5;
  player.gridRow = 5;
  enemy.gridCol = 4;
  enemy.gridRow = 5;
  player.damage = 10;
  enemy.damage = 7;
  player.armor = 0;
  enemy.armor = 0;
  player.avoidChance = 0;
  enemy.avoidChance = 0;
  enemy.behavior.avoidHitChance = 0;
  player.hp = player.maxHp = 40;
  enemy.hp = enemy.maxHp = 40;
  return { player, enemy };
}

test('CombatResolver lands left and right reads only on matching dodge directions', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const leftHit = createActors();
  const leftMiss = createActors();
  const centerHit = createActors();

  const leftHitOutcome = resolver.resolve(
    leftHit.player,
    leftHit.enemy,
    { type: 'attack', direction: 'left', targetId: leftHit.enemy.id, source: 'player' },
    { type: 'dodge', direction: 'left', targetId: null, source: 'enemy' },
    map
  );
  const leftMissOutcome = resolver.resolve(
    leftMiss.player,
    leftMiss.enemy,
    { type: 'attack', direction: 'left', targetId: leftMiss.enemy.id, source: 'player' },
    null,
    map
  );
  resolver.resolve(
    centerHit.player,
    centerHit.enemy,
    { type: 'attack', direction: 'center', targetId: centerHit.enemy.id, source: 'player' },
    null,
    map
  );

  assert.equal(leftHit.enemy.hp, 30);
  assert.equal(leftMiss.enemy.hp, 40);
  assert.equal(centerHit.enemy.hp, 30);
  assert.equal(leftHitOutcome.logs.some((entry) => entry.message.includes('dodged left')), true);
  assert.equal(leftMissOutcome.logs.some((entry) => entry.message.includes('did not dodge left')), true);
});

test('CombatResolver fast attack deals reduced damage and cuts passive avoid chance', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const normalActors = createActors();
  const fastActors = createActors();
  normalActors.enemy.avoidChance = 0.4;
  fastActors.enemy.avoidChance = 0.4;

  withMockedRandom([0.2], () => {
    resolver.resolve(
      normalActors.player,
      normalActors.enemy,
      { type: 'attack', direction: 'center', targetId: normalActors.enemy.id, source: 'player' },
      null,
      map
    );
  });
  withMockedRandom([0.2], () => {
    resolver.resolve(
      fastActors.player,
      fastActors.enemy,
      { type: 'fast', direction: 'center', targetId: fastActors.enemy.id, source: 'player' },
      null,
      map
    );
  });

  assert.equal(normalActors.enemy.hp, 40);
  assert.equal(fastActors.enemy.hp, 35);
});

test('CombatResolver lets normal attacks interrupt heavy wind-up while fast attacks do not', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const interrupted = createActors();
  const preserved = createActors();

  ensureCombatState(interrupted.enemy).preparedHeavyAttack = {
    direction: 'left',
    targetId: interrupted.player.id,
    targetName: interrupted.player.name,
  };
  ensureCombatState(preserved.enemy).preparedHeavyAttack = {
    direction: 'left',
    targetId: preserved.player.id,
    targetName: preserved.player.name,
  };

  resolver.resolve(
    interrupted.player,
    interrupted.enemy,
    { type: 'attack', direction: 'center', targetId: interrupted.enemy.id, source: 'player' },
    null,
    map
  );
  resolver.resolve(
    preserved.player,
    preserved.enemy,
    { type: 'fast', direction: 'center', targetId: preserved.enemy.id, source: 'player' },
    null,
    map
  );

  assert.equal(ensureCombatState(interrupted.enemy).preparedHeavyAttack, null);
  assert.notEqual(ensureCombatState(preserved.enemy).preparedHeavyAttack, null);
});

test('CombatResolver counter prevention is strong against normal, weaker against fast, and cannot stop heavy release', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const normalActors = createActors();
  const fastActors = createActors();
  const heavyActors = createActors();

  withMockedRandom([0.6], () => {
    resolver.resolve(
      normalActors.player,
      normalActors.enemy,
      { type: 'attack', direction: 'center', targetId: normalActors.enemy.id, source: 'player' },
      { type: 'counter', direction: null, targetId: normalActors.player.id, source: 'enemy' },
      map
    );
  });
  withMockedRandom([0.6], () => {
    resolver.resolve(
      fastActors.player,
      fastActors.enemy,
      { type: 'fast', direction: 'center', targetId: fastActors.enemy.id, source: 'player' },
      { type: 'counter', direction: null, targetId: fastActors.player.id, source: 'enemy' },
      map
    );
  });
  withMockedRandom([0], () => {
    resolver.resolve(
      heavyActors.player,
      heavyActors.enemy,
      { type: 'heavy-release', direction: 'center', targetId: heavyActors.enemy.id, source: 'player' },
      { type: 'counter', direction: null, targetId: heavyActors.player.id, source: 'enemy' },
      map
    );
  });

  assert.equal(normalActors.enemy.hp, 40);
  assert.equal(normalActors.player.hp, 31);
  assert.equal(fastActors.enemy.hp, 35);
  assert.equal(heavyActors.enemy.hp, 21);
});

test('CombatResolver ranged lead shots only land on matching dodge directions', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const leadHit = createActors();
  const leadMiss = createActors();

  resolver.resolve(
    leadHit.player,
    leadHit.enemy,
    { type: 'shoot', direction: 'left', targetId: leadHit.enemy.id, source: 'player' },
    { type: 'dodge', direction: 'left', targetId: null, source: 'enemy' },
    map
  );
  resolver.resolve(
    leadMiss.player,
    leadMiss.enemy,
    { type: 'shoot', direction: 'right', targetId: leadMiss.enemy.id, source: 'player' },
    { type: 'dodge', direction: 'left', targetId: null, source: 'enemy' },
    map
  );

  assert.equal(leadHit.enemy.hp, 30);
  assert.equal(leadMiss.enemy.hp, 40);
});

test('CombatAi moves when out of range and releases prepared heavy attacks', () => {
  const ai = new CombatAi();
  const { player, enemy } = createActors();
  enemy.getCombatBehaviorProfile().rangedWeight = 0;

  const moveIntent = ai.chooseIntent(enemy, player, createBattleMapStub(false, false), null);
  ensureCombatState(enemy).preparedHeavyAttack = {
    direction: 'center',
    targetId: player.id,
    targetName: player.name,
  };
  const releaseIntent = ai.chooseIntent(enemy, player, createBattleMapStub(true, true), null);

  assert.equal(moveIntent.type, 'move');
  assert.equal(releaseIntent.type, 'heavy-release');
});

test('EncounterSystem world generation assigns combat behavior profiles to generated enemies', () => {
  const encounters = new EncounterSystem(1);
  encounters.itemDiscoveryChance = 0;
  encounters.queueForcedEncounter('skeleton');

  const result = encounters.generateEncounter();

  assert.equal(result.type, 'battle');
  assert.equal(result.enemies[0].combatBehaviorProfile !== null, true);
  assert.equal(typeof result.enemies[0].combatBehaviorProfile.fastAttackWeight, 'number');
});
