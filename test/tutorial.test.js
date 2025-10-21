import test from 'node:test';
import assert from 'node:assert/strict';
import { createTutorial, DEFAULT_TUTORIAL_STEPS } from '../js/systems/tutorial.js';

test('tutorial progresses through steps based on events', () => {
  const events = [];
  const tutorial = createTutorial({
    renderTip: text => events.push(['show', text]),
    hideTip: () => events.push(['hide']),
  });

  tutorial.start();
  assert.deepEqual(events.at(-1), ['show', DEFAULT_TUTORIAL_STEPS[0].text]);

  tutorial.handleTowerPlaced();
  assert.deepEqual(events.at(-1), ['show', DEFAULT_TUTORIAL_STEPS[1].text]);

  tutorial.handleColorSwitch();
  assert.deepEqual(events.at(-1), ['show', DEFAULT_TUTORIAL_STEPS[2].text]);

  tutorial.handleWaveStarted();
  assert.deepEqual(events.at(-1), ['hide']);
  assert.ok(tutorial.isComplete());
});

test('tutorial reset hides tip and restarts from first step', () => {
  const events = [];
  const tutorial = createTutorial({
    renderTip: text => events.push(['show', text]),
    hideTip: () => events.push(['hide']),
  });

  tutorial.start();
  tutorial.handleTowerPlaced();
  tutorial.handleColorSwitch();
  events.length = 0;
  tutorial.reset();
  assert.deepEqual(events.at(-1), ['hide']);
  tutorial.start();
  assert.deepEqual(events.at(-1), ['show', DEFAULT_TUTORIAL_STEPS[0].text]);
});

test('tutorial sync skips steps when game already progressed', () => {
  const events = [];
  const tutorial = createTutorial({
    renderTip: text => events.push(['show', text]),
    hideTip: () => events.push(['hide']),
  });

  tutorial.syncWithGame({ towers: [{}], wave: 3, waveInProgress: false, spawned: 0 });
  tutorial.start();
  assert.deepEqual(events.at(-1), ['hide']);
  assert.ok(tutorial.isComplete());
});

test('tutorial start is skipped when already complete', () => {
  let shown = false;
  const tutorial = createTutorial({
    renderTip: () => {
      shown = true;
    },
    hideTip: () => {},
    initiallyComplete: true,
  });

  tutorial.start();
  assert.equal(shown, false);
  tutorial.reset();
  tutorial.start();
  assert.equal(shown, false);
});

test('forcing reset clears completion and allows tutorial to restart', () => {
  const events = [];
  let completions = 0;
  const tutorial = createTutorial({
    renderTip: text => events.push(['show', text]),
    hideTip: () => events.push(['hide']),
    onComplete: () => {
      completions += 1;
    },
  });

  tutorial.start();
  tutorial.handleTowerPlaced();
  tutorial.handleColorSwitch();
  tutorial.handleWaveStarted();
  assert.equal(completions, 1);
  events.length = 0;

  tutorial.reset({ force: true });
  tutorial.start();
  assert.deepEqual(events.at(-1), ['show', DEFAULT_TUTORIAL_STEPS[0].text]);
  tutorial.handleTowerPlaced();
  tutorial.handleColorSwitch();
  tutorial.handleWaveStarted();
  assert.equal(completions, 2);
});
