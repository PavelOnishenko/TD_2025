import {
    clearTutorialProgress,
    isTutorialMarkedComplete,
    markTutorialComplete,
} from './tutorialProgress.js';

const DEFAULT_TUTORIAL_STEPS = [
    {
        id: 'build-tower',
        text: 'Click on a glowing platform cell to build your first tower. Each tower costs 12 energy.',
    },
    {
        id: 'switch-color',
        text: 'Click an existing tower to switch its color. Matching enemy colors deals full damage. Switching costs 4 energy.',
    },
    {
        id: 'start-wave',
        text: 'Press "Next Wave" when you are ready. Survive all 10 waves to protect the base!',
    },
];

function createState(steps) {
    return {
        steps: steps.map(step => ({ ...step, done: Boolean(step.done) })),
        currentIndex: 0,
        started: false,
    };
}

function advanceIndex(state) {
    while (state.currentIndex < state.steps.length && state.steps[state.currentIndex].done) {
        state.currentIndex += 1;
    }
}

export function createTutorial(options = {}) {
    const {
        steps = DEFAULT_TUTORIAL_STEPS,
        renderTip,
        hideTip,
        onComplete,
        initiallyComplete = false,
    } = options;
    const state = createState(steps);
    let persistentComplete = Boolean(initiallyComplete);

    if (persistentComplete) {
        state.steps.forEach(step => {
            step.done = true;
        });
        state.currentIndex = state.steps.length;
    }

    function finalizeCompletion() {
        const complete = state.steps.every(entry => entry.done);
        if (complete) {
            persistentComplete = true;
            onComplete?.(state.steps);
        }
        return complete;
    }

    function getCurrentStep() {
        return state.steps[state.currentIndex] ?? null;
    }

    function updateDisplay() {
        if (!state.started) {
            return;
        }
        const current = getCurrentStep();
        if (!current) {
            hideTip?.();
            return;
        }
        renderTip?.(current.text, current);
    }

    function complete(id) {
        const step = state.steps.find(entry => entry.id === id);
        if (!step || step.done) {
            return false;
        }
        step.done = true;
        if (state.steps[state.currentIndex]?.id === id) {
            advanceIndex(state);
        }
        const finished = finalizeCompletion();
        if (finished) {
            hideTip?.();
        } else {
            updateDisplay();
        }
        return true;
    }

    return {
        start() {
            if (persistentComplete) {
                state.started = false;
                hideTip?.();
                return;
            }
            state.started = true;
            advanceIndex(state);
            updateDisplay();
        },

        reset(options = {}) {
            const force = Boolean(options.force);
            state.started = false;
            if (force || !persistentComplete) {
                state.steps.forEach(step => {
                    step.done = false;
                });
                state.currentIndex = 0;
                if (persistentComplete && force) {
                    persistentComplete = false;
                }
            } else {
                state.currentIndex = state.steps.length;
            }
            hideTip?.();
        },

        handleTowerPlaced() {
            complete('build-tower');
        },

        handleColorSwitch() {
            complete('switch-color');
        },

        handleWaveStarted() {
            complete('start-wave');
        },

        syncWithGame(game) {
            if (!game) {
                return;
            }
            if (Array.isArray(game.towers) && game.towers.length > 0) {
                complete('build-tower');
            }
            const waveStarted = Boolean(game.waveInProgress)
                || (typeof game.wave === 'number' && game.wave > 1)
                || ((game.spawned ?? 0) > 0);
            if (waveStarted) {
                complete('start-wave');
                complete('switch-color');
            }
        },

        isComplete() {
            return state.steps.every(step => step.done);
        },

        getCurrentStep,

        clearProgress() {
            persistentComplete = false;
            state.steps.forEach(step => {
                step.done = false;
            });
            state.currentIndex = 0;
            hideTip?.();
        },

        _state: state,
    };
}

function createDomRenderer(element) {
    if (!element) {
        return {
            show() {},
            hide() {},
        };
    }
    const classList = element.classList ?? null;
    return {
        show(text) {
            if (typeof element.textContent === 'string') {
                element.textContent = text;
            }
            classList?.remove?.('hidden');
        },
        hide() {
            if (typeof element.textContent === 'string') {
                element.textContent = '';
            }
            classList?.add?.('hidden');
        },
    };
}

export function attachTutorial(game, options = {}) {
    const doc = options.document
        ?? (typeof document !== 'undefined' ? document : null);
    const tipElement = options.tipElement ?? doc?.getElementById?.('tutorialTip') ?? null;
    const renderer = createDomRenderer(tipElement);
    const alreadyComplete = isTutorialMarkedComplete();
    const tutorial = createTutorial({
        steps: options.steps ?? DEFAULT_TUTORIAL_STEPS,
        renderTip: renderer.show,
        hideTip: renderer.hide,
        onComplete: markTutorialComplete,
        initiallyComplete: alreadyComplete,
    });
    tutorial.reset();
    tutorial.syncWithGame(game);
    game.tutorial = tutorial;
    game.tutorialTipEl = tipElement;
    game.resetTutorialProgress = () => {
        clearTutorialProgress();
        tutorial.clearProgress();
        tutorial.reset({ force: true });
    };
    return tutorial;
}

export { DEFAULT_TUTORIAL_STEPS };
