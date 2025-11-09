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
    add: cls => classes.add(cls),
    remove: cls => classes.delete(cls),
    has: cls => classes.has(cls),
  };
}

function createOverlayElements() {
  const overlayClassList = createClassList();
  const overlay = {
    classList: overlayClassList,
    setAttribute: () => {},
  };
  const titleEl = { textContent: '' };
  const textEl = { textContent: '' };
  const imageClassList = createClassList();
  const imageEl = {
    classList: imageClassList,
    hidden: true,
    alt: '',
    removeAttribute: () => {},
  };
  const soundClassList = createClassList();
  const soundContainer = {
    classList: soundClassList,
    hidden: true,
  };
  const soundNameEl = { textContent: '' };
  return {
    overlay,
    titleEl,
    textEl,
    imageEl,
    soundContainer,
    soundNameEl,
    overlayClassList,
    imageClassList,
    soundClassList,
  };
}

test('tutorial steps follow wave preparations and react to events', () => {
  const {
    overlay,
    titleEl,
    textEl,
    imageEl,
    soundContainer,
    soundNameEl,
    overlayClassList,
  } = createOverlayElements();
  const highlightTarget = { classList: createClassList() };
  registerTutorialTarget('world.canvas', highlightTarget);

  const game = {
    wave: 1,
    audio: {
      playPlacement() {
        game.playedPlacement = true;
      },
    },
    waveInProgress: false,
  };

  const steps = [
    {
      id: 'build',
      name: 'Build',
      wave: 1,
      highlight: ['world.canvas'],
      text: 'Build a tower',
      sound: { label: 'placement.wav', key: 'placement' },
      checkComplete: (_, context) => context.events.towerPlaced,
    },
    {
      id: 'start',
      name: 'Start Wave',
      wave: 2,
      highlight: [],
      text: 'Start the next wave',
      checkComplete: (_, context) => context.events.waveStarted,
    },
  ];

  const tutorial = createTutorial(game, {
    steps,
    overlayElements: { overlay, titleEl, textEl, imageEl, soundContainer, soundNameEl },
  });

  tutorial.start();
  assert.equal(titleEl.textContent, 'Build');
  assert.equal(textEl.textContent, 'Build a tower');
  assert.ok(overlayClassList.has('hidden') === false);
  assert.ok(highlightTarget.classList.has('tutorial-highlighted'));
  assert.equal(game.playedPlacement, true);

  tutorial.handleTowerPlaced();
  assert.ok(!highlightTarget.classList.has('tutorial-highlighted'));
  assert.ok(overlayClassList.has('hidden'));
  assert.ok(!tutorial.isComplete());

  game.wave = 2;
  tutorial.handlePreparationPhase(2);
  assert.equal(titleEl.textContent, 'Start Wave');
  assert.equal(textEl.textContent, 'Start the next wave');
  assert.ok(overlayClassList.has('hidden') === false);

  tutorial.handleWaveStarted();
  assert.ok(tutorial.isComplete());
  assert.ok(overlayClassList.has('hidden'));

  clearTutorialTargets();
});

test('tutorial reset with force clears persistent completion', () => {
  const {
    overlay,
    titleEl,
    textEl,
    imageEl,
    soundContainer,
    soundNameEl,
    overlayClassList,
  } = createOverlayElements();
  const game = { wave: 1, audio: {} };
  const steps = [
    {
      id: 'build',
      name: 'Build',
      wave: 1,
      highlight: [],
      text: 'Build a tower',
      checkComplete: (_, context) => context.events.towerPlaced,
    },
  ];
  let completions = 0;
  const tutorial = createTutorial(game, {
    steps,
    overlayElements: { overlay, titleEl, textEl, imageEl, soundContainer, soundNameEl },
    onComplete: () => {
      completions += 1;
    },
  });

  tutorial.start();
  tutorial.handleTowerPlaced();
  assert.equal(completions, 1);
  assert.ok(tutorial.isComplete());

  tutorial.reset();
  tutorial.start();
  assert.ok(overlayClassList.has('hidden'));

  tutorial.reset({ force: true });
  tutorial.start();
  assert.ok(overlayClassList.has('hidden') === false);
  completions = 0;
  tutorial.handleTowerPlaced();
  assert.equal(completions, 1);

  clearTutorialTargets();
});
