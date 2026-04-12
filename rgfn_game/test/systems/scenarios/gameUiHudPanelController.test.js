import test from 'node:test';
import assert from 'node:assert/strict';

import GameUiHudPanelController from '../../../dist/systems/game/ui/GameUiHudPanelController.js';

const WORLD_KEY = 'rgfn_hud_panel_layout_world_v1';
const BATTLE_KEY = 'rgfn_hud_panel_layout_battle_v1';

function createClassList(initialHidden = false) {
  const classes = new Set(initialHidden ? ['hidden'] : []);
  return {
    add(name) { classes.add(name); },
    remove(name) { classes.delete(name); },
    contains(name) { return classes.has(name); },
    toggle(name, force) {
      if (force === true) {
        classes.add(name);
        return true;
      }
      if (force === false) {
        classes.delete(name);
        return false;
      }
      if (classes.has(name)) {
        classes.delete(name);
        return false;
      }
      classes.add(name);
      return true;
    },
  };
}

function createElement(label = '', { hidden = false } = {}) {
  return {
    label,
    textContent: '',
    title: '',
    dataset: {},
    children: [],
    listeners: {},
    className: '',
    classList: createClassList(hidden),
    style: {
      width: '',
      height: '',
      zIndex: '',
      values: new Map(),
      setProperty(name, value) { this.values.set(name, value); },
      removeProperty(name) {
        this.values.delete(name);
        if (name === 'z-index') {
          this.zIndex = '';
        }
      },
    },
    setAttribute() {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
    removeEventListener(type) { delete this.listeners[type]; },
    append(...children) { this.children.push(...children); },
    prepend(child) { this.children.unshift(child); },
    querySelector(selector) {
      if (selector !== '.panel-window-header') {
        return null;
      }
      return this.children.find((child) => child.className === 'panel-window-header') ?? null;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 240, height: 180 };
    },
    setPointerCapture() {},
  };
}

function createHudElements() {
  const statsPanel = createElement('stats');
  const skillsPanel = createElement('skills');
  const inventoryPanel = createElement('inventory');
  const magicPanel = createElement('magic');
  const questsPanel = createElement('quests');
  const groupPanel = createElement('group');
  const lorePanel = createElement('lore');
  const selectedPanel = createElement('selected');
  const worldMapPanel = createElement('worldMap');
  const logPanel = createElement('log');
  const battleActionsPanel = createElement('battleActions');
  const villageActionsPanel = createElement('villageActions');
  const villageRumorsPanel = createElement('villageRumors');

  const modeIndicator = createElement('mode');
  modeIndicator.textContent = 'World Map';

  return {
    modeIndicator,
    hudMenuToggleBtn: createElement('menu-toggle'),
    hudMenuPanel: createElement('menu'),
    toggleStatsPanelBtn: createElement('toggle-stats'),
    toggleSkillsPanelBtn: createElement('toggle-skills'),
    toggleInventoryPanelBtn: createElement('toggle-inventory'),
    toggleMagicPanelBtn: createElement('toggle-magic'),
    toggleQuestsPanelBtn: createElement('toggle-quests'),
    toggleGroupPanelBtn: createElement('toggle-group'),
    toggleLorePanelBtn: createElement('toggle-lore'),
    toggleSelectedPanelBtn: createElement('toggle-selected'),
    toggleWorldMapPanelBtn: createElement('toggle-world-map'),
    toggleLogPanelBtn: createElement('toggle-log'),
    statsPanel,
    skillsPanel,
    inventoryPanel,
    magicPanel,
    questsPanel,
    groupPanel,
    lorePanel,
    selectedPanel,
    worldMapPanel,
    logPanel,
    battleActionsPanel,
    villageActionsPanel,
    villageRumorsPanel,
  };
}

function createMockDocument(hudElements) {
  const idMap = {
    'battle-sidebar': hudElements.battleActionsPanel,
    'village-actions': hudElements.villageActionsPanel,
    'village-rumors-section': hudElements.villageRumorsPanel,
  };

  return {
    createElement: () => createElement('dynamic'),
    getElementById(id) { return idMap[id] ?? null; },
  };
}

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, value); },
  };
}

