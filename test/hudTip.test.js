import test from 'node:test';
import assert from 'node:assert/strict';
import { bindUI } from '../js/systems/ui.js';

function createClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: cls => classes.add(cls),
    remove: cls => classes.delete(cls),
    toggle(cls, force) {
      if (typeof force === 'boolean') {
        if (force) {
          classes.add(cls);
        } else {
          classes.delete(cls);
        }
        return;
      }
      if (classes.has(cls)) {
        classes.delete(cls);
      } else {
        classes.add(cls);
      }
    },
    has: cls => classes.has(cls),
  };
}

function createElement(options = {}) {
  const element = {
    classList: createClassList(options.classes ?? []),
    textContent: options.textContent ?? '',
    hidden: Boolean(options.hidden),
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    disabled: false,
  };
  if (options.withValue) {
    element.value = options.value ?? '';
  }
  return element;
}

function createButton() {
  return {
    classList: createClassList(),
    textContent: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    disabled: false,
  };
}

test('bindUI attaches HUD and tutorial overlay', () => {
  const elements = {};
  const registerElement = (id, element) => {
    elements[id] = element;
    return element;
  };
  registerElement('lives', createElement());
  registerElement('energy', createElement());
  registerElement('scorePanel', createElement());
  registerElement('score', createElement());
  registerElement('bestScore', createElement());
  registerElement('wavePanel', createElement());
  registerElement('wave', createElement());
  registerElement('wavePhase', createElement());
  registerElement('endlessIndicator', createElement());
  registerElement('status', createElement());
  registerElement('nextWave', createButton());
  registerElement('restart', createButton());
  registerElement('muteToggle', createButton());
  registerElement('musicToggle', createButton());
  registerElement('mergeTowers', createButton());
  registerElement('pause', createButton());
  registerElement('startOverlay', createElement({ classes: ['hidden'] }));
  registerElement('startGame', createButton());
  registerElement('endOverlay', createElement({ classes: ['hidden'] }));
  registerElement('endMenu', createElement());
  registerElement('endMessage', createElement());
  registerElement('endDetail', createElement());
  registerElement('endScore', createElement());
  registerElement('endBestScore', createElement());
  registerElement('endRestart', createButton());
  registerElement('pauseOverlay', createElement({ classes: ['hidden'] }));
  registerElement('pauseMessage', createElement());
  registerElement('resumeGame', createButton());
  registerElement('diagnosticsOverlay', createElement({ classes: ['diagnostics--hidden'] }));
  registerElement('saveControls', createElement({ classes: ['save-controls--hidden'] }));
  registerElement('saveGame', createButton());
  registerElement('loadGame', createButton());
  registerElement('deleteSave', createButton());
  registerElement('crazyGamesUser', createElement({ classes: ['hidden'] }));
  registerElement('crazyGamesUsername', createElement());
  registerElement('crazyGamesUserAvatar', createElement());
  registerElement('tutorialOverlay', createElement({ classes: ['hidden'] }));
  registerElement('tutorialWindow', createElement());
  registerElement('tutorialTitle', createElement());
  registerElement('tutorialText', createElement());
  registerElement('tutorialImage', createElement({ hidden: true }));
  registerElement('tutorialSound', createElement({ hidden: true }));
  registerElement('tutorialSoundName', createElement());

  const doc = {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElement();
      }
      return elements[id];
    },
  };

  const canvas = {
    classList: createClassList(),
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  };

  const game = {
    canvas,
    towers: [],
    grid: { resetCells: () => {}, fadeHighlights: () => {}, getAllCells: () => [] },
    lives: 5,
    energy: 20,
    wave: 1,
    maxWaves: 10,
    towerCost: 12,
    switchTowerColor: () => false,
    startWave: () => {},
    restart: () => {},
    run: () => {},
    persistState: () => {},
    manualMergeTowers: () => {},
    setAudioMuted: () => {},
    setMusicEnabled: () => {},
  };

  global.document = doc;
  bindUI(game);

  assert.ok(game.tutorial);
  assert.ok(elements.tutorialOverlay.classList.has('hidden'));

  game.tutorial.start();
  assert.equal(elements.tutorialTitle.textContent, 'Build Your First Tower');
  assert.ok(elements.tutorialOverlay.classList.has('hidden') === false);

  game.tutorial.reset({ force: true });

  delete global.document;
});
