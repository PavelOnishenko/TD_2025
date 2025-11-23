const DEFAULT_TIME_SCALE = 1;
const MIN_TIME_SCALE = 0.05;
const MAX_TIME_SCALE = 4;

function clampTimeScale(scale = DEFAULT_TIME_SCALE) {
    const value = Number.isFinite(scale) ? scale : DEFAULT_TIME_SCALE;
    return Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, value));
}

function resolveDimension(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function normalizeBounds(bounds, fallbackWidth, fallbackHeight) {
    const defaultBounds = {
        minX: 0,
        maxX: fallbackWidth,
        minY: 0,
        maxY: fallbackHeight,
    };

    if (!bounds) {
        return defaultBounds;
    }

    const widthValid = Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) && bounds.maxX > bounds.minX;
    const heightValid = Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxY) && bounds.maxY > bounds.minY;

    if (widthValid && heightValid) {
        return {
            minX: bounds.minX,
            maxX: bounds.maxX,
            minY: bounds.minY,
            maxY: bounds.maxY,
        };
    }

    return {
        minX: widthValid ? bounds.minX : 0,
        maxX: widthValid ? bounds.maxX : fallbackWidth,
        minY: heightValid ? bounds.minY : 0,
        maxY: heightValid ? bounds.maxY : fallbackHeight,
    };
}

export function getViewportMetrics(windowRef = window) {
    const width = windowRef.innerWidth;
    const height = windowRef.innerHeight;
    const devicePixelRatio = windowRef.devicePixelRatio || 1;
    return { width, height, dpr: devicePixelRatio };
}

export function computeDisplaySize(metrics) {
    const displayWidth = Math.round(metrics.width * metrics.dpr);
    const displayHeight = Math.round(metrics.height * metrics.dpr);
    return { displayWidth, displayHeight, dpr: metrics.dpr };
}

export function createViewport(displaySize, options = {}) {
    const { displayWidth, displayHeight, dpr } = displaySize;
    const logicalWidth = resolveDimension(options.logicalWidth, options.fallbackLogicalWidth ?? 1);
    const logicalHeight = resolveDimension(options.logicalHeight, options.fallbackLogicalHeight ?? 1);
    const bounds = normalizeBounds(options.worldBounds, logicalWidth, logicalHeight);
    const gameplayWidth = Math.max(1, bounds.maxX - bounds.minX);
    const gameplayHeight = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(displayWidth / gameplayWidth, displayHeight / gameplayHeight) || 1;
    const renderWidth = gameplayWidth * scale;
    const renderHeight = gameplayHeight * scale;
    const offsetX = (displayWidth - renderWidth) / 2 - bounds.minX * scale;
    const offsetY = (displayHeight - renderHeight) / 2 - bounds.minY * scale;
    return {
        scale,
        offsetX,
        offsetY,
        dpr,
        worldBounds: bounds,
        renderWidth,
        renderHeight,
    };
}

function updateContainerDimensions(container, metrics) {
    if (!container) {
        return;
    }
    container.style.width = `${metrics.width}px`;
    container.style.height = `${metrics.height}px`;
}

function applyCssSize(canvasElement, metrics) {
    if (!canvasElement) {
        return;
    }
    canvasElement.style.width = `${metrics.width}px`;
    canvasElement.style.height = `${metrics.height}px`;
}

function ensureCanvasResolution(canvasElement, displaySize) {
    if (!canvasElement) {
        return;
    }
    if (canvasElement.width === displaySize.displayWidth && canvasElement.height === displaySize.displayHeight) {
        return;
    }
    canvasElement.width = displaySize.displayWidth;
    canvasElement.height = displaySize.displayHeight;
}

function applyViewport(canvasElement, gameInstance, viewport) {
    if (!canvasElement || !viewport) {
        return;
    }
    canvasElement.viewportTransform = viewport;
    if (gameInstance) {
        if (typeof gameInstance.updateViewport === 'function') {
            gameInstance.updateViewport(viewport);
        } else {
            gameInstance.viewport = viewport;
        }
    }
}

