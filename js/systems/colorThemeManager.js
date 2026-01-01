/**
 * Color Theme Manager
 * Provides a GUI to configure and manage color themes used in the game
 *
 * Note: This manager allows you to create and manage color themes.
 * To apply themes to the game, the color constants in js/core/render.js
 * need to be made dynamic. This is a future enhancement.
 */

const STORAGE_KEY = 'td_color_themes_v1';
const DEFAULT_THEME_NAME = 'default';

// Default color values from js/core/render.js
const DEFAULT_COLORS = {
    energy: {
        red: { core: '#fff4f6', mid: '#ff6d6d', outer: '#ff2f45', sparkle: '#ffd1dc' },
        blue: { core: '#ecfbff', mid: '#4cb9ff', outer: '#2e63ff', sparkle: '#bde4ff' },
        green: { core: '#f2fff0', mid: '#63ff9a', outer: '#00c95a', sparkle: '#cbffd8' },
        purple: { core: '#f9f1ff', mid: '#c76bff', outer: '#7f3dff', sparkle: '#efd4ff' },
    },
    minigun: {
        red: { trail: 'rgba(255, 108, 52, 0.5)', glow: 'rgba(255, 158, 96, 0.45)', core: 'rgba(255, 244, 232, 0.95)', spark: 'rgba(255, 240, 200, 0.55)' },
        blue: { trail: 'rgba(76, 184, 255, 0.5)', glow: 'rgba(132, 216, 255, 0.45)', core: 'rgba(232, 248, 255, 0.95)', spark: 'rgba(210, 236, 255, 0.6)' },
    },
    railgun: {
        red: { outer: [255, 120, 118], mid: [255, 216, 176], core: [255, 255, 255], flare: [255, 226, 200] },
        blue: { outer: [112, 184, 255], mid: [176, 226, 255], core: [255, 255, 255], flare: [210, 236, 255] },
    },
    rocket: {
        red: { shell: '#fdfdfd', stripe: '#ff6d6d', trail: 'rgba(255, 124, 64, 0.32)', flameCore: 'rgba(255, 228, 140, 0.95)', flameEdge: 'rgba(255, 118, 64, 0)' },
        blue: { shell: '#f6fbff', stripe: '#4cb9ff', trail: 'rgba(108, 204, 255, 0.32)', flameCore: 'rgba(200, 240, 255, 0.95)', flameEdge: 'rgba(64, 160, 255, 0)' },
    },
};

// Color categories and their properties
const COLOR_CATEGORIES = {
    energy: {
        label: 'Energy Effects',
        colors: ['red', 'blue', 'green', 'purple'],
        properties: [
            { key: 'core', label: 'Core', type: 'color' },
            { key: 'mid', label: 'Mid', type: 'color' },
            { key: 'outer', label: 'Outer', type: 'color' },
            { key: 'sparkle', label: 'Sparkle', type: 'color' },
        ],
    },
    minigun: {
        label: 'Minigun',
        colors: ['red', 'blue'],
        properties: [
            { key: 'trail', label: 'Trail', type: 'rgba' },
            { key: 'glow', label: 'Glow', type: 'rgba' },
            { key: 'core', label: 'Core', type: 'rgba' },
            { key: 'spark', label: 'Spark', type: 'rgba' },
        ],
    },
    railgun: {
        label: 'Railgun',
        colors: ['red', 'blue'],
        properties: [
            { key: 'outer', label: 'Outer', type: 'rgb-array' },
            { key: 'mid', label: 'Mid', type: 'rgb-array' },
            { key: 'core', label: 'Core', type: 'rgb-array' },
            { key: 'flare', label: 'Flare', type: 'rgb-array' },
        ],
    },
    rocket: {
        label: 'Rocket',
        colors: ['red', 'blue'],
        properties: [
            { key: 'shell', label: 'Shell', type: 'color' },
            { key: 'stripe', label: 'Stripe', type: 'color' },
            { key: 'trail', label: 'Trail', type: 'rgba' },
            { key: 'flameCore', label: 'Flame Core', type: 'rgba' },
            { key: 'flameEdge', label: 'Flame Edge', type: 'rgba' },
        ],
    },
};

function getStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return null;
    }
    return window.localStorage;
}

function readSavedThemes(storage) {
    if (!storage) {
        return {};
    }
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return {};
        }
        return parsed;
    } catch (error) {
        console.warn('Failed to read saved themes', error);
        return {};
    }
}

