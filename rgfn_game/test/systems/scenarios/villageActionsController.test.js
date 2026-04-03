import test from 'node:test';
import assert from 'node:assert/strict';

import VillageActionsController from '../../../dist/systems/village/VillageActionsController.js';

function createClassList() {
  return {
    added: [],
    removed: [],
    add(name) { this.added.push(name); },
    remove(name) { this.removed.push(name); },
  };
}

function createElement(tag = 'div') {
  return {
    tag,
    type: '',
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    options: [],
    listeners: {},
    classList: createClassList(),
    children: [],
    scrollTop: 0,
    scrollHeight: 0,
    appendChild(child) {
      this.children.push(child);
      if (this.tag === 'select') {
        this.options.push(child);
      }
      this.scrollHeight += 1;
      return child;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  };
}

function createVillageUi() {
  return {
    sidebar: createElement(),
    title: createElement(),
    prompt: createElement(),
    actions: createElement(),
    openDialogueBtn: createElement('button'),
    sleepRoomBtn: createElement('button'),
    dialogueModal: createElement(),
    dialogueCloseBtn: createElement('button'),
    dialogueSelectedNpc: createElement(),
    dialogueLog: createElement(),
    buyOffer1Btn: createElement('button'),
    buyOffer2Btn: createElement('button'),
    buyOffer3Btn: createElement('button'),
    buyOffer4Btn: createElement('button'),
    sellSelect: createElement('select'),
    sellSelectedBtn: createElement('button'),
    npcList: createElement(),
    npcTitle: createElement(),
    askVillageInput: createElement('select'),
    askVillageBtn: createElement('button'),
    askNearbySettlementsBtn: createElement('button'),
    askPersonInput: createElement('select'),
    askPersonBtn: createElement('button'),
    askBarterBtn: createElement('button'),
    barterNowBtn: createElement('button'),
    leaveBtn: createElement('button'),
  };
}

function createPlayerStub() {
  const inventory = [];
  return {
    gold: 50,
    addItemToInventory: (item) => { inventory.push(item); return true; },
    removeInventoryItemAt: (index) => inventory.splice(index, 1)[0] ?? null,
    getInventory: () => [...inventory],
    heal: () => {},
    restoreMana: () => {},
    recoverFatigue: () => 0,
  };
}

function withDocumentStub(fn) {
  const original = globalThis.document;
  globalThis.document = {
    createElement: (tag) => createElement(tag),
  };

  try {
    fn();
  } finally {
    globalThis.document = original;
  }
}

test('VillageActionsController keeps village rumor NPC roster stable across re-entry to same village', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  let createNpcRosterCalls = 0;
  controller['dialogueEngine'] = {
    createNpcRoster: (villageName) => {
      createNpcRosterCalls += 1;
      if (villageName === 'Mossbrook') {
        return [
          { id: 'mossbrook-0', name: 'Mara', role: 'Trader', look: 'patched vest', speechStyle: 'calm', disposition: 'truthful' },
          { id: 'mossbrook-1', name: 'Tor', role: 'Hunter', look: 'old armor', speechStyle: 'cold', disposition: 'liar' },
        ];
      }

      return [{ id: 'other-0', name: 'Iven', role: 'Miller', look: 'cloak', speechStyle: 'warm', disposition: 'imprecise' }];
    },
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const firstRoster = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  controller.enterVillage('Mossbrook');
  const secondRoster = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  assert.deepEqual(secondRoster, firstRoster);
  assert.equal(createNpcRosterCalls, 1);
}));

test('VillageActionsController stores separate rumor rosters for different villages', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: (villageName) => villageName === 'Mossbrook'
      ? [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'satchel', speechStyle: 'calm', disposition: 'truthful' }]
      : [{ id: 'oak-0', name: 'Garr', role: 'Carpenter', look: 'boots', speechStyle: 'formal', disposition: 'silent' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const mossbrookRoster = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  controller.enterVillage('Oakhaven');
  const oakhavenRoster = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  controller.enterVillage('Mossbrook');
  const mossbrookAgain = controller['npcRoster'].map((npc) => `${npc.name}:${npc.role}`);

  assert.notDeepEqual(oakhavenRoster, mossbrookRoster);
  assert.deepEqual(mossbrookAgain, mossbrookRoster);
}));

