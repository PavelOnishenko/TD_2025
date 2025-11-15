import test from 'node:test';
import assert from 'node:assert/strict';
import { createTutorial } from '../js/systems/tutorial.js';
import {
  registerTutorialTarget,
  clearTutorialTargets,
} from '../js/systems/tutorialTargets.js';

function createClassList() {
  const classes = new Set();
  return {
    classes,
    add(cls) {
      classes.add(cls);
    },
    remove(cls) {
      classes.delete(cls);
    },
    has(cls) {
      return classes.has(cls);
    },
  };
}

test('tutorial runs through configured steps and applies highlights', () => {
  const shown = [];
  const highlightElement = { classList: createClassList(), dataset: {} };
  registerTutorialTarget('highlight', () => highlightElement);

  const game = { wave: 1, waveInProgress: false, hasTower: false };
  const tutorial = createTutorial(game, {
    steps: [
      {
        id: 'build',
        name: 'Build',
        wave: 1,
        highlightTargets: ['highlight'],
        checkComplete: game => Boolean(game.hasTower),
      },
      {
        id: 'switch',
        name: 'Switch',
        wave: 1,
        highlightTargets: ['highlight'],
        checkComplete: (_, context) => (context?.colorSwitches ?? 0) > 0,
      },
      {
        id: 'start',
        name: 'Start',
        wave: 1,
        highlightTargets: [],
        checkComplete: game => Boolean(game.waveInProgress),
      },
    ],
    ui: {
      show: step => shown.push(['show', step.id]),
      hide: () => shown.push(['hide']),
      setHighlightState: () => {},
    },
    scheduleCheck: () => () => {},
  });

  tutorial.start();
  tutorial.handleWavePreparation(1);
  assert.deepEqual(shown.at(-1), ['show', 'build']);
  assert.equal(highlightElement.classList.has('tutorial-highlighted'), true);

  game.hasTower = true;
  tutorial.handleTowerPlaced();
  assert.deepEqual(shown.at(-1), ['show', 'switch']);
  assert.equal(highlightElement.classList.has('tutorial-highlighted'), true);

  tutorial.handleColorSwitch();
  assert.deepEqual(shown.at(-1), ['show', 'start']);
  assert.equal(highlightElement.classList.has('tutorial-highlighted'), false);

  game.waveInProgress = true;
  tutorial.handleWaveStarted();
  assert.deepEqual(shown.at(-1), ['hide']);
  assert.equal(tutorial.isComplete(), true);

  clearTutorialTargets();
});

test('informational steps can be acknowledged through the overlay', () => {
  const listeners = {};
  const overlayElement = {
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
  };
  const tutorial = createTutorial({ wave: 1, waveInProgress: false }, {
    steps: [
      {
        id: 'lore',
        wave: 1,
        checkComplete: (_, context) => Boolean(context?.acknowledgedSteps?.has?.('lore')),
      },
    ],
    ui: {
      show: () => {},
      hide: () => {},
      setHighlightState: () => {},
      element: overlayElement,
    },
    scheduleCheck: () => () => {},
  });

  tutorial.start();
  tutorial.handleWavePreparation(1);
  assert.equal(tutorial.isComplete(), false);
  listeners.click?.({});
  assert.equal(tutorial.isComplete(), true);
});

test('merge and removal events advance the tutorial', () => {
  const tutorial = createTutorial({ wave: 1, waveInProgress: false }, {
    steps: [
      {
        id: 'merge',
        wave: 1,
        checkComplete: (_, context) => (context?.merges ?? 0) > 0,
      },
      {
        id: 'remove',
        wave: 1,
        checkComplete: (_, context) => (context?.removals ?? 0) > 0,
      },
    ],
    ui: {
      show: () => {},
      hide: () => {},
      setHighlightState: () => {},
    },
    scheduleCheck: () => () => {},
  });

  tutorial.start();
  tutorial.handleWavePreparation(1);
  assert.equal(tutorial.getCurrentStep()?.id, 'merge');
  tutorial.handleTowerMerged();
  assert.equal(tutorial.getCurrentStep()?.id, 'remove');
  tutorial.handleTowerRemoved();
  assert.equal(tutorial.isComplete(), true);
});

test('reset clears completion and hides overlay', () => {
  const game = { wave: 1, waveInProgress: false, hasTower: false };
  let hideCount = 0;
  const tutorial = createTutorial(game, {
    steps: [
      {
        id: 'simple',
        wave: 1,
        checkComplete: game => Boolean(game.hasTower),
      },
    ],
    ui: {
      show: () => {},
      hide: () => { hideCount += 1; },
      setHighlightState: () => {},
    },
    scheduleCheck: () => () => {},
  });

  tutorial.start();
  tutorial.handleWavePreparation(1);
  game.hasTower = true;
  tutorial.handleTowerPlaced();
  assert.equal(tutorial.isComplete(), true);
  const hidesAfterComplete = hideCount;

  tutorial.reset({ force: true });
  assert.equal(tutorial.isComplete(), false);
  assert.ok(hideCount >= hidesAfterComplete);
});

test('tutorial skips when progress is already complete', () => {
  const game = { wave: 5, waveInProgress: false };
  let shown = false;
  const tutorial = createTutorial(game, {
    steps: [
      {
        id: 'anything',
        wave: 5,
        checkComplete: () => true,
      },
    ],
    ui: {
      show: () => { shown = true; },
      hide: () => {},
      setHighlightState: () => {},
    },
    scheduleCheck: () => () => {},
    initiallyComplete: true,
  });

  tutorial.start();
  assert.equal(shown, false);
  tutorial.reset({ force: true });
  tutorial.start();
  tutorial.handleWavePreparation(5);
  assert.equal(shown, true);
});

test('syncWithGame advances steps based on game state', () => {
  const game = { wave: 3, waveInProgress: true, towers: [{}] };
  const tutorial = createTutorial(game, {
    steps: [
      {
        id: 'first',
        wave: 1,
        checkComplete: game => Array.isArray(game?.towers) && game.towers.length > 0,
      },
      {
        id: 'second',
        wave: 2,
        checkComplete: game => Boolean(game.waveInProgress),
      },
    ],
    ui: {
      show: () => {},
      hide: () => {},
      setHighlightState: () => {},
    },
    scheduleCheck: () => () => {},
  });

  tutorial.syncWithGame(game);
  assert.equal(tutorial.isComplete(), true);
});
