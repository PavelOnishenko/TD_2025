/**
 * Theme Editor UI Component
 * Provides an interface for customizing game colors and themes
 */

import { themeManager, PRESET_THEMES, Theme } from '../config/ThemeConfig.js';

export class ThemeEditor {
  private overlay: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onThemeChange?: () => void;

  /**
   * Initialize the theme editor
   */
  constructor(onThemeChangeCallback?: () => void) {
    this.onThemeChange = onThemeChangeCallback;
    this.createUI();
    this.attachEventListeners();
  }

  /**
   * Create the theme editor UI
   */
  private createUI(): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'theme-editor-overlay';
    overlay.className = 'theme-editor-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="theme-editor-modal">
        <div class="theme-editor-header">
          <h2>Theme Editor</h2>
          <button class="theme-editor-close" id="theme-editor-close" aria-label="Close">×</button>
        </div>

        <div class="theme-editor-content">
          <!-- Preset Themes -->
          <section class="theme-section">
            <h3>Preset Themes</h3>
            <div class="theme-presets" id="theme-presets">
              ${this.renderPresetButtons()}
            </div>
          </section>

          <!-- Custom Colors -->
          <section class="theme-section">
            <h3>Customize Colors</h3>

            <div class="theme-category">
              <h4>UI Colors</h4>
              <div class="color-grid">
                ${this.renderColorInput('ui.primaryAccent', 'Primary Accent')}
                ${this.renderColorInput('ui.secondaryAccent', 'Secondary Accent')}
                ${this.renderColorInput('ui.enemyColor', 'Enemy Color')}
                ${this.renderColorInput('ui.warningColor', 'Warning Color')}
              </div>
            </div>

            <div class="theme-category">
              <h4>Player Colors</h4>
              <div class="color-grid">
                ${this.renderColorInput('entities.player.body', 'Body')}
                ${this.renderColorInput('entities.player.face', 'Face')}
                ${this.renderColorInput('entities.player.healthHigh', 'Health High')}
                ${this.renderColorInput('entities.player.healthLow', 'Health Low')}
              </div>
            </div>

            <div class="theme-category">
              <h4>Enemy Colors</h4>
              <div class="color-grid">
                ${this.renderColorInput('entities.skeleton.body', 'Body')}
                ${this.renderColorInput('entities.skeleton.features', 'Features')}
                ${this.renderColorInput('entities.skeleton.healthBar', 'Health Bar')}
              </div>
            </div>

            <div class="theme-category">
              <h4>World Map Terrain</h4>
              <div class="color-grid">
                ${this.renderColorInput('worldMap.terrain.grass', 'Grass')}
                ${this.renderColorInput('worldMap.terrain.forest', 'Forest')}
                ${this.renderColorInput('worldMap.terrain.mountain', 'Mountain')}
                ${this.renderColorInput('worldMap.terrain.water', 'Water')}
                ${this.renderColorInput('worldMap.terrain.desert', 'Desert')}
                ${this.renderColorInput('worldMap.playerMarker', 'Player Marker')}
              </div>
            </div>
          </section>

          <!-- Actions -->
          <section class="theme-actions">
            <button class="theme-button theme-button-secondary" id="theme-reset">Reset to Classic</button>
            <button class="theme-button theme-button-primary" id="theme-apply">Apply & Close</button>
          </section>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Load current theme values into inputs
    this.loadThemeValues();
  }

  /**
   * Render preset theme buttons
   */
  private renderPresetButtons(): string {
    return PRESET_THEMES.map((theme, index) => `
      <button class="theme-preset-button" data-theme-index="${index}">
        <span class="theme-preset-name">${theme.name}</span>
        <div class="theme-preset-colors">
          <span class="theme-preset-color" style="background-color: ${theme.ui.primaryAccent}"></span>
          <span class="theme-preset-color" style="background-color: ${theme.ui.secondaryAccent}"></span>
          <span class="theme-preset-color" style="background-color: ${theme.entities.player.body}"></span>
        </div>
      </button>
    `).join('');
  }

  /**
   * Render a color input field
   */
  private renderColorInput(path: string, label: string): string {
    return `
      <div class="color-input-group">
        <label for="color-${path}">${label}</label>
        <input type="color" id="color-${path}" data-path="${path}" class="color-input" />
      </div>
    `;
  }

  /**
   * Load current theme values into input fields
   */
  private loadThemeValues(): void {
    if (!this.overlay) return;

    const theme = themeManager.getTheme();
    const inputs = this.overlay.querySelectorAll('.color-input');

    inputs.forEach((input) => {
      const htmlInput = input as HTMLInputElement;
      const path = htmlInput.dataset.path;
      if (path) {
        const value = this.getNestedProperty(theme, path);
        if (value && typeof value === 'string') {
          htmlInput.value = this.normalizeColor(value);
        }
      }
    });
  }

  /**
   * Get nested property from object using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Set nested property in object using dot notation
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((current, prop) => current[prop], obj);
    if (last) {
      target[last] = value;
    }
  }

  /**
   * Normalize color value (convert rgba to hex if needed)
   */
  private normalizeColor(color: string): string {
    // If it's already a hex color, return it
    if (color.startsWith('#')) {
      return color;
    }
    // For rgba values, just return a default for now
    return '#000000';
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.overlay) return;

    // Close button
    const closeBtn = this.overlay.querySelector('#theme-editor-close');
    closeBtn?.addEventListener('click', () => this.hide());

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Preset theme buttons
    const presetButtons = this.overlay.querySelectorAll('.theme-preset-button');
    presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt((btn as HTMLElement).dataset.themeIndex || '0');
        this.applyPresetTheme(index);
      });
    });

    // Color inputs - apply changes in real-time
    const colorInputs = this.overlay.querySelectorAll('.color-input');
    colorInputs.forEach((input) => {
      input.addEventListener('input', () => {
        this.applyColorChange(input as HTMLInputElement);
      });
    });

    // Reset button
    const resetBtn = this.overlay.querySelector('#theme-reset');
    resetBtn?.addEventListener('click', () => {
      this.applyPresetTheme(0); // Classic theme
    });

    // Apply button
    const applyBtn = this.overlay.querySelector('#theme-apply');
    applyBtn?.addEventListener('click', () => {
      this.hide();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.isVisible && e.key === 'Escape') {
        this.hide();
      }
    });
  }

  /**
   * Apply a preset theme
   */
  private applyPresetTheme(index: number): void {
    const theme = PRESET_THEMES[index];
    if (theme) {
      themeManager.setTheme(theme);
      this.loadThemeValues();
      this.notifyThemeChange();
    }
  }

  /**
   * Apply a color change from an input
   */
  private applyColorChange(input: HTMLInputElement): void {
    const path = input.dataset.path;
    if (!path) return;

    const currentTheme = { ...themeManager.getTheme() };
    this.setNestedProperty(currentTheme, path, input.value);
    themeManager.setTheme(currentTheme);
    this.notifyThemeChange();
  }

  /**
   * Notify game of theme change
   */
  private notifyThemeChange(): void {
    if (this.onThemeChange) {
      this.onThemeChange();
    }
  }

  /**
   * Show the theme editor
   */
  show(): void {
    if (this.overlay) {
      this.overlay.style.display = 'flex';
      this.isVisible = true;
      this.loadThemeValues();
    }
  }

  /**
   * Hide the theme editor
   */
  hide(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if editor is visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }
}