test('GameUiHudPanelController stores separate panel layouts for world map and battle contexts', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalMutationObserver = global.MutationObserver;
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const observers = [];

  global.window = { localStorage: createLocalStorage() };
  const hudElements = createHudElements();
  global.document = createMockDocument(hudElements);
  global.requestAnimationFrame = (callback) => callback();
  global.MutationObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    trigger() { this.callback(); }
  };

  try {
    const controller = new GameUiHudPanelController(hudElements, {
      onTogglePanel(panel) {
        const key = `${panel}Panel`;
        hudElements[key].classList.toggle('hidden');
      },
    });
    controller.bind();

    const statsPanel = hudElements.statsPanel;
    const dragHandle = statsPanel.children[0].children[0];

    dragHandle.listeners.pointerdown({ button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() {} });
    dragHandle.listeners.pointermove({ clientX: 120, clientY: 40 });
    dragHandle.listeners.pointerup();

    const savedWorld = JSON.parse(global.window.localStorage.getItem(WORLD_KEY));
    assert.equal(savedWorld.stats.offsetX, 144);
    assert.equal(savedWorld.stats.offsetY, 136);

    hudElements.modeIndicator.textContent = 'Battle!';
    observers.forEach((observer) => observer.target === hudElements.modeIndicator && observer.trigger());

    dragHandle.listeners.pointerdown({ button: 0, pointerId: 2, clientX: 0, clientY: 0, preventDefault() {} });
    dragHandle.listeners.pointermove({ clientX: -12, clientY: -6 });
    dragHandle.listeners.pointerup();

    const savedBattle = JSON.parse(global.window.localStorage.getItem(BATTLE_KEY));
    assert.equal(savedBattle.stats.offsetX, 12);
    assert.equal(savedBattle.stats.offsetY, 90);

    hudElements.modeIndicator.textContent = 'World Map';
    observers.forEach((observer) => observer.target === hudElements.modeIndicator && observer.trigger());

    assert.equal(hudElements.statsPanel.dataset.offsetX, '144');
    assert.equal(hudElements.statsPanel.dataset.offsetY, '136');
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
    global.MutationObserver = originalMutationObserver;
    global.requestAnimationFrame = originalRequestAnimationFrame;
  }
});

test('GameUiHudPanelController persists panel hidden state on toggle', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalMutationObserver = global.MutationObserver;
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  global.window = { localStorage: createLocalStorage() };
  const hudElements = createHudElements();
  global.document = createMockDocument(hudElements);
  global.requestAnimationFrame = (callback) => callback();
  global.MutationObserver = class {
    constructor() {}
    observe() {}
  };

  try {
    const controller = new GameUiHudPanelController(hudElements, {
      onTogglePanel(panel) {
        const key = `${panel}Panel`;
        hudElements[key].classList.toggle('hidden');
      },
    });
    controller.bind();

    hudElements.toggleStatsPanelBtn.listeners.click();
    const savedWorld = JSON.parse(global.window.localStorage.getItem(WORLD_KEY));
    assert.equal(savedWorld.stats.hidden, true);
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
    global.MutationObserver = originalMutationObserver;
    global.requestAnimationFrame = originalRequestAnimationFrame;
  }
});

test('GameUiHudPanelController repositions off-screen village panels back into viewport during restore', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalMutationObserver = global.MutationObserver;
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  const storage = createLocalStorage();
  storage.setItem(WORLD_KEY, JSON.stringify({
    villageActions: {
      offsetX: -1800,
      offsetY: -1200,
      width: null,
      height: null,
      hidden: false,
      zIndex: null,
    },
  }));

  global.window = { localStorage: storage, innerWidth: 1280, innerHeight: 720 };
  const hudElements = createHudElements();
  hudElements.villageActionsPanel.getBoundingClientRect = () => ({ left: -1600, top: -900, width: 320, height: 260, right: -1280, bottom: -640 });
  global.document = createMockDocument(hudElements);
  global.requestAnimationFrame = (callback) => callback();
  global.MutationObserver = class {
    constructor() {}
    observe() {}
  };

  try {
    const controller = new GameUiHudPanelController(hudElements, { onTogglePanel() {} });
    controller.bind();

    const adjustedX = Number.parseFloat(hudElements.villageActionsPanel.dataset.offsetX);
    const adjustedY = Number.parseFloat(hudElements.villageActionsPanel.dataset.offsetY);
    assert.ok(adjustedX > -1800);
    assert.ok(adjustedY > -1200);
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
    global.MutationObserver = originalMutationObserver;
    global.requestAnimationFrame = originalRequestAnimationFrame;
  }
});

test('GameUiHudPanelController keeps combat actions panel hidden outside battle mode', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalMutationObserver = global.MutationObserver;
  const originalRequestAnimationFrame = global.requestAnimationFrame;
  const observers = [];

  global.window = { localStorage: createLocalStorage() };
  const hudElements = createHudElements();
  global.document = createMockDocument(hudElements);
  global.requestAnimationFrame = (callback) => callback();
  global.MutationObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    trigger() { this.callback(); }
  };

  try {
    const controller = new GameUiHudPanelController(hudElements, { onTogglePanel() {} });
    controller.bind();

    assert.equal(hudElements.battleActionsPanel.classList.contains('hidden'), true);

    hudElements.modeIndicator.textContent = 'Battle!';
    observers.forEach((observer) => observer.target === hudElements.modeIndicator && observer.trigger());
    assert.equal(hudElements.battleActionsPanel.classList.contains('hidden'), false);

    hudElements.modeIndicator.textContent = 'Village';
    observers.forEach((observer) => observer.target === hudElements.modeIndicator && observer.trigger());
    assert.equal(hudElements.battleActionsPanel.classList.contains('hidden'), true);
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
    global.MutationObserver = originalMutationObserver;
    global.requestAnimationFrame = originalRequestAnimationFrame;
  }
});
