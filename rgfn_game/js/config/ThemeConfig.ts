/**
 * Theme Configuration System for RGFN Game
 * Centralizes all color definitions for easy theme switching
 */

export interface Theme {
  name: string;

  // UI Colors
  ui: {
    primaryBg: string;
    secondaryBg: string;
    canvasBg: string;
    primaryAccent: string;
    secondaryAccent: string;
    enemyColor: string;
    warningColor: string;
    disabledColor: string;
    systemMessageColor: string;
  };

  // Entity Colors
  entities: {
    player: {
      body: string;
      face: string;
      healthBg: string;
      healthHigh: string;
      healthMid: string;
      healthLow: string;
    };
    skeleton: {
      body: string;
      features: string;
      healthBg: string;
      healthBar: string;
    };
  };

  // World Map Colors
  worldMap: {
    background: string;
    terrain: {
      grass: string;
      forest: string;
      mountain: string;
      water: string;
      desert: string;
    };
    unknown: string;
    gridLines: string;
    playerMarker: string;
  };

  // Battle Map Colors
  battleMap: {
    background: string;
    tileDark: string;
    tileLight: string;
    currentEntityPlayer: string;
    currentEntityEnemy: string;
    selectedEnemy: string;
    gridBorders: string;
  };
}

// Default Classic Theme (original green terminal aesthetic)
export const CLASSIC_THEME: Theme = {
  name: 'Classic Terminal',
  ui: {
    primaryBg: '#0a0a0a',
    secondaryBg: '#1a1a1a',
    canvasBg: '#000',
    primaryAccent: '#00ff00',
    secondaryAccent: '#00ccff',
    enemyColor: '#ff3333',
    warningColor: '#ff6600',
    disabledColor: '#666',
    systemMessageColor: '#cccccc',
  },
  entities: {
    player: {
      body: '#00ccff',
      face: '#ffffff',
      healthBg: '#333',
      healthHigh: '#4ade80',
      healthMid: '#fbbf24',
      healthLow: '#ef4444',
    },
    skeleton: {
      body: '#e6d5c3',
      features: '#000',
      healthBg: '#222',
      healthBar: '#ff4444',
    },
  },
  worldMap: {
    background: '#0a0a1a',
    terrain: {
      grass: '#4a7c3e',
      forest: '#2d5a2d',
      mountain: '#6b6b6b',
      water: '#3a6ea5',
      desert: '#c9a86a',
    },
    unknown: '#1a1a2a',
    gridLines: 'rgba(0, 255, 0, 0.1)',
    playerMarker: '#00ccff',
  },
  battleMap: {
    background: '#1a0a0a',
    tileDark: 'rgba(80, 30, 30, 0.4)',
    tileLight: 'rgba(40, 15, 15, 0.4)',
    currentEntityPlayer: 'rgba(0, 204, 255, 0.3)',
    currentEntityEnemy: 'rgba(255, 100, 0, 0.3)',
    selectedEnemy: 'rgba(0, 255, 0, 0.2)',
    gridBorders: 'rgba(255, 50, 50, 0.5)',
  },
};

// Ocean Theme - Blue and cyan palette
export const OCEAN_THEME: Theme = {
  name: 'Ocean Deep',
  ui: {
    primaryBg: '#0a1828',
    secondaryBg: '#1a2838',
    canvasBg: '#000',
    primaryAccent: '#00d9ff',
    secondaryAccent: '#00ffcc',
    enemyColor: '#ff6b6b',
    warningColor: '#ffa500',
    disabledColor: '#4a5a6a',
    systemMessageColor: '#a0c0d0',
  },
  entities: {
    player: {
      body: '#00d9ff',
      face: '#ffffff',
      healthBg: '#1a3a4a',
      healthHigh: '#00ffa3',
      healthMid: '#ffd700',
      healthLow: '#ff6b6b',
    },
    skeleton: {
      body: '#c0e0ff',
      features: '#003050',
      healthBg: '#0a2030',
      healthBar: '#ff8888',
    },
  },
  worldMap: {
    background: '#0a1428',
    terrain: {
      grass: '#4a9c7e',
      forest: '#2d6a5d',
      mountain: '#7b8b9b',
      water: '#2a6ea5',
      desert: '#d9c96a',
    },
    unknown: '#1a1a3a',
    gridLines: 'rgba(0, 217, 255, 0.1)',
    playerMarker: '#00ffcc',
  },
  battleMap: {
    background: '#0a1a2a',
    tileDark: 'rgba(30, 60, 80, 0.4)',
    tileLight: 'rgba(15, 40, 60, 0.4)',
    currentEntityPlayer: 'rgba(0, 217, 255, 0.3)',
    currentEntityEnemy: 'rgba(255, 130, 100, 0.3)',
    selectedEnemy: 'rgba(0, 255, 204, 0.2)',
    gridBorders: 'rgba(100, 150, 200, 0.5)',
  },
};

