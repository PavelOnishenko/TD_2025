import gameConfig from '../config/gameConfig.js';
import {
    clearTutorialProgress,
    isTutorialMarkedComplete,
    markTutorialComplete,
} from './tutorialProgress.js';
import {
    resolveTutorialTargets,
} from './tutorialTargets.js';

const DEFAULT_POLL_INTERVAL = 250;
const HIGHLIGHT_CLASS = 'tutorial-highlighted';

function normalizeSound(sound) {
    if (!sound) {
        return null;
    }
    if (typeof sound === 'string') {
        return { label: sound, key: sound };
    }
    if (typeof sound === 'object') {
        const label = typeof sound.label === 'string'
            ? sound.label
            : typeof sound.key === 'string'
                ? sound.key
                : '';
        const key = typeof sound.key === 'string' ? sound.key : null;
        const play = typeof sound.play === 'function' ? sound.play : null;
        return { label, key, play };
    }
    return null;
}

function normalizeStep(step, index) {
    const highlight = Array.isArray(step?.highlight) ? [...step.highlight] : [];
    const checkComplete = typeof step?.checkComplete === 'function'
        ? step.checkComplete
        : () => true;
    const image = typeof step?.image === 'string' && step.image.length > 0
        ? step.image
        : null;
    const imageAlt = typeof step?.imageAlt === 'string' ? step.imageAlt : '';
    return {
        id: step?.id ?? `tutorial-step-${index + 1}`,
        name: step?.name ?? '',
        text: step?.text ?? '',
        wave: Number.isFinite(step?.wave) ? step.wave : 1,
        highlight,
        checkComplete,
        image,
        imageAlt,
        sound: normalizeSound(step?.sound),
        done: Boolean(step?.done),
    };
}

function triggerSound(game, sound) {
    if (!sound) {
        return;
    }
    if (sound.play) {
        try {
            sound.play(game);
            return;
        } catch (error) {
            console.warn('Tutorial sound handler failed.', error);
        }
    }
    if (!sound.key) {
        return;
    }
    const methodName = sound.key.startsWith('play')
        ? sound.key
        : `play${sound.key.charAt(0).toUpperCase()}${sound.key.slice(1)}`;
    const audio = game?.audio ?? null;
    const method = audio && typeof audio[methodName] === 'function'
        ? audio[methodName]
        : null;
    if (!method) {
        return;
    }
    try {
        method.call(audio);
    } catch (error) {
        console.warn('Failed to trigger tutorial sound.', error);
    }
}

function createOverlayManager(elements = {}) {
    const {
        overlay,
        titleEl,
        textEl,
        imageEl,
        soundContainer,
        soundNameEl,
    } = elements;
    const hiddenClass = 'hidden';
    const updateHiddenState = (target, hidden) => {
        if (!target) {
            return;
        }
        if (hidden) {
            target.classList?.add?.(hiddenClass);
            if ('hidden' in target) {
                target.hidden = true;
            }
        } else {
            target.classList?.remove?.(hiddenClass);
            if ('hidden' in target) {
                target.hidden = false;
            }
        }
    };
    const setAriaHidden = (target, hidden) => {
        if (!target || typeof target.setAttribute !== 'function') {
            return;
        }
        target.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    };

    return {
        show(step) {
            if (!step) {
                return;
            }
            if (titleEl && typeof titleEl.textContent === 'string') {
                titleEl.textContent = step.name ?? '';
            }
            if (textEl && typeof textEl.textContent === 'string') {
                textEl.textContent = step.text ?? '';
            }
            if (imageEl) {
                if (step.image) {
                    imageEl.src = step.image;
                    imageEl.alt = step.imageAlt ?? step.name ?? '';
                    updateHiddenState(imageEl, false);
                } else {
                    imageEl.removeAttribute?.('src');
                    imageEl.alt = '';
                    updateHiddenState(imageEl, true);
                }
            }
            if (soundContainer && soundNameEl) {
                if (step.sound?.label) {
                    soundNameEl.textContent = step.sound.label;
                    updateHiddenState(soundContainer, false);
                } else {
                    soundNameEl.textContent = '';
                    updateHiddenState(soundContainer, true);
                }
            }
            if (overlay) {
                overlay.classList?.remove?.(hiddenClass);
                setAriaHidden(overlay, false);
            }
        },

        hide() {
            if (overlay) {
                overlay.classList?.add?.(hiddenClass);
                setAriaHidden(overlay, true);
            }
        },
    };
}

