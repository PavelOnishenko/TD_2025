const DEFAULT_LANGUAGE = 'en';
const BUILTIN_LANGUAGES = ['en', 'ru'];
const SUPPORTED_LANGUAGES = [...BUILTIN_LANGUAGES];
const STORAGE_KEY = 'td_language_preference';
const LOCALIZATION_PATH = 'assets/localization';

const languageCache = new Map();
const listeners = new Set();

let currentLanguage = DEFAULT_LANGUAGE;
let fallbackLanguage = DEFAULT_LANGUAGE;
let currentMessages = {};
let fallbackMessages = {};
let initialized = false;

function sanitizeLanguage(language) {
    if (typeof language !== 'string') {
        return DEFAULT_LANGUAGE;
    }
    const normalized = language.trim().toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(normalized)) {
        return normalized;
    }
    return DEFAULT_LANGUAGE;
}

function getStorage() {
    if (typeof globalThis === 'undefined') {
        return null;
    }
    try {
        const storage = globalThis.localStorage;
        if (!storage) {
            return null;
        }
        const hasRequiredMethods = typeof storage.getItem === 'function'
            && typeof storage.setItem === 'function'
            && typeof storage.removeItem === 'function';
        return hasRequiredMethods ? storage : null;
    } catch {
        return null;
    }
}

function loadStoredLanguage() {
    const storage = getStorage();
    if (!storage) {
        return null;
    }
    try {
        const stored = storage.getItem(STORAGE_KEY);
        if (typeof stored !== 'string' || !stored) {
            return null;
        }
        return sanitizeLanguage(stored);
    } catch {
        return null;
    }
}

function storeLanguagePreference(language) {
    const storage = getStorage();
    if (!storage) {
        return;
    }
    try {
        storage.setItem(STORAGE_KEY, language);
    } catch {
        // ignore storage errors
    }
}

async function fetchLanguageFile(language) {
    const cached = languageCache.get(language);
    if (cached) {
        return cached;
    }
    const url = `${LOCALIZATION_PATH}/${language}.json`;
    let response;
    try {
        response = await fetch(url);
    } catch (error) {
        console.warn(`Failed to fetch localization for "${language}"`, error);
        return {};
    }
    if (!response || !response.ok) {
        console.warn(`Localization file missing or invalid for "${language}"`);
        return {};
    }
    try {
        const messages = await response.json();
        languageCache.set(language, messages);
        return messages;
    } catch (error) {
        console.warn(`Failed to parse localization for "${language}"`, error);
        return {};
    }
}

function formatMessage(template, replacements = {}) {
    if (typeof template !== 'string' || !template.includes('{')) {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        if (Object.prototype.hasOwnProperty.call(replacements, key)) {
            const value = replacements[key];
            return value === undefined || value === null ? '' : String(value);
        }
        return match;
    });
}

function resolveMessage(key) {
    if (!key) {
        return undefined;
    }
    if (Object.prototype.hasOwnProperty.call(currentMessages, key)) {
        return currentMessages[key];
    }
    if (Object.prototype.hasOwnProperty.call(fallbackMessages, key)) {
        return fallbackMessages[key];
    }
    return undefined;
}

export function translate(key, replacements = {}, fallback = '') {
    const message = resolveMessage(key);
    if (typeof message === 'string') {
        return formatMessage(message, replacements);
    }
    if (typeof fallback === 'string' && fallback) {
        return formatMessage(fallback, replacements);
    }
    if (typeof key === 'string') {
        return formatMessage(key, replacements);
    }
    return '';
}

function notifyLanguageChanged() {
    for (const listener of listeners) {
        try {
            listener(currentLanguage);
        } catch (error) {
            console.warn('Localization listener failed', error);
        }
    }
}

function updateDocumentMetadata(language) {
    if (typeof document === 'undefined') {
        return;
    }
    const root = document.documentElement;
    if (root) {
        root.lang = language;
    }
    const title = translate('meta.title', {}, document.title);
    if (title && document.title !== title) {
        document.title = title;
    }
}

