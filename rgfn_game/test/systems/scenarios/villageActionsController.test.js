import test from 'node:test';
import assert from 'node:assert/strict';

import VillageActionsController from '../../../dist/systems/village/VillageActionsController.js';

function createClassList() {
  const classes = new Set();
  return {
    added: [],
    removed: [],
    add(name) {
      this.added.push(name);
      classes.add(name);
    },
    remove(name) {
      this.removed.push(name);
      classes.delete(name);
    },
    toggle(name, force) {
      if (typeof force === 'boolean') {
        if (force) {
          this.add(name);
          return true;
        }
        this.remove(name);
        return false;
      }
      if (classes.has(name)) {
        this.remove(name);
        return false;
      }
      this.add(name);
      return true;
    },
    contains(name) {
      return classes.has(name);
    },
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
    rumorsPanel: createElement(),
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
    confrontRecoverBtn: createElement('button'),
    recruitEscortBtn: createElement('button'),
    defendVillageBtn: createElement('button'),
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

function withDeveloperMode(enabled, fn) {
  const originalWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: () => JSON.stringify({
        enabled,
        everythingDiscovered: enabled,
        fogOfWar: true,
        questIntroEnabled: !enabled,
        encounterTypes: { monster: true, item: true, traveler: true },
        autoGodBoostOnCharacterCreation: enabled,
      }),
      setItem: () => {},
    },
  };

  try {
    fn();
  } finally {
    globalThis.window = originalWindow;
  }
}

test('VillageActionsController keeps village rumor NPC roster stable across re-entry to same village', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
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

test('VillageActionsController shows village actions + rumors on entry and hides both on exit', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, createElement(), {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller.enterVillage('Mossbrook');
  assert.equal(villageUI.actions.classList.contains('hidden'), false);
  assert.equal(villageUI.rumorsPanel.classList.contains('hidden'), false);
  assert.equal(villageUI.sidebar.classList.contains('hidden'), true);

  controller.exitVillage();
  assert.equal(villageUI.actions.classList.contains('hidden'), true);
  assert.equal(villageUI.rumorsPanel.classList.contains('hidden'), true);
}));

test('VillageActionsController stores separate rumor rosters for different villages', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
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
    onAdvanceTime: () => {},
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
    onAdvanceTime: () => {},
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

test('VillageActionsController injects defend contact NPC into the target village roster', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'north', distanceCells: 3 }),
    onVillageBarterCompleted: () => {},
    onTryStartDefend: () => ({ status: 'inactive' }),
  });

  controller.configureQuestDefendContracts([
    { personName: 'Quinn Evans', villageName: 'Heights Gate', artifactName: 'Allies Coverage' },
  ]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'heights-0', name: 'Mara', role: 'Carpenter', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Heights Gate');
  const names = controller['npcRoster'].map((npc) => npc.name);
  assert.equal(names.includes('Quinn Evans'), true);
}));

test('VillageActionsController adds revealed recover holder into current village roster immediately', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    onRevealRecoverHolder: () => ({ revealed: true, personName: 'Pablo Menéndez', itemName: 'Torva' }),
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Tor', role: 'Carpenter', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Thalthalira Harbor');
  controller.handleSelectNpc(0);

  const names = controller['npcRoster'].map((npc) => npc.name);
  assert.equal(names.includes('Pablo Menéndez'), true);
}));

test('VillageActionsController confront button starts recover battle for selected holder', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  let startedBattle = false;
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
    onLeaveVillage: () => {},
    onRevealRecoverHolder: () => ({ revealed: true, personName: 'Pablo Menéndez', itemName: 'Torva' }),
    onTryStartRecoverConfrontation: () => ({ status: 'started', enemies: [{ id: 'recover-enemy' }], itemName: 'Torva' }),
    onStartBattle: () => { startedBattle = true; },
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Tor', role: 'Carpenter', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Thalthalira Harbor');
  controller.handleSelectNpc(0);
  controller.handleSelectNpc(0);
  controller.handleConfrontRecoverTarget();

  assert.equal(startedBattle, true);
}));

