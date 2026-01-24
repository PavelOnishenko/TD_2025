/**
 * Decoration configuration for Eva game
 * Visual parameters for decorative elements like grids, backgrounds, etc.
 */

export const decorationConfig = {
  grid: {
    // Grid cell size in pixels
    cellSize: 50,

    // Grid line appearance
    strokeColor: 'rgba(100, 100, 150, 0.3)',
    lineWidth: 1,

    // Perspective settings
    perspective: {
      // How much the grid narrows at the top (0.0 to 1.0)
      // 0.3 means the top will be 30% of the full width
      factor: 0.45
    },
  },
};
