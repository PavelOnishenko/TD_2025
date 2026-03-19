import test from 'node:test';
import assert from 'node:assert/strict';

import Player from '../../dist/entities/Player.js';
import Skeleton from '../../dist/entities/Skeleton.js';
import CombatResolver from '../../dist/systems/combat/CombatResolver.js';
import CombatAi from '../../dist/systems/combat/CombatAi.js';
import EncounterSystem from '../../dist/systems/encounter/EncounterSystem.js';
import { ensureCombatState } from '../../dist/systems/combat/CombatParticipantUtils.js';

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
  player.hp = player.maxHp = 40;
  enemy.hp = enemy.maxHp = 40;
  return { player, enemy };
}

test('CombatResolver applies more damage when directional attack matches the lane', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const matching = createActors();
  const offLane = createActors();

  resolver.resolve(
    matching.player,
    matching.enemy,
    { type: 'attack', direction: 'right', targetId: matching.enemy.id, source: 'player' },
    null,
    map
  );
  resolver.resolve(
    offLane.player,
    offLane.enemy,
    { type: 'attack', direction: 'left', targetId: offLane.enemy.id, source: 'player' },
    null,
    map
  );

  assert.equal(matching.enemy.hp, 30);
  assert.equal(offLane.enemy.hp, 32);
});

test('CombatResolver prepares and then releases a heavier strike', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const { player, enemy } = createActors();

  resolver.resolve(
    player,
    enemy,
    { type: 'heavy', direction: 'right', targetId: enemy.id, source: 'player' },
    null,
    map
  );
  const release = resolver.resolve(
    player,
    enemy,
    { type: 'heavy-release', direction: 'right', targetId: enemy.id, source: 'player' },
    null,
    map
  );

  assert.equal(ensureCombatState(player).preparedHeavyAttack.direction, 'right');
  assert.equal(enemy.hp, 21);
  assert.equal(release.logs.some((entry) => entry.message.includes('heavy right strike')), true);
});

test('CombatResolver interrupts a prepared heavy attack when the target is hit', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const { player, enemy } = createActors();

  ensureCombatState(enemy).preparedHeavyAttack = {
    direction: 'left',
    targetId: player.id,
    targetName: player.name,
  };

  const outcome = resolver.resolve(
    player,
    enemy,
    { type: 'attack', direction: 'right', targetId: enemy.id, source: 'player' },
    null,
    map
  );

  assert.equal(ensureCombatState(enemy).preparedHeavyAttack, null);
  assert.equal(outcome.logs.some((entry) => entry.message.includes('interrupted')), true);
});

test('CombatResolver counter stance punishes qualifying melee attacks but not ranged shots', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const meleeActors = createActors();
  const rangedActors = createActors();

  ensureCombatState(meleeActors.enemy).counterStanceActive = true;
  resolver.resolve(
    meleeActors.player,
    meleeActors.enemy,
    { type: 'attack', direction: 'right', targetId: meleeActors.enemy.id, source: 'player' },
    null,
    map
  );

  ensureCombatState(rangedActors.enemy).counterStanceActive = true;
  resolver.resolve(
    rangedActors.player,
    rangedActors.enemy,
    { type: 'shoot', direction: 'center', targetId: rangedActors.enemy.id, source: 'player' },
    null,
    map
  );

  assert.equal(meleeActors.player.hp, 31);
  assert.equal(meleeActors.enemy.hp, 40);
  assert.equal(rangedActors.enemy.hp < 40, true);
});

test('CombatResolver dodge direction can fully avoid melee and reward ranged lead shots', () => {
  const resolver = new CombatResolver();
  const map = createBattleMapStub();
  const dodgedMelee = createActors();
  const leadShot = createActors();
  const straightShot = createActors();

  ensureCombatState(dodgedMelee.enemy).dodgeDirection = 'left';
  const dodgeOutcome = resolver.resolve(
    dodgedMelee.player,
    dodgedMelee.enemy,
    { type: 'attack', direction: 'left', targetId: dodgedMelee.enemy.id, source: 'player' },
    null,
    map
  );

  ensureCombatState(leadShot.enemy).dodgeDirection = 'left';
  resolver.resolve(
    leadShot.player,
    leadShot.enemy,
    { type: 'shoot', direction: 'left', targetId: leadShot.enemy.id, source: 'player' },
    null,
    map
  );

  ensureCombatState(straightShot.enemy).dodgeDirection = 'left';
  resolver.resolve(
    straightShot.player,
    straightShot.enemy,
    { type: 'shoot', direction: 'center', targetId: straightShot.enemy.id, source: 'player' },
    null,
    map
  );

  assert.equal(dodgedMelee.enemy.hp, 40);
  assert.equal(dodgeOutcome.logs[0].message.includes('avoids the blow'), true);
  assert.equal(leadShot.enemy.hp, 28);
  assert.equal(straightShot.enemy.hp, 35);
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
  assert.equal(['left', 'center', 'right'].includes(result.enemies[0].combatBehaviorProfile.preferredDirection), true);
});