// Sunset Theme - Warm orange and purple palette
export const SUNSET_THEME: Theme = {
  name: 'Sunset Wasteland',
  ui: {
    primaryBg: '#1a0a0a',
    secondaryBg: '#2a1a1a',
    canvasBg: '#000',
    primaryAccent: '#ff8c00',
    secondaryAccent: '#ff6b9d',
    enemyColor: '#dc143c',
    warningColor: '#ffa500',
    disabledColor: '#6a4a4a',
    systemMessageColor: '#d0b0c0',
  },
  entities: {
    player: {
      body: '#ff8c00',
      face: '#ffffff',
      healthBg: '#3a2a2a',
      healthHigh: '#50de80',
      healthMid: '#ffb424',
      healthLow: '#ff4444',
    },
    skeleton: {
      body: '#d6b5a3',
      features: '#2a0a0a',
      healthBg: '#2a1a1a',
      healthBar: '#ff5555',
    },
  },
  worldMap: {
    background: '#1a0a1a',
    terrain: {
      grass: '#6a5c3e',
      forest: '#4d3a2d',
      mountain: '#8b6b7b',
      water: '#5a4ea5',
      desert: '#e9d97a',
    },
    unknown: '#2a1a2a',
    gridLines: 'rgba(255, 140, 0, 0.1)',
    playerMarker: '#ff6b9d',
  },
  battleMap: {
    background: '#1a0a1a',
    tileDark: 'rgba(80, 40, 30, 0.4)',
    tileLight: 'rgba(60, 25, 15, 0.4)',
    currentEntityPlayer: 'rgba(255, 140, 0, 0.3)',
    currentEntityEnemy: 'rgba(220, 20, 60, 0.3)',
    selectedEnemy: 'rgba(255, 107, 157, 0.2)',
    gridBorders: 'rgba(200, 100, 80, 0.5)',
  },
};

// Forest Theme - Green and earthy palette
export const FOREST_THEME: Theme = {
  name: 'Emerald Forest',
  ui: {
    primaryBg: '#0a1a0a',
    secondaryBg: '#1a2a1a',
    canvasBg: '#000',
    primaryAccent: '#32cd32',
    secondaryAccent: '#7cfc00',
    enemyColor: '#ff4500',
    warningColor: '#ffa500',
    disabledColor: '#4a6a4a',
    systemMessageColor: '#b0d0b0',
  },
  entities: {
    player: {
      body: '#7cfc00',
      face: '#ffffff',
      healthBg: '#2a3a2a',
      healthHigh: '#3ade80',
      healthMid: '#dcdc24',
      healthLow: '#ef4444',
    },
    skeleton: {
      body: '#c6d5b3',
      features: '#1a2a1a',
      healthBg: '#1a2a1a',
      healthBar: '#ff5544',
    },
  },
  worldMap: {
    background: '#0a1a0a',
    terrain: {
      grass: '#3a9c3e',
      forest: '#1d6a2d',
      mountain: '#6b8b6b',
      water: '#3a7ea5',
      desert: '#c9b96a',
    },
    unknown: '#1a2a1a',
    gridLines: 'rgba(50, 205, 50, 0.1)',
    playerMarker: '#7cfc00',
  },
  battleMap: {
    background: '#0a1a0a',
    tileDark: 'rgba(40, 60, 30, 0.4)',
    tileLight: 'rgba(20, 40, 15, 0.4)',
    currentEntityPlayer: 'rgba(124, 252, 0, 0.3)',
    currentEntityEnemy: 'rgba(255, 69, 0, 0.3)',
    selectedEnemy: 'rgba(50, 205, 50, 0.2)',
    gridBorders: 'rgba(100, 200, 80, 0.5)',
  },
};