export function applyLocalization(root = typeof document !== 'undefined' ? document : null) {
    if (!root || typeof root.querySelectorAll !== 'function') {
        return;
    }
    const elements = root.querySelectorAll('[data-i18n]');
    elements.forEach((element) => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            element.textContent = translate(key, {}, element.textContent ?? '');
        }
    });
    const datasetElements = root.querySelectorAll('[data-i18n-attr]');
    datasetElements.forEach((element) => {
        const mappingsRaw = element.getAttribute('data-i18n-attr');
        if (!mappingsRaw) {
            return;
        }
        mappingsRaw.split(',').map(entry => entry.trim()).filter(Boolean).forEach((entry) => {
            const [attr, key] = entry.split(':').map(part => part.trim());
            if (!attr || !key) {
                return;
            }
            const value = translate(key, {}, element.getAttribute(attr) ?? '');
            if (value !== undefined) {
                element.setAttribute(attr, value);
            }
        });
    });
    updateDocumentMetadata(currentLanguage);
}

async function applyLanguage(language, options = {}) {
    const sanitized = sanitizeLanguage(language);
    const ensureFallbackLoaded = options.ensureFallbackLoaded !== false;
    if (ensureFallbackLoaded && Object.keys(fallbackMessages).length === 0) {
        fallbackMessages = await fetchLanguageFile(fallbackLanguage);
    }
    const messages = await fetchLanguageFile(sanitized);
    currentMessages = messages;
    currentLanguage = sanitized;
    if (!options.skipStorage) {
        storeLanguagePreference(sanitized);
    }
    updateDocumentMetadata(sanitized);
    applyLocalization();
    notifyLanguageChanged();
}

export async function initializeLocalization(options = {}) {
    if (initialized) {
        return currentLanguage;
    }
    const {
        defaultLanguage = DEFAULT_LANGUAGE,
        supportedLanguages = SUPPORTED_LANGUAGES,
        initialLanguage = undefined,
    } = options;
    if (Array.isArray(supportedLanguages) && supportedLanguages.length > 0) {
        supportedLanguages.forEach((lang) => {
            if (!SUPPORTED_LANGUAGES.includes(lang)) {
                SUPPORTED_LANGUAGES.push(lang);
            }
        });
    }
    fallbackLanguage = sanitizeLanguage(defaultLanguage);
    fallbackMessages = await fetchLanguageFile(fallbackLanguage);
    const stored = initialLanguage ? sanitizeLanguage(initialLanguage) : loadStoredLanguage();
    const targetLanguage = stored ?? fallbackLanguage;
    await applyLanguage(targetLanguage, { skipStorage: true, ensureFallbackLoaded: false });
    initialized = true;
    return currentLanguage;
}

export async function setLanguage(language) {
    await applyLanguage(language);
    return currentLanguage;
}

export function getCurrentLanguage() {
    return currentLanguage;
}

export function getAvailableLanguages() {
    return [...new Set([fallbackLanguage, ...SUPPORTED_LANGUAGES])];
}

export function onLanguageChanged(listener) {
    if (typeof listener !== 'function') {
        return () => {};
    }
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export const __testing = {
    sanitizeLanguage,
    formatMessage,
    resolveMessage,
    loadStoredLanguage,
    storeLanguagePreference,
    fetchLanguageFile,
    resetState: () => {
        languageCache.clear();
        listeners.clear();
        currentLanguage = DEFAULT_LANGUAGE;
        fallbackLanguage = DEFAULT_LANGUAGE;
        currentMessages = {};
        fallbackMessages = {};
        initialized = false;
        SUPPORTED_LANGUAGES.length = 0;
        SUPPORTED_LANGUAGES.push(...BUILTIN_LANGUAGES);
    },
};
