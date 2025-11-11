import gameConfig from '../config/gameConfig.js';
import { createSound } from './audio.js';
import {
    clearTutorialProgress,
    isTutorialMarkedComplete,
    markTutorialComplete,
} from './tutorialProgress.js';
import { resolveTutorialTargets } from './tutorialTargets.js';

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

export function createTutorial(game, options = {}) {
    const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
    const overlay = options.ui ?? createDomOverlay(doc);
    const scheduleCheck = options.scheduleCheck ?? createIntervalScheduler(options.checkInterval);
    const playSound = typeof options.playSound === 'function' ? options.playSound : defaultPlaySound;
    const onComplete = options.onComplete ?? markTutorialComplete;
    const steps = normalizeSteps(options.steps ?? getDefaultSteps());

    const state = {
        steps,
        started: false,
        currentStep: null,
        currentWave: Number.isFinite(game?.wave) ? game.wave : 1,
        waveInProgress: Boolean(game?.waveInProgress),
        persistentComplete: Boolean(options.initiallyComplete),
        highlighted: [],
        context: {
            towersPlaced: 0,
            colorSwitches: 0,
            wavesStarted: 0,
        },
    };

    if (state.persistentComplete) {
        state.steps.forEach(step => {
            step.done = true;
        });
    }

    let cancelCheck = null;

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
        overlay?.show?.(step);
        applyHighlights(step);
        playSound(step.sound);
        ensureCheckLoop();
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
        const towersCount = Array.isArray(currentGame.towers) ? currentGame.towers.length : 0;
        state.context.towersPlaced = Math.max(state.context.towersPlaced, towersCount);
        const waveStarted = Boolean(currentGame.waveInProgress)
            || (typeof currentGame.wave === 'number' && currentGame.wave > 1)
            || ((currentGame.spawned ?? 0) > 0);
        if (waveStarted) {
            state.context.wavesStarted = Math.max(state.context.wavesStarted, 1);
            state.context.colorSwitches = Math.max(state.context.colorSwitches, 1);
        }
        state.currentWave = Number.isFinite(currentGame.wave) ? currentGame.wave : state.currentWave;
        state.waveInProgress = Boolean(currentGame.waveInProgress);
        state.steps.forEach(step => {
            if (step.done || typeof step.checkComplete !== 'function') {
                return;
            }
            let shouldComplete = false;
            try {
                shouldComplete = Boolean(step.checkComplete(currentGame, state.context));
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
        state.context.towersPlaced = 0;
        state.context.colorSwitches = 0;
        state.context.wavesStarted = 0;
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
    return tutorial;
}

export default createTutorial;