// Cyberpunk Theme - Purple and pink neon palette
export const CYBERPUNK_THEME: Theme = {
  name: 'Neon Cyberpunk',
  ui: {
    primaryBg: '#0f0a1a',
    secondaryBg: '#1f1a2a',
    canvasBg: '#000',
    primaryAccent: '#da00ff',
    secondaryAccent: '#00ffff',
    enemyColor: '#ff0080',
    warningColor: '#ff00ff',
    disabledColor: '#5a4a6a',
    systemMessageColor: '#d0b0f0',
  },
  entities: {
    player: {
      body: '#00ffff',
      face: '#ffffff',
      healthBg: '#2a1a3a',
      healthHigh: '#00ff88',
      healthMid: '#ffaa00',
      healthLow: '#ff0080',
    },
    skeleton: {
      body: '#d6b5e3',
      features: '#2a0a3a',
      healthBg: '#1a0a2a',
      healthBar: '#ff0080',
    },
  },
  worldMap: {
    background: '#0a0a2a',
    terrain: {
      grass: '#5a4c7e',
      forest: '#3d2a5d',
      mountain: '#7b6b9b',
      water: '#4a3ea5',
      desert: '#c9a9da',
    },
    unknown: '#1a0a3a',
    gridLines: 'rgba(218, 0, 255, 0.1)',
    playerMarker: '#00ffff',
  },
  battleMap: {
    background: '#1a0a2a',
    tileDark: 'rgba(60, 30, 80, 0.4)',
    tileLight: 'rgba(40, 15, 60, 0.4)',
    currentEntityPlayer: 'rgba(0, 255, 255, 0.3)',
    currentEntityEnemy: 'rgba(255, 0, 128, 0.3)',
    selectedEnemy: 'rgba(218, 0, 255, 0.2)',
    gridBorders: 'rgba(200, 100, 255, 0.5)',
  },
};

// Preset themes array
export const PRESET_THEMES: Theme[] = [
  CLASSIC_THEME,
  OCEAN_THEME,
  SUNSET_THEME,
  FOREST_THEME,
  CYBERPUNK_THEME,
];

/**
 * Theme Manager - Handles theme application and persistence
 */
export class ThemeManager {
  private currentTheme: Theme;
  private readonly STORAGE_KEY = 'rgfn_theme';

  constructor() {
    // Load theme from localStorage or use classic theme as default
    this.currentTheme = this.loadTheme() || CLASSIC_THEME;
  }

  /**
   * Get the current active theme
   */
  getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Set a new theme and persist it
   */
  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.saveTheme();
    this.applyThemeToCSS();
  }

  /**
   * Load theme from localStorage
   */
  private loadTheme(): Theme | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
    return null;
  }

  /**
   * Save theme to localStorage
   */
  private saveTheme(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentTheme));
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }

  /**
   * Apply theme colors to CSS custom properties
   */
  applyThemeToCSS(): void {
    const root = document.documentElement;
    const theme = this.currentTheme;

    // UI colors
    root.style.setProperty('--color-primary-bg', theme.ui.primaryBg);
    root.style.setProperty('--color-secondary-bg', theme.ui.secondaryBg);
    root.style.setProperty('--color-canvas-bg', theme.ui.canvasBg);
    root.style.setProperty('--color-primary-accent', theme.ui.primaryAccent);
    root.style.setProperty('--color-secondary-accent', theme.ui.secondaryAccent);
    root.style.setProperty('--color-enemy', theme.ui.enemyColor);
    root.style.setProperty('--color-warning', theme.ui.warningColor);
    root.style.setProperty('--color-disabled', theme.ui.disabledColor);
    root.style.setProperty('--color-system-message', theme.ui.systemMessageColor);
  }

  /**
   * Reset to classic theme
   */
  resetToDefault(): void {
    this.setTheme(CLASSIC_THEME);
  }
}

// Export singleton instance
export const themeManager = new ThemeManager();