export function resizeCanvas({ canvasElement, gameContainerElement, gameInstance, metrics, logicalWidth, logicalHeight }) {
    if (!canvasElement) {
        return null;
    }

    const viewportMetrics = metrics ?? getViewportMetrics();
    updateContainerDimensions(gameContainerElement, viewportMetrics);
    applyCssSize(canvasElement, viewportMetrics);
    const displaySize = computeDisplaySize(viewportMetrics);
    ensureCanvasResolution(canvasElement, displaySize);
    let worldBounds = null;
    if (gameInstance && typeof gameInstance.computeWorldBounds === 'function') {
        worldBounds = gameInstance.computeWorldBounds();
    }
    const logicalW = resolveDimension(logicalWidth, resolveDimension(gameInstance?.logicalW, 1));
    const logicalH = resolveDimension(logicalHeight, resolveDimension(gameInstance?.logicalH, 1));
    const viewport = createViewport(displaySize, {
        worldBounds,
        logicalWidth: logicalW,
        logicalHeight: logicalH,
        fallbackLogicalWidth: logicalW,
        fallbackLogicalHeight: logicalH,
    });
    applyViewport(canvasElement, gameInstance, viewport);
    if (gameInstance && viewport.worldBounds) {
        gameInstance.worldBounds = viewport.worldBounds;
    }
    return viewport;
}

function handleWindowBlur(game, runtime) {
    if (!game) {
        return;
    }
    const resumeLater = Boolean(game.musicEnabled && !game.audioMuted && game.shouldPlayMusic?.());
    if (!game.isPaused && typeof game.pause === 'function') {
        game.musicPausedByFocus = resumeLater;
        game.pause('focus');
    } else if (game.pauseReason === 'focus') {
        game.musicPausedByFocus = resumeLater;
        if (resumeLater && typeof game.audio?.stopMusic === 'function') {
            game.audio.stopMusic();
        }
    } else if (resumeLater && typeof game.audio?.stopMusic === 'function') {
        game.audio.stopMusic();
        game.musicPausedByFocus = false;
    }

    if (runtime) {
        runtime.markPaused('focus');
    }
}

function handleWindowFocus(game, runtime) {
    if (!game) {
        return;
    }
    const shouldResumeMusic = game.musicPausedByFocus;
    game.musicPausedByFocus = false;
    if (game.pauseReason === 'focus' && typeof game.resume === 'function') {
        const resumed = game.resume({ expectedReason: 'focus', reason: 'focus', skipRuntime: true });
        if (!resumed && shouldResumeMusic) {
            game.playMusicIfAllowed?.();
        }
    } else if (shouldResumeMusic) {
        game.playMusicIfAllowed?.();
    }

    if (runtime) {
        runtime.markResumed('focus');
    }
}