function removeHighlight(activeHighlights) {
    if (!Array.isArray(activeHighlights) || activeHighlights.length === 0) {
        return;
    }
    activeHighlights.forEach(target => {
        target?.classList?.remove?.(HIGHLIGHT_CLASS);
    });
    activeHighlights.length = 0;
}

function applyHighlight(names, activeHighlights) {
    removeHighlight(activeHighlights);
    if (!Array.isArray(names) || names.length === 0) {
        return;
    }
    const targets = resolveTutorialTargets(names);
    targets.forEach(target => {
        if (!target?.classList?.add) {
            return;
        }
        target.classList.add(HIGHLIGHT_CLASS);
        activeHighlights.push(target);
    });
}

function evaluateStep(step, context) {
    if (!step || typeof step.checkComplete !== 'function') {
        return false;
    }
    try {
        return Boolean(step.checkComplete(context.game, context));
    } catch (error) {
        console.warn(`Tutorial step "${step.id}" check failed.`, error);
        return false;
    }
}

function createTimerHost(providedHost) {
    if (providedHost) {
        return providedHost;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    return globalThis;
}

export function createTutorial(game, options = {}) {
    const rawSteps = Array.isArray(options.steps) ? options.steps : [];
    const steps = rawSteps.map((step, index) => normalizeStep(step, index));
    const overlay = createOverlayManager(options.overlayElements ?? {});
    const pollInterval = Number.isFinite(options.pollInterval)
        ? Math.max(50, options.pollInterval)
        : DEFAULT_POLL_INTERVAL;
    const timerHost = createTimerHost(options.timerHost);
    const events = {
        towerPlaced: false,
        colorSwitched: false,
        waveStarted: false,
    };
    const state = {
        steps,
        started: false,
        activeIndex: -1,
        persistentComplete: Boolean(options.initiallyComplete),
        timerHandle: null,
    };
    const context = {
        game,
        events,
        currentWave: null,
        started: () => state.started,
    };
    const highlights = [];

    if (state.persistentComplete) {
        state.steps.forEach(step => {
            step.done = true;
        });
    }

    const finalizeCompletion = () => {
        if (!state.steps.every(step => step.done)) {
            return;
        }
        state.persistentComplete = true;
        options.onComplete?.(state.steps);
    };

    const stopTimer = () => {
        if (!state.timerHandle) {
            return;
        }
        if (typeof timerHost?.clearInterval === 'function') {
            timerHost.clearInterval(state.timerHandle);
        }
        state.timerHandle = null;
    };

    const checkActiveStepCompletion = () => {
        if (state.activeIndex < 0) {
            stopTimer();
            return false;
        }
        const step = state.steps[state.activeIndex];
        if (!step) {
            stopTimer();
            return false;
        }
        const complete = evaluateStep(step, context);
        if (!complete) {
            return false;
        }
        completeStep(state.activeIndex);
        return true;
    };

    const startTimer = () => {
        stopTimer();
        if (typeof timerHost?.setInterval !== 'function') {
            return;
        }
        state.timerHandle = timerHost.setInterval(checkActiveStepCompletion, pollInterval);
    };

    const showStep = (index) => {
        if (index < 0 || index >= state.steps.length) {
            return;
        }
        const step = state.steps[index];
        state.activeIndex = index;
        overlay.show(step);
        applyHighlight(step.highlight, highlights);
        triggerSound(game, step.sound);
        startTimer();
        checkActiveStepCompletion();
    };

    const findNextStepIndex = (wave) => {
        return state.steps.findIndex(step => !step.done && step.wave === wave);
    };

    const completeStep = (index, options = {}) => {
        if (index < 0 || index >= state.steps.length) {
            return false;
        }
        const step = state.steps[index];
        if (!step || step.done) {
            return false;
        }
        step.done = true;
        if (!options.silent) {
            overlay.hide();
            removeHighlight(highlights);
            stopTimer();
            state.activeIndex = -1;
        }
        finalizeCompletion();
        if (!options.silent && !state.persistentComplete && context.currentWave != null) {
            const nextIndex = findNextStepIndex(context.currentWave);
            if (nextIndex !== -1) {
                showStep(nextIndex);
            }
        }
        return true;
    };

    const prepareWave = (waveNumber) => {
        if (!state.started || state.persistentComplete) {
            return;
        }
        context.currentWave = waveNumber;
        let index = findNextStepIndex(waveNumber);
        while (index !== -1) {
            const step = state.steps[index];
            if (evaluateStep(step, context)) {
                completeStep(index, { silent: true });
                index = findNextStepIndex(waveNumber);
                continue;
            }
            showStep(index);
            break;
        }
    };

    const resetEvents = () => {
        events.towerPlaced = false;
        events.colorSwitched = false;
        events.waveStarted = false;
    };

    return {
        start() {
            if (state.persistentComplete) {
                overlay.hide();
                removeHighlight(highlights);
                state.started = false;
                return;
            }
            state.started = true;
            const currentWave = Number.isFinite(game?.wave) ? game.wave : 1;
            context.currentWave = currentWave;
            prepareWave(currentWave);
        },

        reset(options = {}) {
            const force = Boolean(options.force);
            stopTimer();
            overlay.hide();
            removeHighlight(highlights);
            state.activeIndex = -1;
            state.started = false;
            context.currentWave = null;
            resetEvents();
            if (force) {
                state.persistentComplete = false;
            }
            if (force || !state.persistentComplete) {
                state.steps.forEach(step => {
                    step.done = false;
                });
            }
        },

        handleTowerPlaced() {
            events.towerPlaced = true;
            checkActiveStepCompletion();
        },

        handleColorSwitch() {
            events.colorSwitched = true;
            checkActiveStepCompletion();
        },

        handleWaveStarted() {
            events.waveStarted = true;
            checkActiveStepCompletion();
        },

        handlePreparationPhase(waveNumber) {
            prepareWave(waveNumber);
        },

        syncWithGame(currentGame) {
            if (!currentGame) {
                return;
            }
            context.game = currentGame;
            const currentWave = Number.isFinite(currentGame.wave) ? currentGame.wave : null;
            if (currentGame.waveInProgress) {
                events.waveStarted = true;
            }
            state.steps.forEach((step, index) => {
                if (step.done) {
                    return;
                }
                context.currentWave = currentWave;
                if (evaluateStep(step, context)) {
                    completeStep(index, { silent: true });
                }
            });
            context.currentWave = currentWave;
        },

        isComplete() {
            return state.steps.every(step => step.done);
        },

        getCurrentStep() {
            return state.steps[state.activeIndex] ?? null;
        },

        clearProgress() {
            state.persistentComplete = false;
            state.steps.forEach(step => {
                step.done = false;
            });
        },

        get steps() {
            return state.steps.map(step => ({ ...step }));
        },

        _state: state,
        _context: context,
    };
}

function getConfiguredTutorialSteps() {
    const configuredSteps = gameConfig?.tutorial?.steps;
    if (!Array.isArray(configuredSteps)) {
        return [];
    }
    return configuredSteps;
}

export function attachTutorial(game, options = {}) {
    const doc = options.document
        ?? (typeof document !== 'undefined' ? document : null);
    const overlay = options.overlayElement ?? doc?.getElementById?.('tutorialOverlay') ?? null;
    const titleEl = options.titleElement ?? doc?.getElementById?.('tutorialTitle') ?? null;
    const textEl = options.textElement ?? doc?.getElementById?.('tutorialText') ?? null;
    const imageEl = options.imageElement ?? doc?.getElementById?.('tutorialImage') ?? null;
    const soundContainer = options.soundContainer ?? doc?.getElementById?.('tutorialSound') ?? null;
    const soundNameEl = options.soundNameElement ?? doc?.getElementById?.('tutorialSoundName') ?? null;
    const steps = options.steps ?? getConfiguredTutorialSteps();
    const alreadyComplete = isTutorialMarkedComplete();
    const tutorial = createTutorial(game, {
        steps,
        overlayElements: {
            overlay,
            titleEl,
            textEl,
            imageEl,
            soundContainer,
            soundNameEl,
        },
        initiallyComplete: alreadyComplete,
        onComplete: markTutorialComplete,
    });
    tutorial.reset();
    tutorial.syncWithGame(game);
    game.tutorial = tutorial;
    game.tutorialOverlay = overlay;
    game.tutorialWindow = doc?.getElementById?.('tutorialWindow') ?? null;
    game.resetTutorialProgress = () => {
        clearTutorialProgress();
        tutorial.clearProgress();
        tutorial.reset({ force: true });
    };
    return tutorial;
}

export default createTutorial;
