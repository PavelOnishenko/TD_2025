import gameConfig from '../config/gameConfig.js';
import { createSound } from './audio.js';
import {
    clearTutorialProgress,
    isTutorialMarkedComplete,
    markTutorialComplete,
} from './tutorialProgress.js';
import { resolveTutorialTargets } from './tutorialTargets.js';
import { translate } from './localization.js';

const DEFAULT_CHECK_INTERVAL = 320;
const SOUND_CACHE = new Map();

function createIntervalScheduler(interval = DEFAULT_CHECK_INTERVAL) {
    return (callback) => {
        if (typeof callback !== 'function') {
            return () => {};
        }
        if (typeof setInterval !== 'function' || typeof clearInterval !== 'function') {
            callback();
            return () => {};
        }
        const handle = setInterval(() => {
            try {
                callback();
            } catch (error) {
                console.warn('Tutorial check callback failed', error);
            }
        }, interval);
        return () => clearInterval(handle);
    };
}

function ensureOverlayStructure(doc, root) {
    if (!root || !doc) {
        return { root, panel: null, mediaWrapper: null, imageEl: null, titleEl: null, textEl: null };
    }
    const classList = root.classList;
    classList?.add('tutorial-overlay');
    if (!classList?.contains('hidden')) {
        classList?.add('hidden');
    }
    if (typeof root.setAttribute === 'function') {
        root.setAttribute('aria-live', 'polite');
        root.setAttribute('aria-hidden', 'true');
    }

    let backdrop = root.querySelector('.tutorial-overlay__backdrop');
    if (!backdrop && typeof doc.createElement === 'function') {
        backdrop = doc.createElement('div');
        backdrop.className = 'tutorial-overlay__backdrop';
        root.appendChild(backdrop);
    }

    let panel = root.querySelector('.tutorial-overlay__panel');
    if (!panel && typeof doc.createElement === 'function') {
        panel = doc.createElement('div');
        panel.className = 'tutorial-overlay__panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'false');
        root.appendChild(panel);
    }

    let mediaWrapper = panel?.querySelector('.tutorial-overlay__media');
    if (!mediaWrapper && panel && typeof doc.createElement === 'function') {
        mediaWrapper = doc.createElement('div');
        mediaWrapper.className = 'tutorial-overlay__media hidden';
        panel.insertBefore(mediaWrapper, panel.firstChild);
    }

    let imageEl = mediaWrapper?.querySelector('img');
    if (!imageEl && mediaWrapper && typeof doc.createElement === 'function') {
        imageEl = doc.createElement('img');
        imageEl.alt = '';
        imageEl.draggable = false;
        mediaWrapper.appendChild(imageEl);
    }

    let content = panel?.querySelector('.tutorial-overlay__content');
    if (!content && panel && typeof doc.createElement === 'function') {
        content = doc.createElement('div');
        content.className = 'tutorial-overlay__content';
        panel.appendChild(content);
    }

    let titleEl = content?.querySelector('.tutorial-overlay__title')
        ?? root.querySelector('#tutorialOverlayTitle');
    if (!titleEl && content && typeof doc.createElement === 'function') {
        titleEl = doc.createElement('h2');
        titleEl.className = 'tutorial-overlay__title';
        content.appendChild(titleEl);
    }

    let textEl = content?.querySelector('.tutorial-overlay__text')
        ?? root.querySelector('#tutorialOverlayText');
    if (!textEl && content && typeof doc.createElement === 'function') {
        textEl = doc.createElement('p');
        textEl.className = 'tutorial-overlay__text';
        content.appendChild(textEl);
    }

    return { root, panel, mediaWrapper, imageEl, titleEl, textEl };
}