class EngineRuntime {
    constructor(options = {}) {
        const {
            canvasElement = null,
            gameContainerElement = null,
            logicalWidth = null,
            logicalHeight = null,
            timeScale = DEFAULT_TIME_SCALE,
            metricsProvider = getViewportMetrics,
        } = options;

        this.canvasElement = canvasElement;
        this.gameContainerElement = gameContainerElement;
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;
        this.metricsProvider = metricsProvider;

        this.game = null;
        this.isPaused = true;
        this.pauseReason = null;
        this.timeScale = clampTimeScale(timeScale);
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.virtualTimestamp = 0;
        this.lastTimestamp = null;
        this.requestId = null;
        this.viewport = null;

        this.frameHandler = this.frameHandler.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleFocus = this.handleFocus.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    setGame(gameInstance) {
        this.game = gameInstance;
        if (gameInstance) {
            gameInstance.runtime = this;
            if (typeof gameInstance.setTimeScale === 'function') {
                gameInstance.setTimeScale(this.timeScale);
            } else {
                gameInstance.timeScale = this.timeScale;
            }
        }
        return gameInstance;
    }

    init() {
        this.attachEventListeners();
        this.resize();
        if (this.game?.init) {
            this.game.init();
        }
    }

    start() {
        this.isPaused = false;
        this.pauseReason = null;
        this.resetFrameTiming();
        this.scheduleNextFrame();
    }

    pause(reason = 'manual') {
        if (this.isPaused && this.pauseReason === reason) {
            return false;
        }
        this.isPaused = true;
        this.pauseReason = reason;
        if (this.game?.pause) {
            this.game.pause(reason, { skipRuntime: true });
        }
        return true;
    }

    resume(reason = 'manual') {
        if (!this.isPaused && (!reason || this.pauseReason !== reason)) {
            return false;
        }
        this.isPaused = false;
        this.pauseReason = null;
        this.resetFrameTiming({ preserveVirtualTime: true });
        if (this.game?.resume) {
            this.game.resume({ expectedReason: reason, reason, skipRuntime: true });
        }
        this.scheduleNextFrame();
        return true;
    }

    markPaused(reason = 'manual') {
        this.isPaused = true;
        this.pauseReason = reason;
    }

    markResumed(reason = 'manual') {
        if (this.pauseReason && reason && this.pauseReason !== reason) {
            return;
        }
        this.isPaused = false;
        this.pauseReason = null;
        this.resetFrameTiming({ preserveVirtualTime: true });
    }

    setTimeScale(scale) {
        this.timeScale = clampTimeScale(scale);
        if (this.game?.setTimeScale) {
            this.game.setTimeScale(this.timeScale);
        }
        return this.timeScale;
    }

    resize(metrics) {
        if (!this.canvasElement) {
            return null;
        }
        this.viewport = resizeCanvas({
            canvasElement: this.canvasElement,
            gameContainerElement: this.gameContainerElement,
            gameInstance: this.game,
            metrics: metrics ?? this.metricsProvider?.(),
            logicalWidth: this.logicalWidth,
            logicalHeight: this.logicalHeight,
        });
        return this.viewport;
    }

    destroy() {
        this.detachEventListeners();
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    frameHandler(timestamp) {
        if (this.isPaused || this.game?.gameOver || this.game?.isPaused) {
            this.lastTimestamp = timestamp;
            this.scheduleNextFrame();
            return;
        }

        if (this.lastTimestamp === null) {
            this.lastTimestamp = timestamp;
            this.scheduleNextFrame();
            return;
        }

        const rawDeltaMs = Math.max(0, timestamp - this.lastTimestamp);
        this.lastTimestamp = timestamp;
        const scaledDeltaMs = rawDeltaMs * this.timeScale;
        this.deltaTime = scaledDeltaMs / 1000;
        this.elapsedTime += this.deltaTime;
        this.virtualTimestamp += scaledDeltaMs;

        if (this.game?.update) {
            this.game.update(this.deltaTime, this.virtualTimestamp);
        }
        if (this.game?.render && this.canvasElement) {
            const ctx = this.canvasElement.getContext('2d');
            if (ctx) {
                this.game.render(ctx);
            }
        }

        this.scheduleNextFrame();
    }

    scheduleNextFrame() {
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }
        this.requestId = requestAnimationFrame(this.frameHandler);
    }

    resetFrameTiming(options = {}) {
        const { preserveVirtualTime = false } = options;
        this.lastTimestamp = null;
        this.deltaTime = 0;
        if (!preserveVirtualTime) {
            this.virtualTimestamp = 0;
            this.elapsedTime = 0;
        }
    }

    attachEventListeners() {
        if (typeof window === 'undefined') {
            return;
        }
        window.addEventListener('blur', this.handleBlur);
        window.addEventListener('focus', this.handleFocus);
        window.addEventListener('resize', this.handleResize);
    }

    detachEventListeners() {
        if (typeof window === 'undefined') {
            return;
        }
        window.removeEventListener('blur', this.handleBlur);
        window.removeEventListener('focus', this.handleFocus);
        window.removeEventListener('resize', this.handleResize);
    }

    handleBlur() {
        handleWindowBlur(this.game, this);
    }

    handleFocus() {
        handleWindowFocus(this.game, this);
    }

    handleResize() {
        this.resize();
    }
}

export default EngineRuntime;
