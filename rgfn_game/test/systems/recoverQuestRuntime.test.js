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

function createQuestWithKnownAndUnknownContracts() {
  return {
    id: 'main',
    title: 'Main',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    children: [
      {
        id: 'barter-complete',
        title: 'Completed barter',
        description: '',
        conditionText: '',
        objectiveType: 'barter',
        entities: [{ text: 'Olive', type: 'person' }, { text: 'Kator Kaesh', type: 'item' }],
        children: [],
        isCompleted: true,
      },
      {
        id: 'escort-active',
        title: 'Active escort',
        description: '',
        conditionText: '',
        objectiveType: 'escort',
        entities: [{ text: 'Bram', type: 'person' }, { text: 'Farwatch', type: 'location' }],
        objectiveData: { escort: { personName: 'Bram', sourceVillage: 'Mossbrook', destinationVillage: 'Farwatch' } },
        children: [],
        isCompleted: false,
      },
      {
        id: 'future-deliver',
        title: 'Future delivery',
        description: '',
        conditionText: '',
        objectiveType: 'deliver',
        entities: [],
        objectiveData: { deliver: { sourceTrader: 'Cora', itemName: 'Void Relic', sourceVillage: 'Silent Reach', destinationVillage: 'North Cross' } },
        children: [],
        isCompleted: false,
      },
    ],
    isCompleted: false,
  };
}

function createKnownDefendQuest() {
  return {
    id: 'main',
    title: 'Main',
    description: '',
    conditionText: '',
    objectiveType: 'scout',
    entities: [],
    children: [
      {
        id: 'defend-active',
        title: 'Defend Heights Gate',
        description: '',
        conditionText: '',
        objectiveType: 'defend',
        entities: [
          { text: 'Heights Gate', type: 'location' },
          { text: 'Quinn Evans', type: 'person' },
        ],
        objectiveData: {
          defend: {
            villageName: 'Heights Gate',
            artifactName: 'Allies Coverage',
            contactName: 'Quinn Evans',
            durationDays: 3,
            timeRemainingMinutes: 4320,
            isDefenseActive: false,
            defenders: [],
            fallenDefenderNames: [],
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

test('GameQuestRuntime exposes contracts only from known quest nodes (in-progress + completed)', () => {
  const runtime = new GameQuestRuntime();
  const quest = createQuestWithKnownAndUnknownContracts();

  const barter = runtime['collectBarterContracts'](quest);
  const escort = runtime['collectEscortContracts'](quest);

  assert.equal(barter.some((contract) => contract.traderName === 'Olive'), true);
  assert.equal(barter.some((contract) => contract.traderName === 'Cora'), false);
  assert.equal(escort.some((contract) => contract.personName === 'Bram'), true);
});

test('GameQuestRuntime exposes only known quest location names for dialogue knowledge', () => {
  const runtime = new GameQuestRuntime();
  const quest = createQuestWithKnownAndUnknownContracts();

  runtime.activeQuest = quest;
  const locations = runtime.getKnownQuestLocationNames();

  assert.deepEqual(locations, ['Farwatch']);
});

test('GameQuestRuntime exposes defend contracts for known active defend objectives', () => {
  const runtime = new GameQuestRuntime();
  const quest = createKnownDefendQuest();

  const defendContracts = runtime['collectDefendContracts'](quest);

  assert.deepEqual(defendContracts, [
    {
      personName: 'Quinn Evans',
      villageName: 'Heights Gate',
      artifactName: 'Allies Coverage',
      activeDefenderNames: [],
      fallenDefenderNames: [],
    },
  ]);
});

test('GameQuestRuntime records fallen defenders and exposes them in defend contracts', () => {
  const runtime = new GameQuestRuntime();
  const quest = createKnownDefendQuest();
  runtime.activeQuest = quest;
  runtime.questUiController = { renderQuest: () => {} };

  quest.children[0].objectiveData.defend.isDefenseActive = true;
  quest.children[0].objectiveData.defend.defenders = [
    { name: 'Mara', level: 2, maxHp: 10, currentHp: 10, inventoryItemIds: ['knife_t1'] },
    { name: 'Tor', level: 2, maxHp: 9, currentHp: 9, inventoryItemIds: ['armor_t1'] },
  ];

  const lines = runtime.applyDefenderBattleResults('Heights Gate', [{ name: 'Tor', hp: 4 }]);
  assert.equal(lines.some((line) => line.includes('Mara was killed')), true);

  const defendContracts = runtime['collectDefendContracts'](quest);
  assert.equal(defendContracts[0].fallenDefenderNames.includes('Mara'), true);
  assert.deepEqual(defendContracts[0].activeDefenderNames, ['Tor']);
});

test('GameQuestRuntime spawns full-health defend allies at derived max HP and keeps wounded values', () => {
  const runtime = new GameQuestRuntime();
  const defender = {
    name: 'Vara',
    level: 3,
    maxHp: 12,
    currentHp: 12,
    inventoryItemIds: [],
    stats: {
      damage: 4,
      armor: 1,
      mana: 0,
      vitality: 5,
      toughness: 0,
      strength: 0,
      agility: 0,
      connection: 0,
      intelligence: 0,
    },
  };

  const allyAtFullHp = runtime.createVillageCombatantFromDefender(defender);
  assert.equal(allyAtFullHp.hp, allyAtFullHp.maxHp);
  assert.equal(allyAtFullHp.maxHp > defender.maxHp, true);

  const woundedAlly = runtime.createVillageCombatantFromDefender({ ...defender, currentHp: 7 });
  assert.equal(woundedAlly.hp, 7);
});

test('GameQuestRuntime persists defender maxHp from combat survivors after battle', () => {
  const runtime = new GameQuestRuntime();
  const quest = createKnownDefendQuest();
  runtime.activeQuest = quest;
  runtime.questUiController = { renderQuest: () => {} };

  quest.children[0].objectiveData.defend.isDefenseActive = true;
  quest.children[0].objectiveData.defend.defenders = [
    { name: 'Mara', level: 2, maxHp: 10, currentHp: 10, inventoryItemIds: [] },
  ];

  runtime.applyDefenderBattleResults('Heights Gate', [{ name: 'Mara', hp: 14, maxHp: 16 }]);
  assert.equal(quest.children[0].objectiveData.defend.defenders[0].maxHp, 16);
  assert.equal(quest.children[0].objectiveData.defend.defenders[0].currentHp, 14);
});