function createDomOverlay(doc) {
    if (!doc || typeof doc.getElementById !== 'function') {
        return {
            show() {},
            hide() {},
            setHighlightState() {},
        };
    }

    let root = doc.getElementById('tutorialOverlay');
    let created = false;
    if (!root && typeof doc.createElement === 'function') {
        root = doc.createElement('div');
        root.id = 'tutorialOverlay';
        created = true;
    }

    const { mediaWrapper, imageEl, titleEl, textEl } = ensureOverlayStructure(doc, root);

    if (created && doc.body && typeof doc.body.appendChild === 'function') {
        doc.body.appendChild(root);
    }

    const classList = root?.classList ?? null;

    return {
        show(step) {
            if (!root) {
                return;
            }
            classList?.remove?.('hidden');
            root.setAttribute?.('aria-hidden', 'false');
            if (step?.id && root.dataset) {
                root.dataset.stepId = step.id;
            }
            if (titleEl && typeof titleEl.textContent === 'string') {
                titleEl.textContent = step?.name ?? '';
            }
            if (textEl && typeof textEl.textContent === 'string') {
                textEl.textContent = step?.text ?? '';
            }
            const picture = step?.picture;
            if (picture && imageEl) {
                imageEl.src = picture;
                mediaWrapper?.classList?.remove?.('hidden');
            } else {
                if (imageEl) {
                    imageEl.removeAttribute('src');
                }
                mediaWrapper?.classList?.add?.('hidden');
            }
        },
        hide() {
            if (!root) {
                return;
            }
            classList?.add?.('hidden');
            root.setAttribute?.('aria-hidden', 'true');
            if (root.dataset) {
                delete root.dataset.stepId;
            }
            mediaWrapper?.classList?.add?.('hidden');
            if (imageEl) {
                imageEl.removeAttribute('src');
            }
        },
        setHighlightState(active) {
            if (!root) {
                return;
            }
            root.classList?.toggle?.('tutorial-overlay--with-highlight', Boolean(active));
        },
        element: root,
    };
}

function defaultPlaySound(src) {
    if (!src) {
        return;
    }
    try {
        let sound = SOUND_CACHE.get(src);
        if (!sound) {
            sound = createSound({ src: [src], preload: true });
            SOUND_CACHE.set(src, sound);
        }
        if (!sound) {
            return;
        }
        if (typeof sound.stop === 'function') {
            sound.stop();
        }
        if (typeof sound.play === 'function') {
            sound.play();
        }
    } catch (error) {
        console.warn('Tutorial sound playback failed', error);
    }
}

function normalizeSteps(steps) {
    if (!Array.isArray(steps)) {
        return [];
    }
    return steps.map((step, index) => ({
        ...step,
        id: step?.id ?? `step-${index}`,
        name: step?.name ?? step?.title ?? '',
        text: step?.text ?? '',
        nameKey: typeof step?.nameKey === 'string' ? step.nameKey : null,
        textKey: typeof step?.textKey === 'string' ? step.textKey : null,
        wave: Number.isFinite(step?.wave) ? step.wave : 1,
        highlightTargets: Array.isArray(step?.highlightTargets) ? [...step.highlightTargets] : [],
        picture: step?.picture ?? step?.image ?? null,
        sound: step?.sound ?? null,
        checkComplete: typeof step?.checkComplete === 'function' ? step.checkComplete : () => true,
        done: Boolean(step?.done),
    }));
}

function getDefaultSteps() {
    return normalizeSteps(gameConfig?.tutorial?.steps ?? []);
}

function resolveStepName(step) {
    if (!step) {
        return '';
    }
    const fallback = typeof step.name === 'string' ? step.name : '';
    if (typeof step.nameKey === 'string' && step.nameKey) {
        return translate(step.nameKey, {}, fallback);
    }
    return fallback;
}

function resolveStepText(step) {
    if (!step) {
        return '';
    }
    const fallback = typeof step.text === 'string' ? step.text : '';
    if (typeof step.textKey === 'string' && step.textKey) {
        return translate(step.textKey, {}, fallback);
    }
    return fallback;
}

function createDisplayStep(step) {
    if (!step) {
        return null;
    }
    return {
        ...step,
        name: resolveStepName(step),
        text: resolveStepText(step),
    };
}

function shouldDisplayOverlay(step) {
    return Array.isArray(step?.highlightTargets) && step.highlightTargets.length > 0;
}

