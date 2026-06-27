import {
    fetchLeaderboard,
    submitHighScore,
    resolvePlayerDisplayName,
    normalizeScore,
} from '../../../engine/services/HighScoreService.js';
import { translate } from '../localization.js';
const createLeaderboardState = () => ({
    visible: false,
    loading: false,
    loadPromise: null,
    loadedOnce: false,
    loadingMessageKey: null,
    loadingMessageFallback: '',
    errorKey: null,
    errorFallback: '',
    errorParams: null,
});

const formatScore = (score) => {
    if (typeof score?.toLocaleString === 'function') {
        return score.toLocaleString();
    }
    return Number.isFinite(score) ? score.toString() : `${score}`;
};

class LeaderboardController {
    constructor(game, toggleBtn, panel) {
        this.game = game;
        this.toggleBtn = toggleBtn;
        this.panel = panel;
        this.listEl = game.leaderboardListEl;
        this.loadingEl = game.leaderboardLoadingEl;
        this.errorEl = game.leaderboardErrorEl;
        this.emptyEl = game.leaderboardEmptyEl;
        this.retryBtn = game.leaderboardRetryBtn;
        this.state = createLeaderboardState();
        game.leaderboardState = this.state;
    }

    bind() {
        this.panel.hidden = true;
        this.panel.classList.add('hidden');
        this.toggleBtn.setAttribute('aria-expanded', 'false');
        this.setToggleLabel();
        this.toggleBtn.addEventListener('click', this.toggleLeaderboard);
        this.bindRetryButton();
        this.bindPauseListener();
        this.exposeRefreshHandlers();
        this.toggleBtn.disabled = !this.game.isPaused || this.game.pauseReason === 'ad';
    }

    bindRetryButton = () => {
        if (!this.retryBtn) {
            return;
        }
        this.retryBtn.addEventListener('click', () => {
            void this.loadLeaderboard({
                key: this.state.loadedOnce ? 'leaderboard.refresh' : 'leaderboard.loading',
                fallback: this.state.loadedOnce ? 'Refreshing leaderboardâ€¦' : 'Loading leaderboardâ€¦',
            });
        });
    };

    bindPauseListener = () => {
        if (typeof this.game.addPauseListener !== 'function') {
            return;
        }
        this.game.addPauseListener((paused, reason) => {
            const disable = !paused || reason === 'ad';
            this.toggleBtn.disabled = disable || (this.state.loading && this.state.visible);
            if (!paused) {
                this.hidePanel();
            }
        });
    };

    exposeRefreshHandlers = () => {
        this.game.refreshLeaderboard = (options = {}) => {
            const key = options?.key ?? (this.state.loadedOnce ? 'leaderboard.refresh' : 'leaderboard.loading');
            const fallback = options?.fallback ?? (this.state.loadedOnce ? 'Refreshing leaderboardâ€¦' : 'Loading leaderboardâ€¦');
            return this.loadLeaderboard({ key, fallback });
        };
        this.game.refreshLeaderboardCopy = () => {
            this.setToggleLabel();
            this.refreshLoadingCopy();
            this.applyStoredError();
        };
    };

    refreshLoadingCopy = () => {
        if (this.state.loading) {
            this.setLoading(true, {
                key: this.state.loadingMessageKey ?? 'leaderboard.loading',
                fallback: this.state.loadingMessageFallback || 'Loading leaderboardâ€¦',
            });
            return;
        }
        this.setLoading(false);
    };

    setToggleLabel = () => {
        if (typeof this.toggleBtn.textContent !== 'string') {
            return;
        }
        const key = this.state.visible ? 'leaderboard.toggle.hide' : 'leaderboard.toggle.show';
        const fallback = this.state.visible ? 'Hide Global Leaderboard' : 'View Global Leaderboard';
        this.toggleBtn.textContent = translate(key, {}, fallback);
    };

    getLoadingTextEl = () => {
        if (!this.loadingEl) {
            return null;
        }
        return this.loadingEl.querySelector('[data-loading-text]');
    };

    clearList = () => {
        if (!this.listEl) {
            return;
        }
        if (typeof this.listEl.replaceChildren === 'function') {
            this.listEl.replaceChildren();
            return;
        }
        this.listEl.textContent = '';
    };

