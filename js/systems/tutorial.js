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
        onProgressReset,
    } = options;
    const state = createState(steps);
    state.completionNotified = false;

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
            if (!state.completionNotified) {
                state.completionNotified = true;
                onComplete?.();
            }
            return;
        }
        renderTip?.(current.text, current);
        state.completionNotified = false;
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
        updateDisplay();
        return true;
    }

    return {
        start() {
            state.started = true;
            advanceIndex(state);
            updateDisplay();
        },

        reset() {
            state.started = false;
            state.steps.forEach(step => {
                step.done = false;
            });
            state.currentIndex = 0;
            state.completionNotified = false;
            hideTip?.();
        },

        forceResetProgress() {
            onProgressReset?.();
            this.reset();
        },

        markComplete() {
            state.steps.forEach(step => {
                step.done = true;
            });
            state.currentIndex = state.steps.length;
            state.started = false;
            state.completionNotified = true;
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
    const storage = options.storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const renderer = createDomRenderer(tipElement);
    const completionKey = options.completionKey ?? 'td2025:tutorialCompleted';
    const markPersistedComplete = () => {
        try {
            storage?.setItem?.(completionKey, '1');
        } catch {
            // Ignore persistence errors
        }
    };
    const clearPersistedComplete = () => {
        try {
            storage?.removeItem?.(completionKey);
        } catch {
            // Ignore persistence errors
        }
    };
    const tutorial = createTutorial({
        steps: options.steps ?? DEFAULT_TUTORIAL_STEPS,
        renderTip: renderer.show,
        hideTip: renderer.hide,
        onComplete: markPersistedComplete,
        onProgressReset: clearPersistedComplete,
    });
    tutorial.reset();
    tutorial.syncWithGame(game);
    const shouldSkip = (() => {
        try {
            return storage?.getItem?.(completionKey) === '1';
        } catch {
            return false;
        }
    })();
    if (shouldSkip) {
        tutorial.markComplete();
    }
    if (doc?.addEventListener) {
        const secretSequence = options.secretSequence ?? ['KeyT', 'KeyD', 'KeyR'];
        let secretIndex = 0;
        doc.addEventListener('keydown', event => {
            if (!event.shiftKey || !event.altKey) {
                secretIndex = 0;
                return;
            }
            if (event.code === secretSequence[secretIndex]) {
                secretIndex += 1;
                if (secretIndex >= secretSequence.length) {
                    secretIndex = 0;
                    tutorial.forceResetProgress();
                    tutorial.start();
                }
            } else {
                secretIndex = 0;
            }
        });
    }
    game.tutorial = tutorial;
    game.tutorialTipEl = tipElement;
    return tutorial;
}

export { DEFAULT_TUTORIAL_STEPS };
