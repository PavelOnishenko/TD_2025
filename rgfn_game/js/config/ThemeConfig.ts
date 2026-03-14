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
    textPrimary: string;
    textMuted: string;
    panelShadow: string;
    panelHighlight: string;
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

// Fixed game theme (light parchment fantasy aesthetic)
const GAME_THEME: Theme = {
  name: 'Royal Scroll',
  ui: {
    primaryBg: '#e8d7b3',
    secondaryBg: '#d5be93',
    canvasBg: '#ccaf80',
    primaryAccent: '#2e2013',
    secondaryAccent: '#8f5a2a',
    enemyColor: '#8f1f1f',
    warningColor: '#b75a1d',
    disabledColor: '#8d8069',
    systemMessageColor: '#3f2e1d',
    textPrimary: '#1f1207',
    textMuted: '#5b4630',
    panelShadow: '#947145',
    panelHighlight: '#f2e5c9',
  },
  entities: {
    player: {
      body: '#2f5ea8',
      face: '#f2debc',
      healthBg: '#604429',
      healthHigh: '#2f7f2f',
      healthMid: '#b78532',
      healthLow: '#8f1f1f',
    },
    skeleton: {
      body: '#d8ccbc',
      features: '#332318',
      healthBg: '#4f3924',
      healthBar: '#8f1f1f',
    },
  },
  worldMap: {
    background: '#c9ab7f',
    terrain: {
      grass: '#8da75d',
      forest: '#577235',
      mountain: '#948068',
      water: '#5f8ba8',
      desert: '#d4b17a',
    },
    unknown: '#a18a67',
    gridLines: 'rgba(46, 32, 19, 0.15)',
    playerMarker: '#8f1f1f',
  },
  battleMap: {
    background: '#ceb287',
    tileDark: 'rgba(159, 124, 78, 0.48)',
    tileLight: 'rgba(201, 167, 115, 0.52)',
    currentEntityPlayer: 'rgba(47, 94, 168, 0.3)',
    currentEntityEnemy: 'rgba(143, 31, 31, 0.28)',
    selectedEnemy: 'rgba(183, 90, 29, 0.23)',
    gridBorders: 'rgba(95, 64, 35, 0.45)',
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
  root.style.setProperty('--color-text-primary', theme.ui.textPrimary);
  root.style.setProperty('--color-text-muted', theme.ui.textMuted);
  root.style.setProperty('--color-panel-shadow', theme.ui.panelShadow);
  root.style.setProperty('--color-panel-highlight', theme.ui.panelHighlight);
}
