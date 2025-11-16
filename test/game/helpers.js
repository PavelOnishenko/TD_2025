import Game from '../../js/core/Game.js';
import Tower from '../../js/entities/Tower.js';

function createContextStub() {
    return {
        fillRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        drawImage: () => {},
        fillText: () => {},
        save: () => {},
        restore: () => {},
        setTransform: () => {},
        set globalCompositeOperation(_) {},
    };
}

function createClassList() {
    return { add: () => {}, remove: () => {}, toggle: () => {} };
}

export function makeFakeCanvas({ width = 450, height = 800 } = {}) {
    return {
        width,
        height,
        getContext: () => createContextStub(),
    };
}

export function attachDomStubs(game) {
    game.livesEl = { textContent: '' };
    game.energyEl = { textContent: '' };
    game.scorePanelEl = { setAttribute: () => {} };
    game.scoreEl = { textContent: '', setAttribute: () => {} };
    game.bestScoreEl = { textContent: '', setAttribute: () => {} };
    game.waveEl = { textContent: '' };
    game.wavePhaseEl = { textContent: '', classList: createClassList() };
    game.wavePanelEl = { dataset: {}, classList: createClassList() };
    game.endlessIndicatorEl = { classList: createClassList(), setAttribute: () => {} };
    game.statusEl = { textContent: '', style: {} };
    game.nextWaveBtn = { disabled: false };
    game.mergeBtn = { disabled: false };
    game.upgradeBtn = {
        disabled: false,
        classList: createClassList(),
        setAttribute: () => {},
        removeAttribute: () => {},
        addEventListener: () => {},
        querySelector: () => null,
        hidden: false,
        title: '',
    };
    game.pauseBtn = { disabled: false, textContent: '', setAttribute: () => {} };
    game.cooldownEl = { textContent: '' };
    game.endOverlay = { classList: createClassList() };
    game.endMenu = { classList: createClassList() };
    game.endMessageEl = { textContent: '' };
    game.endDetailEl = { textContent: '' };
    game.pauseOverlay = { classList: createClassList() };
    game.pauseMessageEl = { textContent: '' };
    game.resumeBtn = { disabled: false, textContent: '' };
    game.endScoreEl = { textContent: '' };
    game.endBestScoreEl = { textContent: '' };
    game.saveControlsEl = { classList: createClassList(), dataset: {} };
    const createSaveButton = () => ({ disabled: false, addEventListener: () => {} });
    game.saveBtn = createSaveButton();
    game.loadBtn = createSaveButton();
    game.deleteSaveBtn = createSaveButton();
}

export function createGame({ attachDom = false, disableFormations = false } = {}) {
    const game = new Game(makeFakeCanvas());
    if (disableFormations) {
        game.formationManager = null;
        game.activeFormationPlan = null;
        game.waveSpawnSchedule = null;
    }
    if (attachDom) {
        attachDomStubs(game);
    }
    return game;
}

export function placeTowerOnCell(game, cell, { color = 'red', level = 1 } = {}) {
    const tower = new Tower(cell.x, cell.y, color, level);
    tower.alignToCell(cell);
    tower.cell = cell;
    cell.tower = tower;
    cell.occupied = true;
    game.towers.push(tower);
    return tower;
}

export function withMockedRandom(sequence, callback) {
    const originalRandom = Math.random;
    let index = 0;
    Math.random = () => sequence[index++ % sequence.length];
    try {
        return callback();
    } finally {
        Math.random = originalRandom;
    }
}

export function withReplacedMethod(target, key, replacement, run) {
    const original = target[key];
    target[key] = replacement;
    try {
        return run();
    } finally {
        target[key] = original;
    }
}

export function withFakeDataClient(client, run) {
    const original = globalThis.CrazyGames;
    globalThis.CrazyGames = { SDK: { data: client } };
    try {
        return run();
    } finally {
        globalThis.CrazyGames = original;
    }
}

