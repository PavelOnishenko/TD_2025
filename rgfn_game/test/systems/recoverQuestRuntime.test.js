import test from 'node:test';
import assert from 'node:assert/strict';

import GameQuestRuntime from '../../dist/game/runtime/GameQuestRuntime.js';
import QuestProgressTracker from '../../dist/systems/quest/QuestProgressTracker.js';

function createRecoverQuest() {
  return {
    id: 'main',
    title: 'Main',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    children: [
      {
        id: 'main.1',
        title: 'Recover Torva',
        description: 'Retrieve Torva from Thalthalira Harbor.',
        conditionText: 'Obtain Torva at Thalthalira Harbor.',
        objectiveType: 'recover',
        entities: [
          { text: 'Torva', type: 'item' },
          { text: 'Thalthalira Harbor', type: 'location' },
        ],
        objectiveData: {
          recover: {
            itemName: 'Torva',
            personName: 'Ilyan',
            initialVillage: 'Thalthalira Harbor',
            currentVillage: 'Thalthalira Harbor',
            isPersonKnown: false,
            hasFled: false,
          },
        },
        children: [],
        isCompleted: false,
      },
    ],
    isCompleted: false,
  };
}

test('GameQuestRuntime revealRecoverHolder confirms target person when speaking with another villager', () => {
  const runtime = new GameQuestRuntime();
  const quest = createRecoverQuest();
  const renders = [];

  runtime.activeQuest = quest;
  runtime.questProgressTracker = new QuestProgressTracker(quest);
  runtime.questUiController = { renderQuest: (value) => renders.push(value) };

  const result = runtime.revealRecoverHolder('Thalthalira Harbor', 'Harbor Watchman');

  assert.equal(result.revealed, true);
  assert.equal(result.personName, 'Ilyan');
  assert.equal(quest.children[0].objectiveData.recover.isPersonKnown, true);
  assert.equal(renders.length, 1);
});

test('GameQuestRuntime moves recover holder to another village when confrontation ends with flee', () => {
  const runtime = new GameQuestRuntime();
  const quest = createRecoverQuest();
  const logs = [];

  runtime.activeQuest = quest;
  runtime.questProgressTracker = new QuestProgressTracker(quest);
  runtime.questUiController = { renderQuest: () => {} };

  quest.children[0].objectiveData.recover.isPersonKnown = true;
  const start = runtime.startRecoverConfrontation('Ilyan', 'Thalthalira Harbor');
  assert.equal(start.status, 'started');

  const lines = runtime.resolveRecoverBattle('fled', {
    getAllVillageNames: () => ['Thalthalira Harbor', 'New Dawn', 'Evermoor'],
  }, {
    addItemToInventory: () => true,
  });

  logs.push(...lines);
  assert.equal(quest.children[0].objectiveData.recover.currentVillage === 'Thalthalira Harbor', false);
  assert.equal(quest.children[0].objectiveData.recover.hasFled, true);
  assert.equal(logs.length >= 1, true);
  assert.equal(quest.children[0].description.includes('fled'), true);
});

test('GameQuestRuntime completes recover objective and grants item after victory', () => {
  const runtime = new GameQuestRuntime();
  const quest = createRecoverQuest();
  const inventory = [];

  runtime.activeQuest = quest;
  runtime.questProgressTracker = new QuestProgressTracker(quest);
  runtime.questUiController = { renderQuest: () => {} };

  quest.children[0].objectiveData.recover.isPersonKnown = true;
  const start = runtime.startRecoverConfrontation('Ilyan', 'Thalthalira Harbor');
  assert.equal(start.status, 'started');

  runtime.resolveRecoverBattle('victory', {
    getAllVillageNames: () => ['Thalthalira Harbor', 'New Dawn'],
  }, {
    addItemToInventory: (item) => {
      inventory.push(item.name);
      return true;
    },
  });

  assert.equal(quest.children[0].isCompleted, true);
  assert.equal(inventory.includes('Torva'), true);
});
