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

// Fixed game theme (fantasy parchment aesthetic)
const GAME_THEME: Theme = {
  name: 'Ancient Scroll',
  ui: {
    primaryBg: '#2a1c12',
    secondaryBg: '#5a3e2b',
    canvasBg: '#22160f',
    primaryAccent: '#f2d6a2',
    secondaryAccent: '#d8a55a',
    enemyColor: '#b6402f',
    warningColor: '#d97a38',
    disabledColor: '#7f6b58',
    systemMessageColor: '#e5cda2',
  },
  entities: {
    player: {
      body: '#f0d39a',
      face: '#f8ead3',
      healthBg: '#4d3625',
      healthHigh: '#6e9e49',
      healthMid: '#c68b3f',
      healthLow: '#b6402f',
    },
    skeleton: {
      body: '#d8c3a3',
      features: '#2e2014',
      healthBg: '#3a281c',
      healthBar: '#a6362a',
    },
  },
  worldMap: {
    background: '#271a12',
    terrain: {
      grass: '#6d7f43',
      forest: '#3f542b',
      mountain: '#76644f',
      water: '#3f6172',
      desert: '#b8935d',
    },
    unknown: '#352519',
    gridLines: 'rgba(242, 214, 162, 0.12)',
    playerMarker: '#f2d6a2',
  },
  battleMap: {
    background: '#2b1a12',
    tileDark: 'rgba(106, 68, 43, 0.45)',
    tileLight: 'rgba(73, 46, 28, 0.45)',
    currentEntityPlayer: 'rgba(242, 214, 162, 0.35)',
    currentEntityEnemy: 'rgba(182, 64, 47, 0.35)',
    selectedEnemy: 'rgba(216, 165, 90, 0.25)',
    gridBorders: 'rgba(216, 165, 90, 0.5)',
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
