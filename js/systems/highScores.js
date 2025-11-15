const SERVICE_BASE_URL = 'https://highscorewebservice.onrender.com';
const DEFAULT_TIMEOUT = 4000;
const MAX_LEADERBOARD_ENTRIES = 10;
const FALLBACK_PLAYER_NAME = 'Neon Defender';

function toErrorMessage(error) {
    if (!error) {
        return 'Unknown error';
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error instanceof Error && typeof error.message === 'string') {
        return error.message;
    }
    if (typeof error === 'object') {
        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
    return String(error);
}

function sanitizeTimeout(timeout) {
    if (!Number.isFinite(timeout)) {
        return DEFAULT_TIMEOUT;
    }
    const clamped = Math.max(100, Math.floor(timeout));
    return clamped;
}

function sanitizePlayerName(name) {
    if (typeof name !== 'string') {
        return FALLBACK_PLAYER_NAME;
    }
    const trimmed = name.trim();
    if (!trimmed) {
        return FALLBACK_PLAYER_NAME;
    }
    return trimmed.slice(0, 24);
}

function sanitizeScoreValue(score) {
    const numeric = Number(score);
    if (!Number.isFinite(numeric)) {
        return 0;
    }
    return Math.max(0, Math.floor(numeric));
}

function normalizeLeaderboardEntries(rawEntries) {
    if (!Array.isArray(rawEntries)) {
        return [];
    }
    return rawEntries
        .map(entry => ({
            name: sanitizePlayerName(entry?.name),
            score: sanitizeScoreValue(entry?.score),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_LEADERBOARD_ENTRIES);
}

function resolveFetchImpl(fetchImpl) {
    if (typeof fetchImpl === 'function') {
        return fetchImpl;
    }
    const globalFetch = typeof globalThis !== 'undefined' ? globalThis.fetch : null;
    if (typeof globalFetch === 'function') {
        return globalFetch.bind(globalThis);
    }
    return null;
}

function linkAbortSignals(controller, externalSignal) {
    if (!externalSignal || typeof externalSignal.addEventListener !== 'function') {
        return () => {};
    }
    if (externalSignal.aborted) {
        controller.abort(externalSignal.reason ?? new Error('Aborted'));
        return () => {};
    }
    const abortHandler = () => {
        controller.abort(externalSignal.reason ?? new Error('Aborted'));
    };
    externalSignal.addEventListener('abort', abortHandler, { once: true });
    return () => {
        try {
            externalSignal.removeEventListener('abort', abortHandler);
        } catch {
            // ignore cleanup errors
        }
    };
}

async function performRequest(path, options = {}) {
    const {
        method = 'GET',
        body = undefined,
        headers = undefined,
        timeout = DEFAULT_TIMEOUT,
        signal = undefined,
        fetchImpl = undefined,
    } = options;

    const fetchFn = resolveFetchImpl(fetchImpl);
    if (!fetchFn) {
        return { ok: false, error: 'Fetch API unavailable' };
    }

    const controller = new AbortController();
    const effectiveTimeout = sanitizeTimeout(timeout);
    const timeoutHost = typeof globalThis !== 'undefined' ? globalThis : undefined;
    const clearTimeoutFn = timeoutHost?.clearTimeout?.bind(timeoutHost);
    const setTimeoutFn = timeoutHost?.setTimeout?.bind(timeoutHost);
    const timeoutHandle = typeof setTimeoutFn === 'function'
        ? setTimeoutFn(() => {
            controller.abort(new Error('Request timed out'));
        }, effectiveTimeout)
        : null;
    const cleanupLinkedAbort = linkAbortSignals(controller, signal);

    let response;
    try {
        response = await fetchFn(`${SERVICE_BASE_URL}${path}`, {
            method,
            headers,
            body,
            signal: controller.signal,
        });
    } catch (error) {
        cleanupLinkedAbort();
        if (timeoutHandle && typeof clearTimeoutFn === 'function') {
            clearTimeoutFn(timeoutHandle);
        }
        const message = error?.name === 'AbortError'
            ? toErrorMessage(controller.signal.reason ?? error)
            : toErrorMessage(error);
        return { ok: false, error: message };
    }

    cleanupLinkedAbort();
    if (timeoutHandle && typeof clearTimeoutFn === 'function') {
        clearTimeoutFn(timeoutHandle);
    }

    let payload = null;
    try {
        const text = await response.text();
        if (text) {
            payload = JSON.parse(text);
        }
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const status = Number.isFinite(response.status) ? response.status : 0;
        const statusText = typeof response.statusText === 'string' ? response.statusText : '';
        const message = statusText ? `Request failed (${status} ${statusText})` : `Request failed with status ${status}`;
        return { ok: false, status, error: message, data: payload };
    }

    return { ok: true, data: payload };
}

export async function fetchLeaderboard(options = {}) {
    const { timeout = DEFAULT_TIMEOUT, fetchImpl = undefined, signal = undefined } = options;
    const result = await performRequest('/leaders', { method: 'GET', timeout, fetchImpl, signal });
    if (!result.ok) {
        return { success: false, entries: [], error: result.error };
    }
    const entries = normalizeLeaderboardEntries(result.data);
    return { success: true, entries };
}

export async function submitHighScore({ name, score }, options = {}) {
    const { timeout = DEFAULT_TIMEOUT, fetchImpl = undefined, signal = undefined } = options;
    const payload = {
        name: sanitizePlayerName(name),
        score: sanitizeScoreValue(score),
    };
    const result = await performRequest('/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout,
        fetchImpl,
        signal,
    });
    if (!result.ok) {
        return { success: false, error: result.error };
    }
    return { success: true };
}

export function resolvePlayerDisplayName(rawName) {
    return sanitizePlayerName(rawName);
}

export function normalizeScore(score) {
    return sanitizeScoreValue(score);
}

export const __testing = {
    performRequest,
    sanitizePlayerName,
    sanitizeScoreValue,
    normalizeLeaderboardEntries,
    resolveFetchImpl,
};
