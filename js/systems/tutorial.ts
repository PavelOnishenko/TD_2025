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

let lastTutorialAcknowledgedAt = 0;

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
        return { root, backdrop: null, panel: null, mediaWrapper: null, imageEl: null, titleEl: null, textEl: null };
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

    return { root, backdrop, panel, mediaWrapper, imageEl, titleEl, textEl };
}

function shouldHideImageForViewport() {
    if (typeof window === 'undefined') {
        return false;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const area = width * height;
    const SMALL_SCREEN_THRESHOLD = 800 * 500;
    return area < SMALL_SCREEN_THRESHOLD;
}

function createDomOverlay(doc) {
    if (!doc || typeof doc.getElementById !== 'function') {
        return {
            show() {},
            hide() {},
            setHighlightState() {},
            setBackdropActive() {},
        };
    }

    let root = doc.getElementById('tutorialOverlay');
    let created = false;
    if (!root && typeof doc.createElement === 'function') {
        root = doc.createElement('div');
        root.id = 'tutorialOverlay';
        created = true;
    }

    const { backdrop, panel, mediaWrapper, imageEl, titleEl, textEl } = ensureOverlayStructure(doc, root);

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
            const hideImage = shouldHideImageForViewport();

            if (panel) {
                panel.classList?.toggle?.('tutorial-overlay__panel--no-image', hideImage);
            }

            if (picture && imageEl && !hideImage) {
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
            if (panel) {
                panel.classList?.remove?.('tutorial-overlay__panel--no-image');
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
        setBackdropActive(active) {
            if (!backdrop) {
                return;
            }
            backdrop.classList?.toggle?.('hidden', !active);
        },
        element: root,
    };
}

function defaultPlaySound(soundConfig) {
    if (!soundConfig) {
        return;
    }

    // Support both string (legacy) and object format
    const isObject = typeof soundConfig === 'object' && soundConfig !== null;
    const src = isObject ? soundConfig.src : soundConfig;
    const volume = isObject && Number.isFinite(soundConfig.volume) ? soundConfig.volume : 1.0;

    if (!src) {
        return;
    }

    try {
        const cacheKey = `${src}:${volume}`;
        let sound = SOUND_CACHE.get(cacheKey);
        if (!sound) {
            sound = createSound({ src: [src], volume, preload: true });
            SOUND_CACHE.set(cacheKey, sound);
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

function hasHighlightTargets(step) {
    return Array.isArray(step?.highlightTargets) && step.highlightTargets.length > 0;
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

const createInitialTutorialContext = () => ({
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

class TutorialRuntime {
    [key: string]: any;

    constructor(game, dependencies) {
        this.game = game;
        this.overlay = dependencies.overlay;
        this.scheduleCheck = dependencies.scheduleCheck;
        this.playSound = dependencies.playSound;
        this.onComplete = dependencies.onComplete;
        this.cancelCheck = null;
        this._state = {
            steps: dependencies.steps,
            started: false,
            currentStep: null,
            currentDisplayStep: null,
            currentWave: Number.isFinite(game?.wave) ? game.wave : 1,
            waveInProgress: Boolean(game?.waveInProgress),
            persistentComplete: Boolean(dependencies.initiallyComplete),
            highlighted: [],
            context: createInitialTutorialContext(),
        };
        if (this._state.persistentComplete) {
            this._state.steps.forEach(step => {
                step.done = true;
            });
        }
        this.bindOverlayAcknowledgement();
    }

    bindOverlayAcknowledgement() {
        const element = this.overlay?.element;
        if (!element || typeof element.addEventListener !== 'function') {
            return;
        }
        const handlePointer = () => {
            if (Date.now() - lastTutorialAcknowledgedAt < 300) {
                return;
            }
            lastTutorialAcknowledgedAt = Date.now();
            this.acknowledgeCurrentStep();
        };
        const handleKey = (event) => {
            const key = event?.key;
            if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
                this.acknowledgeCurrentStep();
            }
        };
        element.addEventListener('click', handlePointer);
        element.addEventListener('pointerdown', handlePointer);
        element.addEventListener('keydown', handleKey);
    }

    ensureAcknowledgedSteps() {
        if (!(this._state.context?.acknowledgedSteps instanceof Set)) {
            this._state.context.acknowledgedSteps = new Set();
        }
        return this._state.context.acknowledgedSteps;
    }

    acknowledgeCurrentStep() {
        const step = this._state.currentStep;
        if (!step?.id) {
            return;
        }
        const acknowledged = this.ensureAcknowledgedSteps();
        if (!acknowledged.has(step.id)) {
            acknowledged.add(step.id);
            this._state.context.lastAcknowledgedStepId = step.id;
            this._state.context.lastAcknowledgedAt = Date.now();
        }
        this.evaluateCurrentStep();
    }

    stopCheckLoop() {
        if (typeof this.cancelCheck === 'function') {
            this.cancelCheck();
        }
        this.cancelCheck = null;
    }

    clearHighlights() {
        if (!Array.isArray(this._state.highlighted)) {
            this._state.highlighted = [];
            this.overlay?.setHighlightState?.(false);
            return;
        }
        this._state.highlighted.forEach(element => {
            element?.classList?.remove?.('tutorial-highlighted');
        });
        this._state.highlighted = [];
        this.overlay?.setHighlightState?.(false);
    }

    applyHighlights(step) {
        this.clearHighlights();
        if (!step || !Array.isArray(step.highlightTargets) || step.highlightTargets.length === 0) {
            return;
        }
        const elements = resolveTutorialTargets(step.highlightTargets);
        elements.forEach((element: any) => {
            element?.classList?.add?.('tutorial-highlighted');
        });
        this._state.highlighted = elements;
        this.overlay?.setHighlightState?.(elements.length > 0);
    }

    hideOverlay() {
        this.overlay?.hide?.();
        this.overlay?.setBackdropActive?.(false);
        this.clearHighlights();
        this.stopCheckLoop();
        if (this._state.context) {
            this._state.context.currentStepId = null;
        }
        this._state.currentDisplayStep = null;
    }

    ensureCheckLoop() {
        if (this.cancelCheck || typeof this.scheduleCheck !== 'function') {
            return;
        }
        this.cancelCheck = this.scheduleCheck(() => this.evaluateCurrentStep());
    }

    getNextAvailableStep() {
        return this._state.steps.find(step => !step.done && step.wave <= this._state.currentWave) ?? null;
    }

    finalizeCompletion() {
        const complete = this._state.steps.length > 0
            ? this._state.steps.every(step => step.done)
            : true;
        if (!complete) {
            return false;
        }
        if (!this._state.persistentComplete) {
            this._state.persistentComplete = true;
            try {
                this.onComplete?.(this._state.steps);
            } catch (error) {
                console.warn('Tutorial completion callback failed', error);
            }
        }
        this.hideOverlay();
        return true;
    }

    showStep(step) {
        if (!step) {
            return;
        }
        this._state.currentStep = step;
        const displayStep = createDisplayStep(step);
        this._state.currentDisplayStep = displayStep;
        this.overlay?.setBackdropActive?.(hasHighlightTargets(step));
        this.overlay?.show?.(displayStep);
        this.applyHighlights(step);
        this.playSound(step.sound);
        this.ensureCheckLoop();
        this.ensureAcknowledgedSteps().delete(step.id);
        this._state.context.currentStepId = step.id;
        this._state.context.stepShownAt = Date.now();
        this.evaluateCurrentStep();
    }

    maybeShowNextStep() {
        if (!this._state.started || this._state.persistentComplete) {
            return;
        }
        if (this._state.waveInProgress) {
            this.hideOverlay();
            return;
        }
        if (this._state.currentStep && !this._state.currentStep.done) {
            return;
        }
        const next = this.getNextAvailableStep();
        if (!next) {
            this.hideOverlay();
            return;
        }
        this.showStep(next);
    }

    refreshCurrentStepLocalization() {
        if (!this._state.currentStep || !this._state.currentDisplayStep) {
            return;
        }
        const displayStep = createDisplayStep(this._state.currentStep);
        this._state.currentDisplayStep = displayStep;
        this.overlay?.setBackdropActive?.(hasHighlightTargets(this._state.currentStep));
        this.overlay?.show?.(displayStep);
        this.applyHighlights(this._state.currentStep);
    }

    evaluateCurrentStep() {
        const step = this._state.currentStep;
        if (!step || step.done) {
            return false;
        }
        let complete = false;
        if (typeof step.checkComplete === 'function') {
            try {
                complete = Boolean(step.checkComplete(this.game, this._state.context));
            } catch (error) {
                console.warn(`Tutorial step "${step.id}" check failed`, error);
            }
        }
        if (!complete) {
            return false;
        }
        step.done = true;
        this.hideOverlay();
        if (!this.finalizeCompletion()) {
            this.maybeShowNextStep();
        }
        return true;
    }

    syncWithGame(currentGame = this.game) {
        if (!currentGame) {
            return;
        }
        const context = this._state.context ?? createInitialTutorialContext();
        this._state.context = context;
        this.syncPlacementAndWaveContext(currentGame, context);
        this.syncRewardContext(currentGame, context);
        this.completeEligibleSteps(currentGame, context);
        if (this.finalizeCompletion()) {
            return;
        }
        if (this._state.started && !this._state.waveInProgress) {
            this.maybeShowNextStep();
        } else if (this._state.waveInProgress) {
            this.hideOverlay();
        }
    }

    syncPlacementAndWaveContext(currentGame, context) {
        const towersCount = Array.isArray(currentGame.towers) ? currentGame.towers.length : 0;
        context.towersPlaced = Math.max(context.towersPlaced, towersCount);
        const waveStarted = Boolean(currentGame.waveInProgress)
            || (typeof currentGame.wave === 'number' && currentGame.wave > 1)
            || ((currentGame.spawned ?? 0) > 0);
        if (waveStarted) {
            context.wavesStarted = Math.max(context.wavesStarted, 1);
            context.colorSwitches = Math.max(context.colorSwitches, 1);
        }
        const currentWave = Number.isFinite(currentGame.wave) ? currentGame.wave : this._state.currentWave;
        this._state.currentWave = currentWave;
        this._state.waveInProgress = Boolean(currentGame.waveInProgress);
        const clearedWaves = Math.max(0, Math.floor(currentWave) - 1);
        context.wavesCleared = Math.max(context.wavesCleared, clearedWaves);
    }

    syncRewardContext(currentGame, context) {
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
    }

    completeEligibleSteps(currentGame, context) {
        this._state.steps.forEach(step => {
            if (step.done || typeof step.checkComplete !== 'function') {
                return;
            }
            try {
                if (step.checkComplete(currentGame, context)) {
                    step.done = true;
                }
            } catch (error) {
                console.warn(`Tutorial step "${step.id}" sync failed`, error);
            }
        });
    }

    resetContext() {
        this._state.context = createInitialTutorialContext();
    }

    start() {
        if (this._state.persistentComplete) {
            this._state.started = false;
            this.hideOverlay();
            return;
        }
        this._state.started = true;
        this._state.currentWave = Number.isFinite(this.game?.wave) ? this.game.wave : this._state.currentWave;
        this._state.waveInProgress = Boolean(this.game?.waveInProgress);
        this.maybeShowNextStep();
    }

    reset(options: any = {}) {
        const force = Boolean(options.force);
        this.hideOverlay();
        this.stopCheckLoop();
        this._state.started = false;
        this._state.currentStep = null;
        this._state.waveInProgress = Boolean(this.game?.waveInProgress);
        this._state.currentWave = Number.isFinite(this.game?.wave) ? this.game.wave : 1;
        this.resetContext();
        this._state.steps.forEach(step => {
            step.done = force || !this._state.persistentComplete ? false : true;
        });
        if (force) {
            this._state.persistentComplete = false;
        }
    }

    handleTowerPlaced() {
        this._state.context.towersPlaced += 1;
        this.evaluateCurrentStep();
    }

    handleColorSwitch() {
        this._state.context.colorSwitches += 1;
        this.evaluateCurrentStep();
    }

    handleTowerMerged(details: any = {}) {
        this._state.context.merges += 1;
        if (details?.color) {
            this._state.context.lastMergeColor = details.color;
        }
        this.evaluateCurrentStep();
    }

    handleTowerRemoved(details: any = {}) {
        this._state.context.removals += 1;
        if (details?.cause) {
            this._state.context.lastRemovalCause = details.cause;
        }
        this.evaluateCurrentStep();
    }

    handleEnemyKilled(details: any = {}) {
        this._state.context.enemyKills += 1;
        if (details?.match) {
            this._state.context.matchingKills += 1;
        }
        this.evaluateCurrentStep();
    }

    handleEnergyGained(amount = 0) {
        const gain = Number.isFinite(amount) ? Math.max(0, amount) : 0;
        if (gain > 0) {
            this._state.context.energyGained += gain;
            this._state.context.energyEvents += 1;
        }
        this.evaluateCurrentStep();
    }

    handleScoreChanged(total = 0, details: any = {}) {
        const normalizedTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
        this._state.context.scoreTotal = Math.max(this._state.context.scoreTotal, normalizedTotal);
        const delta = Number.isFinite(details?.delta) ? details.delta : 0;
        if (delta > 0) {
            this._state.context.scoreGained += delta;
            this._state.context.scoreEvents += 1;
        } else if (normalizedTotal > 0) {
            this._state.context.scoreEvents = Math.max(this._state.context.scoreEvents, 1);
        }
        this.evaluateCurrentStep();
    }

    handleWaveCompleted(waveNumber) {
        if (Number.isFinite(waveNumber)) {
            this._state.context.wavesCleared = Math.max(this._state.context.wavesCleared, waveNumber);
        }
        this.evaluateCurrentStep();
    }

    handleWaveStarted() {
        this._state.context.wavesStarted += 1;
        this._state.waveInProgress = true;
        if (!this.evaluateCurrentStep()) {
            this.hideOverlay();
        }
    }

    handleWavePreparation(waveNumber) {
        if (Number.isFinite(waveNumber)) {
            this._state.currentWave = waveNumber;
        }
        this._state.waveInProgress = false;
        if (this._state.started) {
            this.maybeShowNextStep();
        }
    }

    isComplete() {
        return this._state.steps.every(step => step.done);
    }

    getCurrentStep() {
        return this._state.currentStep;
    }

    clearProgress() {
        this._state.persistentComplete = false;
        this._state.steps.forEach(step => {
            step.done = false;
        });
        this.resetContext();
        this.hideOverlay();
    }

    refreshLocalization() {
        this.refreshCurrentStepLocalization();
    }
}

export function createTutorial(game, options: any = {}) {
    const doc = options.document ?? (typeof document !== 'undefined' ? document : null);
    return new TutorialRuntime(game, {
        overlay: options.ui ?? createDomOverlay(doc),
        scheduleCheck: options.scheduleCheck ?? createIntervalScheduler(options.checkInterval),
        playSound: typeof options.playSound === 'function' ? options.playSound : defaultPlaySound,
        onComplete: options.onComplete ?? markTutorialComplete,
        steps: normalizeSteps(options.steps ?? getDefaultSteps()),
        initiallyComplete: options.initiallyComplete,
    });
}

export function attachTutorial(game, options: any = {}) {
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
