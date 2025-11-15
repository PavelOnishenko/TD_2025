import test from 'node:test';
import assert from 'node:assert/strict';
import { bindUI } from '../js/systems/ui.js';
import { clearTutorialTargets } from '../js/systems/tutorialTargets.js';

function createStubElement(tagName = 'div') {
  const children = [];
  const attributes = {};
  const dataset = {};
  const style = {};
  const classSet = new Set();
  const element = {
    tagName,
    children,
    attributes,
    dataset,
    style,
    isFragment: tagName === 'fragment',
    parent: null,
    id: '',
    textContent: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute(name, value) {
      attributes[name] = value;
    },
    removeAttribute(name) {
      delete attributes[name];
    },
    appendChild(child) {
      children.push(child);
      child.parent = element;
      return child;
    },
    insertBefore(child, reference) {
      const index = reference ? children.indexOf(reference) : -1;
      if (index >= 0) {
        children.splice(index, 0, child);
      } else {
        children.unshift(child);
      }
      child.parent = element;
      return child;
    },
    replaceChildren(...nodes) {
      children.length = 0;
      nodes.forEach(node => {
        if (!node) {
          return;
        }
        if (node.isFragment) {
          node.children.forEach(child => {
            children.push(child);
            child.parent = element;
          });
        } else {
          children.push(node);
          node.parent = element;
        }
      });
    },
    querySelector(selector) {
      const match = (target) => {
        if (!target) {
          return false;
        }
        if (selector.startsWith('.')) {
          return target.classList?.contains(selector.slice(1));
        }
        if (selector.startsWith('#')) {
          return target.id === selector.slice(1);
        }
        return false;
      };
      for (const child of children) {
        if (match(child)) {
          return child;
        }
        const nested = child.querySelector?.(selector);
        if (nested) {
          return nested;
        }
      }
      return null;
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  };

  const classList = {
    add(cls) {
      classSet.add(cls);
    },
    remove(cls) {
      classSet.delete(cls);
    },
    toggle(cls, force) {
      if (force === undefined) {
        if (classSet.has(cls)) {
          classSet.delete(cls);
        } else {
          classSet.add(cls);
        }
        return;
      }
      if (force) {
        classSet.add(cls);
      } else {
        classSet.delete(cls);
      }
    },
    contains(cls) {
      return classSet.has(cls);
    },
  };

  Object.defineProperty(element, 'className', {
    get() {
      return Array.from(classSet).join(' ');
    },
    set(value) {
      classSet.clear();
      if (typeof value === 'string') {
        value.split(/\s+/).filter(Boolean).forEach(cls => classSet.add(cls));
      }
    },
  });

  Object.defineProperty(element, 'classList', {
    value: classList,
    enumerable: true,
  });

  Object.defineProperty(element, 'firstChild', {
    get() {
      return children[0] ?? null;
    },
  });

  return element;
}

function createStubDocument() {
  const elements = new Map();
  const body = createStubElement('body');

  return {
    body,
    getElementById(id) {
      return elements.get(id) ?? null;
    },
    createElement(tagName) {
      return createStubElement(tagName);
    },
    createDocumentFragment() {
      return createStubElement('fragment');
    },
    register(id, element) {
      element.id = id;
      elements.set(id, element);
      return element;
    },
  };
}

function createButtonStub() {
  const button = createStubElement('button');
  button.disabled = false;
  return button;
}

test('bindUI wires HUD elements and tutorial overlay', () => {
  const doc = createStubDocument();
  const overlay = doc.register('tutorialOverlay', createStubElement('div'));
  overlay.classList.add('hidden');

  const ids = [
    'lives', 'energy', 'scorePanel', 'score', 'bestScore', 'wavePanel', 'wave', 'wavePhase',
    'endlessIndicator', 'status', 'nextWave', 'restart', 'muteToggle', 'musicToggle',
    'mergeTowers', 'pause', 'startOverlay', 'startGame', 'endOverlay', 'endMenu', 'endMessage',
    'endDetail', 'endScore', 'endBestScore', 'endRestart', 'pauseOverlay', 'pauseMessage',
    'resumeGame', 'diagnosticsOverlay', 'saveControls', 'saveGame', 'loadGame', 'deleteSave',
  ];

  ids.forEach(id => {
    const el = id === 'nextWave' || id === 'restart' || id === 'startGame' || id === 'endRestart'
      ? createButtonStub()
      : createStubElement('div');
    if (id === 'nextWave') {
      el.disabled = true;
    }
    doc.register(id, el);
  });

  const game = {
    canvas: {
      addEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    },
    towers: [],
    grid: { resetCells: () => {}, fadeHighlights: () => {} },
    lives: 5,
    energy: 20,
    wave: 1,
    maxWaves: 10,
    towerCost: 12,
    getAllCells: () => [],
    switchTowerColor: () => false,
    startWave: () => {},
    persistState: () => {},
    restart: () => {},
    run: () => {},
    resume: () => {},
    waveInProgress: false,
  };

  const previousDocument = global.document;
  const previousWindow = global.window;
  global.document = doc;
  global.window = { addEventListener: () => {}, removeEventListener: () => {} };

  try {
    bindUI(game);
    assert.ok(game.tutorial);
    assert.equal(game.livesEl, doc.getElementById('lives'));
    assert.equal(overlay.classList.contains('hidden'), true);

    game.tutorial.start();
    game.tutorial.handleWavePreparation(1);
    assert.equal(overlay.classList.contains('hidden'), false);
    assert.equal(overlay.dataset.stepId, 'story-intro');
    const title = overlay.querySelector('.tutorial-overlay__title');
    assert.ok(title);
    assert.notEqual(title.textContent, '');
  } finally {
    game.tutorial?.reset?.({ force: true });
    clearTutorialTargets();
    global.document = previousDocument;
    global.window = previousWindow;
  }
});
