import test from 'node:test';
import assert from 'node:assert/strict';

import {
    initializeLocalization,
    setLanguage,
    getCurrentLanguage,
    translate,
    applyLocalization,
    __testing,
} from '../js/systems/localization.js';

const { formatMessage, sanitizeLanguage, resetState } = __testing;

const translationsFixture = {
    en: {
        greeting: 'Hello commander',
        'meta.title': 'Neon Void',
        'hud.buttons.merge': 'Merge Towers',
        'pause.leaderboard.show': 'View Global Leaderboard',
        'pause.leaderboard.hide': 'Hide Global Leaderboard',
    },
    ru: {
        greeting: 'Привет, командир',
        'meta.title': 'Неоновая Пустота',
        'hud.buttons.merge': 'Объединить башни',
        'pause.leaderboard.show': 'Показать глобальный рейтинг',
        'pause.leaderboard.hide': 'Скрыть глобальный рейтинг',
    },
};

function createFetchStub(translations = translationsFixture) {
    return async (url) => {
        const match = /assets\/localization\/(\w+)\.json$/.exec(url);
        const lang = match?.[1];
        if (!lang || !translations[lang]) {
            return { ok: false, json: async () => ({}) };
        }
        return {
            ok: true,
            async json() {
                return translations[lang];
            },
        };
    };
}

function createMockStorage() {
    const store = new Map();
    return {
        getItem(key) {
            if (!store.has(key)) {
                return null;
            }
            return store.get(key);
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
    };
}

function createMockElement({
    dataI18n,
    dataI18nAttr,
    textContent = '',
    attributes = {},
} = {}) {
    const attrStore = new Map(Object.entries(attributes));
    if (dataI18n) {
        attrStore.set('data-i18n', dataI18n);
    }
    if (dataI18nAttr) {
        attrStore.set('data-i18n-attr', dataI18nAttr);
    }
    let text = textContent;
    return {
        getAttribute(name) {
            return attrStore.has(name) ? attrStore.get(name) : null;
        },
        setAttribute(name, value) {
            attrStore.set(name, value);
        },
        get textContent() {
            return text;
        },
        set textContent(value) {
            text = value;
        },
    };
}

test.beforeEach(() => {
    resetState();
});

test('formatMessage replaces named placeholders', () => {
    const template = 'Wave {current}/{total} - {status}!';
    const result = formatMessage(template, { current: 5, total: 10, status: 'active' });
    assert.equal(result, 'Wave 5/10 - active!');
});

test('sanitizeLanguage normalizes supported language codes', () => {
    assert.equal(sanitizeLanguage('EN'), 'en');
    assert.equal(sanitizeLanguage('ru'), 'ru');
    assert.equal(sanitizeLanguage('unknown'), 'en');
    assert.equal(sanitizeLanguage(undefined), 'en');
});

test('initializeLocalization loads translations and switches languages', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = createFetchStub();

    try {
        await initializeLocalization({ defaultLanguage: 'en', supportedLanguages: ['en', 'ru'], initialLanguage: 'ru' });
        assert.equal(getCurrentLanguage(), 'ru');
        assert.equal(translate('greeting', {}, 'fallback'), 'Привет, командир');

        await setLanguage('en');
        assert.equal(getCurrentLanguage(), 'en');
        assert.equal(translate('greeting', {}, 'fallback'), 'Hello commander');
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});

test('setLanguage persists preference using storage when available', async () => {
    const originalFetch = globalThis.fetch;
    const originalStorage = globalThis.localStorage;
    globalThis.fetch = createFetchStub();
    globalThis.localStorage = createMockStorage();

    try {
        await initializeLocalization({ defaultLanguage: 'en', supportedLanguages: ['en', 'ru'] });
        assert.equal(globalThis.localStorage.getItem('td_language_preference'), null);

        await setLanguage('ru');
        assert.equal(globalThis.localStorage.getItem('td_language_preference'), 'ru');

        await setLanguage('en');
        assert.equal(globalThis.localStorage.getItem('td_language_preference'), 'en');
    }
    finally {
        globalThis.fetch = originalFetch;
        if (typeof originalStorage === 'undefined') {
            delete globalThis.localStorage;
        }
        else {
            globalThis.localStorage = originalStorage;
        }
    }
});

test('applyLocalization updates text nodes and attributes', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = createFetchStub();

    const textElement = createMockElement({
        dataI18n: 'hud.buttons.merge',
        textContent: 'Merge',
    });
    const attrElement = createMockElement({
        dataI18nAttr: 'title:pause.leaderboard.show,aria-label:pause.leaderboard.hide',
        attributes: {
            title: 'Show leaderboard',
            'aria-label': 'Hide leaderboard',
        },
    });
    const root = {
        querySelectorAll(selector) {
            if (selector === '[data-i18n]') {
                return [textElement];
            }
            if (selector === '[data-i18n-attr]') {
                return [attrElement];
            }
            return [];
        },
    };

    try {
        await initializeLocalization({ defaultLanguage: 'en', supportedLanguages: ['en', 'ru'], initialLanguage: 'ru' });
        applyLocalization(root);

        assert.equal(textElement.textContent, 'Объединить башни');
        assert.equal(attrElement.getAttribute('title'), 'Показать глобальный рейтинг');
        assert.equal(attrElement.getAttribute('aria-label'), 'Скрыть глобальный рейтинг');
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