function writeSavedThemes(storage, themes) {
    if (!storage) {
        return false;
    }
    try {
        storage.setItem(STORAGE_KEY, JSON.stringify(themes));
        return true;
    } catch (error) {
        console.warn('Failed to write saved themes', error);
        return false;
    }
}

function normalizeThemeName(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().slice(0, 50);
}

function parseColorValue(value, type) {
    if (type === 'rgb-array') {
        // Parse "[255, 128, 64]" or "255, 128, 64" to [255, 128, 64]
        if (Array.isArray(value)) {
            return value.slice(0, 3).map(v => Math.max(0, Math.min(255, parseInt(v) || 0)));
        }
        const str = String(value).replace(/[\[\]]/g, '').trim();
        const parts = str.split(',').map(s => parseInt(s.trim()) || 0);
        return parts.slice(0, 3).map(v => Math.max(0, Math.min(255, v)));
    }
    return String(value);
}

function formatColorValue(value, type) {
    if (type === 'rgb-array') {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return '255, 255, 255';
    }
    return String(value);
}

function getDefaultColorValue(category, colorName, propertyKey) {
    return DEFAULT_COLORS?.[category]?.[colorName]?.[propertyKey] || '';
}

function extractCurrentTheme(game) {
    // Extract current color configuration from the default values
    // In the future, this could read from dynamic game state
    return {
        name: 'default',
        timestamp: Date.now(),
        colors: JSON.parse(JSON.stringify(DEFAULT_COLORS)),
    };
}

function createColorInput(category, colorName, property, currentValue, onChange) {
    const container = document.createElement('div');
    container.className = 'color-theme__input-group';

    const label = document.createElement('label');
    label.className = 'color-theme__label';
    label.textContent = property.label;

    const input = document.createElement('input');
    input.className = 'dev-modal__input color-theme__input';

    // Use current value or fall back to default
    const defaultValue = getDefaultColorValue(category, colorName, property.key);
    const value = currentValue !== undefined && currentValue !== '' ? currentValue : defaultValue;

    if (property.type === 'color') {
        // For hex colors, show both color picker and text input
        const wrapper = document.createElement('div');
        wrapper.className = 'color-theme__color-wrapper';

        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.className = 'color-theme__color-picker';
        colorPicker.value = value || '#ffffff';

        input.type = 'text';
        input.value = value || '#ffffff';
        input.placeholder = '#ffffff';

        colorPicker.addEventListener('input', () => {
            input.value = colorPicker.value;
            onChange(category, colorName, property.key, colorPicker.value);
        });

        input.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
                colorPicker.value = input.value;
            }
            onChange(category, colorName, property.key, input.value);
        });

        wrapper.append(colorPicker, input);
        container.append(label, wrapper);
        return container;
    } else if (property.type === 'rgba' || property.type === 'rgb-array') {
        input.type = 'text';
        input.value = formatColorValue(value, property.type);
        input.placeholder = property.type === 'rgb-array' ? '255, 128, 64' : 'rgba(255, 128, 64, 0.5)';

        input.addEventListener('input', () => {
            onChange(category, colorName, property.key, input.value);
        });

        container.append(label, input);
        return container;
    }

    container.append(label, input);
    return container;
}

function createColorSection(category, categoryConfig, themeData, onChange) {
    const section = document.createElement('section');
    section.className = 'dev-modal__section';
    section.setAttribute('aria-label', categoryConfig.label);

    const header = document.createElement('div');
    header.className = 'dev-modal__section-header';

    const headerContent = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'dev-modal__eyebrow';
    eyebrow.textContent = 'Color Group';

    const title = document.createElement('h3');
    title.className = 'dev-modal__section-title';
    title.textContent = categoryConfig.label;

    headerContent.append(eyebrow, title);
    header.appendChild(headerContent);
    section.appendChild(header);

    // Create tabs or accordion for each color variant
    categoryConfig.colors.forEach(colorName => {
        const colorGroup = document.createElement('details');
        colorGroup.className = 'color-theme__color-group';
        colorGroup.open = colorName === categoryConfig.colors[0]; // Open first by default

        const summary = document.createElement('summary');
        summary.className = 'color-theme__color-summary';
        summary.textContent = colorName.charAt(0).toUpperCase() + colorName.slice(1);

        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'color-theme__inputs';

        categoryConfig.properties.forEach(property => {
            const currentValue = themeData?.colors?.[category]?.[colorName]?.[property.key];
            const inputGroup = createColorInput(category, colorName, property, currentValue, onChange);
            inputsContainer.appendChild(inputGroup);
        });

        colorGroup.append(summary, inputsContainer);
        section.appendChild(colorGroup);
    });

    return section;
}

