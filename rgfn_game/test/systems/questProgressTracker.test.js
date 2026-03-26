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
        isCompleted: false,
      },
      {
        id: 'main.2',
        title: 'Escort Mira',
        description: '',
        conditionText: '',
        objectiveType: 'escort',
        entities: [{ text: 'Fog Chapel', type: 'location' }],
        children: [],
        isCompleted: false,
      },
      {
        id: 'main.3',
        title: 'Barter with Olive',
        description: 'Negotiate with Olive and exchange for Kator Kaesh.',
        conditionText: 'Complete one barter deal and obtain Kator Kaesh.',
        objectiveType: 'barter',
        entities: [{ text: 'Olive', type: 'person' }, { text: 'Kator Kaesh', type: 'item' }],
        children: [],
        isCompleted: false,
      },
      {
        id: 'main.4',
        title: 'Purge Torka Kaquin Pack',
        description: 'Remove 2 Torka Kaquins near Oakcross.',
        conditionText: 'Kill 2 Torka Kaquins near Oakcross.',
        objectiveType: 'eliminate',
        entities: [{ text: 'Torka Kaquin', type: 'monster' }, { text: 'Oakcross', type: 'location' }],
        objectiveData: {
          monster: {
            targetName: 'Torka Kaquin',
            requiredKills: 2,
            currentKills: 0,
            villageName: 'Oakcross',
            mutations: ['acid blood', 'grave intellect'],
          },
        },
        children: [],
        isCompleted: false,
      },
    ],
    isCompleted: false,
  };
}

test('QuestProgressTracker marks location-based travel objectives as complete when entering the village', () => {
  const quest = createQuest();
  const tracker = new QuestProgressTracker(quest);

  const changed = tracker.recordLocationEntry('Oakcross');

  assert.equal(changed, true);
  assert.equal(quest.children[0].isCompleted, true);
  assert.equal(quest.children[1].isCompleted, false);
  assert.equal(quest.children[2].isCompleted, false);
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

test('QuestProgressTracker marks barter objectives complete only when trader and item match', () => {
  const quest = createQuest();
  const tracker = new QuestProgressTracker(quest);

  const wrongItem = tracker.recordBarterCompletion('Olive', 'Other Artifact');
  const correctDeal = tracker.recordBarterCompletion('Olive', 'Kator Kaesh');
  const duplicate = tracker.recordBarterCompletion('Olive', 'Kator Kaesh');

  assert.equal(wrongItem, false);
  assert.equal(correctDeal, true);
  assert.equal(duplicate, false);
  assert.equal(quest.children[2].isCompleted, true);
});

test('QuestProgressTracker tracks monster kill counts and active purge objective progress', () => {
  const quest = createQuest();
  const tracker = new QuestProgressTracker(quest);

  const firstKill = tracker.recordMonsterKill('torka kaquin');
  const active = tracker.getActiveMonsterObjectives();
  const secondKill = tracker.recordMonsterKill('Torka Kaquin');

  assert.equal(firstKill, true);
  assert.equal(active.length, 1);
  assert.equal(active[0].targetName, 'Torka Kaquin');
  assert.equal(active[0].remainingKills, 1);
  assert.deepEqual(active[0].mutations, ['acid blood', 'grave intellect']);
  assert.equal(secondKill, true);
  assert.equal(quest.children[3].isCompleted, true);
});
