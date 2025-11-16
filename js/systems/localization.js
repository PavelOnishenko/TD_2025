const FALLBACK_LANGUAGE = 'en';
const LANGUAGE_PATH = 'assets/locales';
const localeCache = new Map();
const pendingLoads = new Map();
const listeners = new Set();
let currentLanguage = FALLBACK_LANGUAGE;

function sanitizeLanguage(language) {
    if (typeof language !== 'string') {
        return FALLBACK_LANGUAGE;
    }
    const normalized = language.trim().toLowerCase();
    return normalized || FALLBACK_LANGUAGE;
}

function resolveLocaleUrl(language) {
    const filename = `${language}.json`;
    const path = `${LANGUAGE_PATH}/${filename}`;
    const bases = [];
    if (typeof document !== 'undefined') {
        if (typeof document.baseURI === 'string' && document.baseURI) {
            bases.push(document.baseURI);
        }
        if (typeof document.URL === 'string' && document.URL) {
            bases.push(document.URL);
        }
    }
    const globalLocation = typeof location !== 'undefined' ? location : undefined;
    if (globalLocation && typeof globalLocation.href === 'string' && globalLocation.href) {
        bases.push(globalLocation.href);
    }
    if (typeof window !== 'undefined' && typeof window.location?.href === 'string' && window.location.href) {
        bases.push(window.location.href);
    }
    for (const base of bases) {
        try {
            return new URL(path, base).href;
        } catch (error) {
            // try next base candidate
        }
    }
    return null;
}

function getFetchImpl() {
    if (typeof fetch === 'function') {
        return fetch.bind(globalThis);
    }
    return null;
}

async function fetchLocale(language) {
    if (localeCache.has(language)) {
        return localeCache.get(language);
    }
    if (pendingLoads.has(language)) {
        return pendingLoads.get(language);
    }
    const hasDomContext = typeof window !== 'undefined'
        && (typeof document !== 'undefined' || typeof location !== 'undefined');
    if (!hasDomContext) {
        const empty = {};
        localeCache.set(language, empty);
        return empty;
    }
    const fetchFn = getFetchImpl();
    if (!fetchFn) {
        console.warn('Localization fetch unavailable');
        const empty = {};
        localeCache.set(language, empty);
        return empty;
    }
    const url = resolveLocaleUrl(language);
    if (!url) {
        const empty = {};
        localeCache.set(language, empty);
        return empty;
    }
    const promise = fetchFn(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load locale ${language}`);
            }
            return response.json();
        })
        .then(data => {
            const payload = data && typeof data === 'object' ? data : {};
            localeCache.set(language, payload);
            pendingLoads.delete(language);
            return payload;
        })
        .catch(error => {
            pendingLoads.delete(language);
            console.warn('Locale load failed', language, error);
            throw error;
        });
    pendingLoads.set(language, promise);
    return promise;
}

function notifyListeners(language) {
    if (listeners.size === 0) {
        return;
    }
    listeners.forEach(listener => {
        try {
            listener(language);
        } catch (error) {
            console.warn('Localization listener failed', error);
        }
    });
}

function resolveMessage(dictionary, key) {
    if (!dictionary || typeof dictionary !== 'object' || !key) {
        return undefined;
    }
    const parts = key.split('.');
    let current = dictionary;
    for (const part of parts) {
        if (current && Object.prototype.hasOwnProperty.call(current, part)) {
            current = current[part];
        }
        else {
            return undefined;
        }
    }
    return typeof current === 'string' ? current : undefined;
}

function formatMessage(template, params = {}) {
    if (typeof template !== 'string' || !template.includes('{')) {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, token) => {
        if (token in params) {
            return params[token];
        }
        return match;
    });
}

function getDictionary(language = currentLanguage) {
    return localeCache.get(language) ?? {};
}

export function translate(key, params = {}, fallback = '') {
    if (!key) {
        return typeof fallback === 'string' ? fallback : '';
    }
    const dictionaries = [getDictionary(currentLanguage)];
    if (currentLanguage !== FALLBACK_LANGUAGE) {
        dictionaries.push(getDictionary(FALLBACK_LANGUAGE));
    }
    for (const dict of dictionaries) {
        const template = resolveMessage(dict, key);
        if (typeof template === 'string') {
            return formatMessage(template, params);
        }
    }
    return formatMessage(typeof fallback === 'string' ? fallback : key, params);
}

function applyElementText(element, key) {
    if (!element || !key) {
        return;
    }
    let fallback = element.getAttribute('data-l10n-fallback');
    if (fallback === null) {
        fallback = element.textContent ?? '';
        element.setAttribute('data-l10n-fallback', fallback);
    }
    const text = translate(key, {}, fallback);
    if (typeof element.textContent !== 'undefined') {
        element.textContent = text;
    }
}

function applyAttributeLocalization(element, attrName, key) {
    if (!element || !attrName || !key) {
        return;
    }
    const fallbackAttr = `data-l10n-fallback-${attrName}`;
    let fallback = element.getAttribute(fallbackAttr);
    if (fallback === null) {
        fallback = element.getAttribute(attrName) ?? '';
        element.setAttribute(fallbackAttr, fallback);
    }
    const value = translate(key, {}, fallback);
    element.setAttribute(attrName, value);
}

export function applyLocalization(root = undefined) {
    const scope = root ?? (typeof document !== 'undefined' ? document : null);
    if (!scope) {
        return;
    }
    const elements = scope.querySelectorAll?.('[data-l10n]') ?? [];
    elements.forEach(element => {
        const key = element.getAttribute('data-l10n');
        if (key) {
            applyElementText(element, key);
        }
    });
    const attrElements = scope.querySelectorAll?.('[data-l10n-attrs]') ?? [];
    attrElements.forEach(element => {
        const attrSpec = element.getAttribute('data-l10n-attrs');
        if (!attrSpec) {
            return;
        }
        attrSpec.split(';').forEach(segment => {
            const [attrName, key] = segment.split(':').map(part => part.trim()).filter(Boolean);
            if (attrName && key) {
                applyAttributeLocalization(element, attrName, key);
            }
        });
    });
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('lang', currentLanguage);
    }
}

export async function setActiveLocale(language) {
    const target = sanitizeLanguage(language);
    const attempts = target === FALLBACK_LANGUAGE
        ? [target]
        : [target, FALLBACK_LANGUAGE];
    let resolvedLanguage = currentLanguage;
    for (const lang of attempts) {
        try {
            await fetchLocale(lang);
            resolvedLanguage = lang;
            break;
        } catch (error) {
            // try next language
        }
    }
    currentLanguage = resolvedLanguage;
    applyLocalization();
    notifyListeners(currentLanguage);
    return currentLanguage;
}

export function addLocaleChangeListener(listener) {
    if (typeof listener !== 'function') {
        return () => {};
    }
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getCurrentLocale() {
    return currentLanguage;
}
