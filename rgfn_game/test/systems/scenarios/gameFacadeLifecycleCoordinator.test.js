import test from 'node:test';
import assert from 'node:assert/strict';

import GameFacadeLifecycleCoordinator from '../../../dist/game/runtime/GameFacadeLifecycleCoordinator.js';

function createCoordinatorState({ firstRevealResult = false, secondRevealResult = true } = {}) {
  const worldMapCalls = { reveal: [], register: [] };
  const transitions = [];
  let revealCount = 0;
  return {
    coordinator: new GameFacadeLifecycleCoordinator({
      worldMap: {
        revealNamedLocation: (name) => {
          worldMapCalls.reveal.push(name);
          revealCount += 1;
          return revealCount === 1 ? firstRevealResult : secondRevealResult;
        },
        registerNamedLocation: (name) => {
          worldMapCalls.register.push(name);
        },
      },
      stateMachine: { transition: (mode) => transitions.push(mode) },
    }),
    worldMapCalls,
    transitions,
  };
}

test('GameFacadeLifecycleCoordinator retries quest location reveal after registering the location', () => {
  const { coordinator, worldMapCalls, transitions } = createCoordinatorState({ firstRevealResult: false, secondRevealResult: true });
  const shown = coordinator.onQuestLocationClick('Silver Ridge');

  assert.equal(shown, true);
  assert.deepEqual(worldMapCalls.reveal, ['Silver Ridge', 'Silver Ridge']);
  assert.deepEqual(worldMapCalls.register, ['Silver Ridge']);
  assert.equal(transitions.length, 1);
});

test('GameFacadeLifecycleCoordinator does not re-register location when first reveal succeeds', () => {
  const { coordinator, worldMapCalls, transitions } = createCoordinatorState({ firstRevealResult: true, secondRevealResult: true });
  const shown = coordinator.onQuestLocationClick('Silver Ridge');

  assert.equal(shown, true);
  assert.deepEqual(worldMapCalls.reveal, ['Silver Ridge']);
  assert.deepEqual(worldMapCalls.register, []);
  assert.equal(transitions.length, 1);
});