    setLoadingMessages = (loading, key, fallback) => {
        if (loading) {
            this.state.loadingMessageKey = key;
            this.state.loadingMessageFallback = fallback;
            return;
        }
        this.state.loadingMessageKey = null;
        this.state.loadingMessageFallback = '';
    };

    setLoading = (loading, options = {}) => {
        this.state.loading = loading;
        const key = options?.key ?? 'leaderboard.loading';
        const fallback = options?.fallback ?? 'Loading leaderboardâ€¦';
        this.updateLoadingElement(loading, key, fallback);
        this.setLoadingMessages(loading, key, fallback);
        this.panel.setAttribute('aria-busy', loading ? 'true' : 'false');
        if (this.listEl && typeof this.listEl.setAttribute === 'function') {
            this.listEl.setAttribute('aria-busy', loading ? 'true' : 'false');
        }
        if (this.retryBtn) {
            this.retryBtn.classList.toggle('hidden', loading);
            this.retryBtn.disabled = loading;
        }
        this.toggleBtn.disabled = loading && this.state.visible;
    };

    updateLoadingElement = (loading, key, fallback) => {
        if (!this.loadingEl) {
            return;
        }
        this.loadingEl.classList.toggle('hidden', !loading);
        const loadingTextEl = this.getLoadingTextEl();
        if (loading && loadingTextEl && typeof loadingTextEl.textContent !== 'undefined') {
            loadingTextEl.textContent = translate(key, {}, fallback);
        }
    };

    applyStoredError = () => {
        if (!this.errorEl) {
            return;
        }
        const hasError = Boolean(this.state.errorKey || this.state.errorFallback);
        const text = hasError
            ? translate(this.state.errorKey, this.state.errorParams ?? {}, this.state.errorFallback ?? '')
            : '';
        if (typeof this.errorEl.textContent !== 'undefined') {
            this.errorEl.textContent = text;
        }
        this.errorEl.classList.toggle('hidden', !text);
    };

    showError = ({ key = null, fallback = '', params = null } = {}) => {
        this.state.errorKey = key;
        this.state.errorFallback = fallback;
        this.state.errorParams = params;
        this.applyStoredError();
    };

    showEmpty = (visible) => {
        if (this.emptyEl) {
            this.emptyEl.classList.toggle('hidden', !visible);
        }
    };

    createEntryElement = (entry, index) => {
        const item = document.createElement('li');
        item.className = 'leaderboard__item';
        const position = document.createElement('span');
        position.className = 'leaderboard__entry-position';
        position.textContent = `${index + 1}.`;
        const name = document.createElement('span');
        name.className = 'leaderboard__entry-name';
        name.textContent = entry.name;
        const score = document.createElement('span');
        score.className = 'leaderboard__entry-score';
        score.textContent = formatScore(entry.score);
        item.append(position, name, score);
        return item;
    };

    renderEntries = (entries) => {
        if (!this.listEl) {
            return;
        }
        const fragment = typeof document !== 'undefined' && typeof document.createDocumentFragment === 'function'
            ? document.createDocumentFragment()
            : null;
        const target = fragment ?? this.listEl;
        entries.forEach((entry, index) => {
            target.appendChild(this.createEntryElement(entry, index));
        });
        if (fragment) {
            this.listEl.replaceChildren(fragment);
        }
    };

    hidePanel = () => {
        this.state.visible = false;
        this.panel.hidden = true;
        this.panel.classList.add('hidden');
        this.setToggleLabel();
        this.toggleBtn.setAttribute('aria-expanded', 'false');
    };

    showPanel = () => {
        this.state.visible = true;
        this.panel.hidden = false;
        this.panel.classList.remove('hidden');
        this.setToggleLabel();
        this.toggleBtn.setAttribute('aria-expanded', 'true');
    };

    localizeErrorDetail = (message) => {
        if (!message) {
            return translate('errors.unknown', {}, 'Unknown error');
        }
        if (message === 'Unknown error') {
            return translate('errors.unknown', {}, message);
        }
        if (message === 'Fetch API unavailable') {
            return translate('errors.fetchUnavailable', {}, message);
        }
        if (message === 'Request timed out') {
            return translate('errors.requestTimeout', {}, message);
        }
        if (message.startsWith('Request failed (' )) {
            return this.localizeFailedRequest(message);
        }
        if (message.startsWith('Request failed with status ')) {
            const match = message.match(/Request failed with status\s+(\d+)/);
            return match ? translate('errors.requestFailedStatus', { status: match[1] }, message) : message;
        }
        return message;
    };

