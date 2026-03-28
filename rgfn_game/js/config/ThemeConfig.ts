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
    locationNameColor: string;
    itemNameColor: string;
    personNameColor: string;
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
    iconScale: {
      character: number;
      village: number;
    };
    questionMarkOffset: {
      x: number;
      y: number;
    };
    gridOffset: {
      x: number;
      y: number;
    };
    gridDimensions: {
      columns: number;
      rows: number;
    };
    viewportSize: {
      width: number;
      height: number;
    };
    cellSize: {
      default: number;
      min: number;
      max: number;
      zoomStep: number;
      panStepCells: number;
    };
    cellTravelMinutes: number;
    cellCornerRadius: number;
    connectorRadius: number;
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
    obstacleFill: string;
    obstacleEdge: string;
    obstacleShadow: string;
    gridSize: {
      columns: number;
      rows: number;
    };
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
    locationNameColor: '#355d8c',
    itemNameColor: '#7b4a24',
    personNameColor: '#6f2f75',
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
    gridLines: 'rgba(46, 32, 19, 0.12)',
    playerMarker: '#8f1f1f',
    iconScale: {
      character: 1,
      village: 0.5,
    },
    questionMarkOffset: {
      x: 0,
      y: 0,
    },
    gridOffset: {
      x: 0,
      y: 0,
    },
    gridDimensions: {
      columns: 100,
      rows: 100,
    },
    viewportSize: {
      width: 720,
      height: 720,
    },
    cellSize: {
      default: 28,
      min: 8,
      max: 64,
      zoomStep: 4,
      panStepCells: 4,
    },
    cellTravelMinutes: 12,
    cellCornerRadius: 10,
    connectorRadius: 16,
  },
  battleMap: {
    background: '#ceb287',
    tileDark: 'rgba(159, 124, 78, 0.48)',
    tileLight: 'rgba(201, 167, 115, 0.52)',
    currentEntityPlayer: 'rgba(47, 94, 168, 0.3)',
    currentEntityEnemy: 'rgba(143, 31, 31, 0.28)',
    selectedEnemy: 'rgba(183, 90, 29, 0.23)',
    gridBorders: 'rgba(95, 64, 35, 0.3)',
    obstacleFill: '#71553a',
    obstacleEdge: '#2e2013',
    obstacleShadow: 'rgba(46, 32, 19, 0.22)',
    gridSize: {
      columns: 10,
      rows: 8,
    },
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
  root.style.setProperty('--color-location-name', theme.ui.locationNameColor);
  root.style.setProperty('--color-item-name', theme.ui.itemNameColor);
  root.style.setProperty('--color-person-name', theme.ui.personNameColor);
  root.style.setProperty('--world-map-width', `${theme.worldMap.viewportSize.width}px`);
  root.style.setProperty('--world-map-height', `${theme.worldMap.viewportSize.height}px`);
}