export function createTutorial(game, options = {}) {
    const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
    const overlay = options.ui ?? createDomOverlay(doc);
    const scheduleCheck = options.scheduleCheck ?? createIntervalScheduler(options.checkInterval);
    const playSound = typeof options.playSound === 'function' ? options.playSound : defaultPlaySound;
    const onComplete = options.onComplete ?? markTutorialComplete;
    const steps = normalizeSteps(options.steps ?? getDefaultSteps());

    const createInitialContext = () => ({
        towersPlaced: 0,
        colorSwitches: 0,
        wavesStarted: 0,
        merges: 0,
        removals: 0,
        enemyKills: 0,
        matchingKills: 0,
        energyGained: 0,
        energyEvents: 0,
        scoreGained: 0,
        scoreEvents: 0,
        scoreTotal: 0,
        wavesCleared: 0,
        currentStepId: null,
        stepShownAt: 0,
        lastAcknowledgedStepId: null,
        lastAcknowledgedAt: 0,
        acknowledgedSteps: new Set(),
    });

    const state = {
        steps,
        started: false,
        currentStep: null,
        currentDisplayStep: null,
        currentWave: Number.isFinite(game?.wave) ? game.wave : 1,
        waveInProgress: Boolean(game?.waveInProgress),
        persistentComplete: Boolean(options.initiallyComplete),
        highlighted: [],
        context: createInitialContext(),
    };

    if (state.persistentComplete) {
        state.steps.forEach(step => {
            step.done = true;
        });
    }

    let cancelCheck = null;

    const ensureAcknowledgedSteps = () => {
        if (!(state.context?.acknowledgedSteps instanceof Set)) {
            state.context.acknowledgedSteps = new Set();
        }
        return state.context.acknowledgedSteps;
    };

    const acknowledgeCurrentStep = () => {
        const step = state.currentStep;
        if (!step || !step.id) {
            return;
        }
        const acknowledged = ensureAcknowledgedSteps();
        if (!acknowledged.has(step.id)) {
            acknowledged.add(step.id);
            state.context.lastAcknowledgedStepId = step.id;
            state.context.lastAcknowledgedAt = Date.now();
        }
        evaluateCurrentStep();
    };

    if (overlay?.element && typeof overlay.element.addEventListener === 'function') {
        const handlePointer = () => acknowledgeCurrentStep();
        const handleKey = (event) => {
            if (!event) {
                return;
            }
            const key = event.key;
            if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
                acknowledgeCurrentStep();
            }
        };
        overlay.element.addEventListener('click', handlePointer);
        overlay.element.addEventListener('pointerdown', handlePointer);
        overlay.element.addEventListener('keydown', handleKey);
    }

    function stopCheckLoop() {
        if (typeof cancelCheck === 'function') {
            cancelCheck();
        }
        cancelCheck = null;
    }

    function clearHighlights() {
        if (!Array.isArray(state.highlighted)) {
            state.highlighted = [];
            overlay?.setHighlightState?.(false);
            return;
        }
        state.highlighted.forEach(element => {
            element?.classList?.remove?.('tutorial-highlighted');
        });
        state.highlighted = [];
        overlay?.setHighlightState?.(false);
    }

    function applyHighlights(step) {
        clearHighlights();
        if (!step || !Array.isArray(step.highlightTargets) || step.highlightTargets.length === 0) {
            return;
        }
        const elements = resolveTutorialTargets(step.highlightTargets);
        elements.forEach(element => {
            element?.classList?.add?.('tutorial-highlighted');
        });
        state.highlighted = elements;
        overlay?.setHighlightState?.(elements.length > 0);
    }

    function hideOverlay() {
        overlay?.hide?.();
        clearHighlights();
        stopCheckLoop();
        if (state.context) {
            state.context.currentStepId = null;
        }
        state.currentDisplayStep = null;
    }

    function ensureCheckLoop() {
        if (cancelCheck || typeof scheduleCheck !== 'function') {
            return;
        }
        cancelCheck = scheduleCheck(() => evaluateCurrentStep());
    }

    function getNextAvailableStep() {
        return state.steps.find(step => !step.done && step.wave <= state.currentWave) ?? null;
    }

    function finalizeCompletion() {
        const complete = state.steps.length > 0
            ? state.steps.every(step => step.done)
            : true;
        if (complete) {
            if (!state.persistentComplete) {
                state.persistentComplete = true;
                try {
                    onComplete?.(state.steps);
                } catch (error) {
                    console.warn('Tutorial completion callback failed', error);
                }
            }
            hideOverlay();
        }
        return complete;
    }

    function showStep(step) {
        if (!step) {
            return;
        }
        state.currentStep = step;
        const displayStep = createDisplayStep(step);
        state.currentDisplayStep = displayStep;
        if (shouldDisplayOverlay(step)) {
            overlay?.show?.(displayStep);
        } else {
            overlay?.hide?.();
        }
        applyHighlights(step);
        playSound(step.sound);
        ensureCheckLoop();
        ensureAcknowledgedSteps().delete(step.id);
        state.context.currentStepId = step.id;
        state.context.stepShownAt = Date.now();
        evaluateCurrentStep();
    }

    function maybeShowNextStep() {
        if (!state.started || state.persistentComplete) {
            return;
        }
        if (state.waveInProgress) {
            hideOverlay();
            return;
        }
        if (state.currentStep && !state.currentStep.done) {
            return;
        }
        const next = getNextAvailableStep();
        if (!next) {
            hideOverlay();
            return;
        }
        showStep(next);
    }

    function refreshCurrentStepLocalization() {
        if (!state.currentStep || !state.currentDisplayStep) {
            return;
        }
        const displayStep = createDisplayStep(state.currentStep);
        state.currentDisplayStep = displayStep;
        if (shouldDisplayOverlay(state.currentStep)) {
            overlay?.show?.(displayStep);
        } else {
            overlay?.hide?.();
        }
        applyHighlights(state.currentStep);
    }

    function evaluateCurrentStep() {
        const step = state.currentStep;
        if (!step || step.done) {
            return false;
        }
        let complete = false;
        if (typeof step.checkComplete === 'function') {
            try {
                complete = Boolean(step.checkComplete(game, state.context));
            } catch (error) {
                console.warn(`Tutorial step "${step.id}" check failed`, error);
                complete = false;
            }
        }
        if (!complete) {
            return false;
        }
        step.done = true;
        hideOverlay();
        const finished = finalizeCompletion();
        if (!finished) {
            maybeShowNextStep();
        }
        return true;
    }

    function syncProgressWithGame(currentGame = game) {
        if (!currentGame) {
            return;
        }
        const context = state.context ?? createInitialContext();
        state.context = context;

        const towersCount = Array.isArray(currentGame.towers) ? currentGame.towers.length : 0;
        context.towersPlaced = Math.max(context.towersPlaced, towersCount);
        const waveStarted = Boolean(currentGame.waveInProgress)
            || (typeof currentGame.wave === 'number' && currentGame.wave > 1)
            || ((currentGame.spawned ?? 0) > 0);
        if (waveStarted) {
            context.wavesStarted = Math.max(context.wavesStarted, 1);
            context.colorSwitches = Math.max(context.colorSwitches, 1);
        }
        const currentWave = Number.isFinite(currentGame.wave) ? currentGame.wave : state.currentWave;
        state.currentWave = currentWave;
        state.waveInProgress = Boolean(currentGame.waveInProgress);

        const currentEnergy = Number.isFinite(currentGame.energy) ? currentGame.energy : 0;
        const initialEnergy = Number.isFinite(currentGame.initialEnergy) ? currentGame.initialEnergy : currentEnergy;
        const energyDelta = Math.max(0, currentEnergy - initialEnergy);
        context.energyGained = Math.max(context.energyGained, energyDelta);
        if (context.energyGained > 0) {
            context.energyEvents = Math.max(context.energyEvents, 1);
        }

        const score = Number.isFinite(currentGame.score) ? Math.max(0, Math.floor(currentGame.score)) : 0;
        const bestScore = Number.isFinite(currentGame.bestScore) ? Math.max(0, Math.floor(currentGame.bestScore)) : 0;
        context.scoreTotal = Math.max(context.scoreTotal, score, bestScore);
        if (context.scoreTotal > 0) {
            context.scoreEvents = Math.max(context.scoreEvents, 1);
        }

        const clearedWaves = Math.max(0, Math.floor(currentWave) - 1);
        context.wavesCleared = Math.max(context.wavesCleared, clearedWaves);

        state.steps.forEach(step => {
            if (step.done || typeof step.checkComplete !== 'function') {
                return;
            }
            let shouldComplete = false;
            try {
                shouldComplete = Boolean(step.checkComplete(currentGame, context));
            } catch (error) {
                console.warn(`Tutorial step "${step.id}" sync failed`, error);
            }
            if (shouldComplete) {
                step.done = true;
            }
        });
        if (finalizeCompletion()) {
            return;
        }
        if (state.started && !state.waveInProgress) {
            maybeShowNextStep();
        } else if (state.waveInProgress) {
            hideOverlay();
        }
    }

    function resetContext() {
        state.context = createInitialContext();
    }

    return {
        start() {
            if (state.persistentComplete) {
                state.started = false;
                hideOverlay();
                return;
            }
            state.started = true;
            state.currentWave = Number.isFinite(game?.wave) ? game.wave : state.currentWave;
            state.waveInProgress = Boolean(game?.waveInProgress);
            maybeShowNextStep();
        },

        reset(options = {}) {
            const force = Boolean(options.force);
            hideOverlay();
            stopCheckLoop();
            state.started = false;
            state.currentStep = null;
            state.waveInProgress = Boolean(game?.waveInProgress);
            state.currentWave = Number.isFinite(game?.wave) ? game.wave : 1;
            resetContext();
            if (force || !state.persistentComplete) {
                state.steps.forEach(step => {
                    step.done = false;
                });
                if (force) {
                    state.persistentComplete = false;
                }
            } else {
                state.steps.forEach(step => {
                    step.done = true;
                });
            }
        },

        handleTowerPlaced() {
            state.context.towersPlaced += 1;
            evaluateCurrentStep();
        },

        handleColorSwitch() {
            state.context.colorSwitches += 1;
            evaluateCurrentStep();
        },

        handleTowerMerged(details = {}) {
            state.context.merges += 1;
            if (details?.color) {
                state.context.lastMergeColor = details.color;
            }
            evaluateCurrentStep();
        },

        handleTowerRemoved(details = {}) {
            state.context.removals += 1;
            if (details?.cause) {
                state.context.lastRemovalCause = details.cause;
            }
            evaluateCurrentStep();
        },

        handleEnemyKilled(details = {}) {
            state.context.enemyKills += 1;
            if (details?.match) {
                state.context.matchingKills += 1;
            }
            evaluateCurrentStep();
        },

        handleEnergyGained(amount = 0) {
            const gain = Number.isFinite(amount) ? Math.max(0, amount) : 0;
            if (gain > 0) {
                state.context.energyGained += gain;
                state.context.energyEvents += 1;
            }
            evaluateCurrentStep();
        },

        handleScoreChanged(total = 0, details = {}) {
            const normalizedTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
            state.context.scoreTotal = Math.max(state.context.scoreTotal, normalizedTotal);
            const delta = Number.isFinite(details?.delta) ? details.delta : 0;
            if (delta > 0) {
                state.context.scoreGained += delta;
                state.context.scoreEvents += 1;
            } else if (normalizedTotal > 0) {
                state.context.scoreEvents = Math.max(state.context.scoreEvents, 1);
            }
            evaluateCurrentStep();
        },

        handleWaveCompleted(waveNumber) {
            if (Number.isFinite(waveNumber)) {
                state.context.wavesCleared = Math.max(state.context.wavesCleared, waveNumber);
            }
            evaluateCurrentStep();
        },

        handleWaveStarted() {
            state.context.wavesStarted += 1;
            state.waveInProgress = true;
            const completed = evaluateCurrentStep();
            if (!completed) {
                hideOverlay();
            }
        },

        handleWavePreparation(waveNumber) {
            if (Number.isFinite(waveNumber)) {
                state.currentWave = waveNumber;
            }
            state.waveInProgress = false;
            if (state.started) {
                maybeShowNextStep();
            }
        },

        syncWithGame: syncProgressWithGame,

        isComplete() {
            return state.steps.every(step => step.done);
        },

        getCurrentStep() {
            return state.currentStep;
        },

        clearProgress() {
            state.persistentComplete = false;
            state.steps.forEach(step => {
                step.done = false;
            });
            resetContext();
            hideOverlay();
        },

        refreshLocalization() {
            refreshCurrentStepLocalization();
        },

        _state: state,
    };
}

export function attachTutorial(game, options = {}) {
    const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
    const alreadyComplete = isTutorialMarkedComplete();
    const tutorial = createTutorial(game, {
        document: doc,
        steps: options.steps,
        initiallyComplete: alreadyComplete,
        onComplete: steps => {
            markTutorialComplete();
            options.onComplete?.(steps);
        },
        scheduleCheck: options.scheduleCheck,
        playSound: options.playSound,
        ui: options.ui,
    });
    tutorial.reset();
    tutorial.syncWithGame(game);
    tutorial.handleWavePreparation?.(Number.isFinite(game?.wave) ? game.wave : 1);
    game.tutorial = tutorial;
    game.resetTutorialProgress = () => {
        clearTutorialProgress();
        tutorial.clearProgress();
        tutorial.reset({ force: true });
        tutorial.handleWavePreparation?.(Number.isFinite(game?.wave) ? game.wave : 1);
    };
    game.refreshTutorialLocalization = () => {
        tutorial.refreshLocalization?.();
    };
    return tutorial;
}

export default createTutorial;