function downloadThemeJSON(theme, filename) {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function toggleModal(modalEl, open) {
    if (!modalEl) {
        return;
    }
    modalEl.classList.toggle('dev-modal--hidden', !open);
}

export function initColorThemeManager(game) {
    if (!game) {
        return;
    }

    const openBtn = document.getElementById('openColorThemeManager');
    const modal = document.getElementById('colorThemeManager');
    const closeBtn = document.getElementById('closeColorThemeManager');
    const contentContainer = document.getElementById('colorThemeContent');
    const saveThemeBtn = document.getElementById('saveColorTheme');
    const exportThemeBtn = document.getElementById('exportColorTheme');
    const importThemeInput = document.getElementById('importColorTheme');
    const themeNameInput = document.getElementById('colorThemeName');
    const storage = getStorage();

    if (!openBtn || !modal) {
        return;
    }

    const state = {
        themes: readSavedThemes(storage),
        currentTheme: extractCurrentTheme(game),
    };

    const handleColorChange = (category, colorName, property, value) => {
        if (!state.currentTheme.colors[category]) {
            state.currentTheme.colors[category] = {};
        }
        if (!state.currentTheme.colors[category][colorName]) {
            state.currentTheme.colors[category][colorName] = {};
        }

        const categoryConfig = COLOR_CATEGORIES[category];
        const propertyConfig = categoryConfig?.properties.find(p => p.key === property);

        if (propertyConfig) {
            state.currentTheme.colors[category][colorName][property] =
                parseColorValue(value, propertyConfig.type);
        } else {
            state.currentTheme.colors[category][colorName][property] = value;
        }
    };

    const renderThemeEditor = () => {
        if (!contentContainer) {
            return;
        }

        contentContainer.innerHTML = '';

        Object.entries(COLOR_CATEGORIES).forEach(([categoryKey, categoryConfig]) => {
            const section = createColorSection(
                categoryKey,
                categoryConfig,
                state.currentTheme,
                handleColorChange
            );
            contentContainer.appendChild(section);
        });
    };

    const saveCurrentTheme = () => {
        const name = normalizeThemeName(themeNameInput?.value ?? '');
        if (!name) {
            alert('Please enter a theme name');
            return;
        }

        const theme = {
            ...state.currentTheme,
            name,
            timestamp: Date.now(),
        };

        state.themes[name] = theme;
        writeSavedThemes(storage, state.themes);

        if (themeNameInput) {
            themeNameInput.value = '';
        }

        alert(`Theme "${name}" saved successfully!`);
    };

    const exportCurrentTheme = () => {
        const name = normalizeThemeName(themeNameInput?.value ?? state.currentTheme.name ?? 'theme');
        const theme = {
            ...state.currentTheme,
            name,
            timestamp: Date.now(),
        };

        const filename = `color_theme_${name}_${Date.now()}.json`;
        downloadThemeJSON(theme, filename);
    };

    const importTheme = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported && typeof imported === 'object' && imported.colors) {
                    state.currentTheme = imported;
                    renderThemeEditor();
                    alert(`Theme "${imported.name || 'imported'}" loaded successfully!`);
                } else {
                    alert('Invalid theme file format');
                }
            } catch (error) {
                console.error('Failed to import theme', error);
                alert('Failed to import theme file');
            }
        };
        reader.readAsText(file);
    };

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            renderThemeEditor();
            toggleModal(modal, true);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => toggleModal(modal, false));
    }

    if (saveThemeBtn) {
        saveThemeBtn.addEventListener('click', saveCurrentTheme);
    }

    if (exportThemeBtn) {
        exportThemeBtn.addEventListener('click', exportCurrentTheme);
    }

    if (importThemeInput) {
        importThemeInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) {
                importTheme(file);
            }
        });
    }

    modal.addEventListener('click', (event) => {
        const target = event.target;
        const clickedBackdrop = target === modal ||
            (target instanceof HTMLElement && target.classList.contains('dev-modal__backdrop'));
        if (clickedBackdrop) {
            toggleModal(modal, false);
        }
    });

    const handleKeydown = (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('dev-modal--hidden')) {
            toggleModal(modal, false);
        }
    };
    window.addEventListener('keydown', handleKeydown);

    toggleModal(modal, false);
}

export default initColorThemeManager;