test('VillageActionsController injects Olive into first visited village and keeps roster stable', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });
  controller.configureQuestBarterContracts([{ traderName: 'Olive', itemName: 'Kator Kaesh' }]);

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'other-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const names = controller['npcRoster'].map((npc) => npc.name);
  assert.equal(names.includes('Olive'), true);

  controller.enterVillage('Mossbrook');
  const secondNames = controller['npcRoster'].map((npc) => npc.name);
  assert.deepEqual(secondNames, names);
}));

test('VillageActionsController binds dynamically generated barter trader names without hardcoded NPC names', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'north', distanceCells: 5 }),
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([{ traderName: 'Veyra', itemName: 'Night Sigil' }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const names = controller['npcRoster'].map((npc) => npc.name);
  assert.equal(names.includes('Veyra'), true);
  const hint = controller['barterService'].getPersonDirectionHint('Veyra', controller['callbacks'].getVillageDirectionHint);
  assert.equal(hint.exists, true);
  assert.equal(hint.villageName, 'Mossbrook');
}));

test('VillageActionsController mirrors dialogue lines into modal log and toggles modal visibility', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleEnter('Mossbrook');
  assert.equal(villageUI.openDialogueBtn.disabled, true);
  controller.handleSelectNpc(0);
  assert.equal(villageUI.openDialogueBtn.disabled, false);
  controller.openDialogueWindow();
  assert.equal(villageUI.dialogueModal.classList.removed.includes('hidden'), true);

  controller.addLog('Modal mirror check', 'system');
  assert.equal(gameLog.children.some((child) => child.textContent === 'Modal mirror check'), true);
  assert.equal(villageUI.dialogueLog.children.some((child) => child.textContent === 'Modal mirror check'), true);

  controller.closeDialogueWindow();
  assert.equal(villageUI.dialogueModal.classList.added.includes('hidden'), true);
}));

test('VillageActionsController populates settlement and person selects from known map and quest data', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    getKnownSettlementNames: () => ['Mossbrook', 'Questspire'],
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([{ traderName: 'Olive', itemName: 'Kator Kaesh' }]);
  controller.configureQuestEscortContracts([{ personName: 'Bram', sourceVillage: 'Mossbrook', destinationVillage: 'Farwatch' }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const settlementOptions = villageUI.askVillageInput.options.map((option) => option.value);
  const personOptions = villageUI.askPersonInput.options.map((option) => option.value);

  assert.deepEqual(settlementOptions, ['Farwatch', 'Mossbrook', 'Questspire']);
  assert.deepEqual(personOptions, ['Bram', 'Mara', 'Olive']);
}));

test('VillageActionsController allows safe room sleep only with innkeeper selected', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const player = createPlayerStub();
  player.gold = 20;
  let recovered = 0;
  player.recoverFatigue = (value) => { recovered = value; return value; };

  const controller = new VillageActionsController(player, villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'inn-0', name: 'Mara', role: 'Innkeeper', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleEnter('Mossbrook');
  controller.handleSelectNpc(0);
  controller.handleSleepInRoom();

  assert.equal(recovered > 0, true);
  assert.equal(player.gold < 20, true);
}));

test('VillageActionsController asks NPC about nearby settlements via dialogue engine', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'north', distanceCells: 7 }),
    getKnownSettlementNames: () => ['Mossbrook', 'Farwatch'],
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildNearbySettlementsAnswer: () => ({ speech: 'Nearby list.', tone: 'Confident tone.', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  controller.handleSelectNpc(0);
  controller.handleAskAboutNearbySettlements();

  assert.equal(gameLog.children.some((child) => child.textContent.includes('Nearby list.')), true);
}));
