import test from 'node:test';
import assert from 'node:assert/strict';

import QuestProgressTracker from '../../dist/systems/quest/QuestProgressTracker.js';

function createQuest() {
  return {
    id: 'main',
    title: 'Quindra',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    children: [
      {
        id: 'main.1',
        title: 'Scout Oakcross',
        description: 'Travel to Oakcross and secure the path.',
        conditionText: 'Enter Oakcross.',
        objectiveType: 'travel',
        entities: [{ text: 'Oakcross', type: 'location' }],
        children: [],
      },
      {
        id: 'main.2',
        title: 'Escort Mira',
        description: '',
        conditionText: '',
        objectiveType: 'escort',
        entities: [{ text: 'Fog Chapel', type: 'location' }],
        children: [],
      },
    ],
  };
}

test('QuestProgressTracker marks location-based travel objectives as complete when entering the village', () => {
  const quest = createQuest();
  const tracker = new QuestProgressTracker(quest);

  const changed = tracker.recordLocationEntry('Oakcross');

  assert.equal(changed, true);
  assert.equal(quest.children[0].isCompleted, true);
  assert.equal(quest.children[1].isCompleted, false);
  assert.equal(quest.isCompleted, false);
});

test('QuestProgressTracker location matching is case-insensitive and idempotent', () => {
  const quest = createQuest();
  const tracker = new QuestProgressTracker(quest);

  const first = tracker.recordLocationEntry('oakCROSS');
  const second = tracker.recordLocationEntry('Oakcross');

  assert.equal(first, true);
  assert.equal(second, false);
});
