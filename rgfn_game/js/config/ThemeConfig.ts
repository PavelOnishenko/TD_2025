/**
 * Theme Configuration for RGFN Game
 * Fixed color palette - no theme switching
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

// Fixed game theme (classic terminal aesthetic)
const GAME_THEME: Theme = {
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

// Export the fixed theme
export const theme = GAME_THEME;

/**
 * Apply theme colors to CSS custom properties
 * Call this once on game initialization
 */
export function applyThemeToCSS(): void {
  const root = document.documentElement;

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