    localizeFailedRequest = (message) => {
        const match = message.match(/Request failed \((\d+)\s*([^)]*)\)/);
        if (!match) {
            return message;
        }
        const [, status, text] = match;
        return translate('errors.requestFailedStatusText', { status, statusText: text?.trim() ?? '' }, message);
    };

    handleResult = (result) => {
        if (!result?.success) {
            this.handleResultError(result);
            return;
        }
        this.state.loadedOnce = true;
        const entries = Array.isArray(result.entries) ? result.entries : [];
        if (entries.length === 0) {
            this.clearList();
            this.showError();
            this.showEmpty(true);
            return;
        }
        this.showError();
        this.showEmpty(false);
        this.renderEntries(entries);
    };

    handleResultError = (result) => {
        const detail = this.localizeErrorDetail(result?.error);
        const fallback = result?.error ? `Unable to load leaderboard: ${result.error}` : 'Unable to load leaderboard.';
        this.showError({
            key: result?.error ? 'leaderboard.error.withMessage' : 'leaderboard.error.generic',
            fallback,
            params: result?.error ? { error: detail } : undefined,
        });
        this.clearList();
        this.showEmpty(false);
    };

    handleFailure = (error) => {
        const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
        console.warn('Leaderboard request failed', error);
        this.showError({
            key: 'leaderboard.error.withMessage',
            fallback: `Unable to load leaderboard: ${message}`,
            params: { error: this.localizeErrorDetail(message) },
        });
        this.clearList();
        this.showEmpty(false);
    };

    loadLeaderboard = (options = {}) => {
        if (this.state.loadPromise) {
            return this.state.loadPromise;
        }
        const key = options?.key ?? 'leaderboard.loading';
        const fallback = options?.fallback ?? 'Loading leaderboardâ€¦';
        this.setLoading(true, { key, fallback });
        this.showError();
        this.showEmpty(false);
        this.state.loadPromise = fetchLeaderboard()
            .then(this.handleResult)
            .catch(this.handleFailure)
            .finally(() => {
                this.setLoading(false);
                this.state.loadPromise = null;
            });
        return this.state.loadPromise;
    };

    toggleLeaderboard = () => {
        if (this.state.visible) {
            this.hidePanel();
            return;
        }
        this.showPanel();
        void this.loadLeaderboard();
    };
}

export function bindLeaderboard(game) {
    if (!game) {
        return;
    }
    const toggleBtn = game.leaderboardToggleBtn;
    const panel = game.leaderboardPanel;
    if (!toggleBtn || !panel) {
        return;
    }
    const controller = new LeaderboardController(game, toggleBtn, panel);
    controller.bind();
}

function resolveLeaderboardPlayerName(game) {
    const candidates = [
        typeof game?.playerName === 'string' ? game.playerName : null,
        typeof game?.crazyGamesUser?.username === 'string' ? game.crazyGamesUser.username : null,
        typeof globalThis !== 'undefined' && typeof globalThis.__latestCrazyGamesUser?.username === 'string'
            ? globalThis.__latestCrazyGamesUser.username
            : null,
    ];
    const selected = candidates.find((value) => typeof value === 'string' && value.trim()) ?? undefined;
    return resolvePlayerDisplayName(selected);
}

export function submitScoreToLeaderboard(game) {
    if (!game) {
        return;
    }
    const currentScore = normalizeScore(game?.score);
    if (currentScore <= 0) {
        return;
    }
    const playerName = resolveLeaderboardPlayerName(game);
    const submission = submitHighScore({ name: playerName, score: currentScore })
        .then((result) => handleHighScoreResult(game, result))
        .catch(handleHighScoreFailure);
    game.lastHighScoreSubmission = submission;
}

function handleHighScoreResult(game, result) {
    if (!result?.success) {
        return handleHighScoreFailure(result?.error ?? 'Request failed');
    }
    if (game.leaderboardState?.visible && typeof game.refreshLeaderboard === 'function') {
        void game.refreshLeaderboard({ key: 'leaderboard.refresh', fallback: 'Refreshing leaderboardâ€¦' });
    }
    return result;
}

function handleHighScoreFailure(error) {
    console.warn('Failed to submit global high score', error);
    return { success: false, error: error instanceof Error ? error.message : String(error ?? 'Unknown error') };
}