test('VillageActionsController mirrors dialogue lines into modal log and toggles modal visibility', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
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

test('VillageActionsController hides undiscovered settlement and person targets when developer mode is off', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'west', distanceCells: 4 }),
    getKnownSettlementNames: () => ['Mossbrook', 'Questspire'],
    getKnownQuestSettlementNames: () => ['Golder Bridge', 'Distant Cove'],
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([
    { traderName: 'Olive', itemName: 'Kator Kaesh', sourceVillage: 'Mossbrook' },
    { traderName: 'Cora', itemName: 'Void Relic', sourceVillage: 'Farwatch' },
  ]);
  controller.configureQuestEscortContracts([{ personName: 'Bram', sourceVillage: 'Mossbrook', destinationVillage: 'Farwatch' }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  const settlementOptions = villageUI.askVillageInput.options.map((option) => option.value);
  const personOptions = villageUI.askPersonInput.options.map((option) => option.value);

  assert.deepEqual(settlementOptions, ['Distant Cove', 'Golder Bridge', 'Mossbrook', 'Questspire']);
  assert.deepEqual(personOptions, ['Bram', 'Mara', 'Olive']);
}));

test('VillageActionsController shows undiscovered settlement and person targets in developer mode', () => withDeveloperMode(true, () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: true, direction: 'west', distanceCells: 4 }),
    getKnownSettlementNames: () => ['Mossbrook', 'Questspire'],
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([
    { traderName: 'Olive', itemName: 'Kator Kaesh', sourceVillage: 'Mossbrook' },
    { traderName: 'Cora', itemName: 'Void Relic', sourceVillage: 'Farwatch' },
  ]);
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
  assert.deepEqual(personOptions, ['Bram', 'Cora', 'Mara', 'Olive']);
})));

test('VillageActionsController allows safe room sleep only with innkeeper selected', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const player = createPlayerStub();
  player.gold = 20;
  let recovered = 0;
  player.recoverFatigue = (value) => { recovered = value; return value; };

  const controller = new VillageActionsController(player, villageUI, gameLog, {
    onUpdateHUD: () => {},
    onAdvanceTime: () => {},
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

test('VillageActionsController shows contextual dialogue action buttons only when available for selected NPC', () => withDocumentStub(() => {
  const villageUI = createVillageUi();
  const gameLog = createElement();
  const controller = new VillageActionsController(createPlayerStub(), villageUI, gameLog, {
    onUpdateHUD: () => {},
    onLeaveVillage: () => {},
    onTryRecruitEscort: () => 'not-available',
    getVillageDirectionHint: (settlementName) => ({ settlementName, exists: false }),
    onVillageBarterCompleted: () => {},
  });

  controller.configureQuestBarterContracts([{ traderName: 'Olive', itemName: 'Kator Kaesh', sourceVillage: 'Mossbrook' }]);
  controller.configureQuestEscortContracts([{ personName: 'Olive', sourceVillage: 'Mossbrook', destinationVillage: 'Farwatch' }]);
  controller['dialogueEngine'] = {
    createNpcRoster: () => [{ id: 'moss-0', name: 'Mara', role: 'Trader', look: 'cloak', speechStyle: 'calm', disposition: 'truthful' }],
    buildLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
    buildPersonLocationAnswer: () => ({ speech: '', tone: '', truthfulness: 'truth' }),
  };

  controller.enterVillage('Mossbrook');
  assert.equal(villageUI.barterNowBtn.classList.contains('hidden'), true);
  assert.equal(villageUI.confrontRecoverBtn.classList.contains('hidden'), true);
  assert.equal(villageUI.recruitEscortBtn.classList.contains('hidden'), true);

  const oliveIndex = controller['npcRoster'].findIndex((npc) => npc.name === 'Olive');
  controller.handleSelectNpc(oliveIndex);
  assert.equal(villageUI.barterNowBtn.classList.contains('hidden'), false);
  assert.equal(villageUI.recruitEscortBtn.classList.contains('hidden'), false);
  assert.equal(villageUI.confrontRecoverBtn.classList.contains('hidden'), true);

  controller['callbacks'].onRevealRecoverHolder = () => ({ revealed: true, personName: 'Pablo Menéndez', itemName: 'Torva' });
  controller.handleSelectNpc(oliveIndex);
  const recoverIndex = controller['npcRoster'].findIndex((npc) => npc.name === 'Pablo Menéndez');
  controller.handleSelectNpc(recoverIndex);
  assert.equal(villageUI.confrontRecoverBtn.classList.contains('hidden'), false);
}));
