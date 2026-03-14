export function withMockedRandom(values, fn) {
  const original = Math.random;
  let i = 0;
  Math.random = () => {
    const value = values[Math.min(i, values.length - 1)];
    i += 1;
    return value;
  };

  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

export function createMockCanvasContext() {
  const calls = [];
  const ctx = {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    beginPath: () => calls.push(['beginPath']),
    closePath: () => calls.push(['closePath']),
    fill: () => calls.push(['fill']),
    stroke: () => calls.push(['stroke']),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    arc: (...args) => calls.push(['arc', ...args]),
    ellipse: (...args) => calls.push(['ellipse', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    strokeRect: (...args) => calls.push(['strokeRect', ...args]),
    fillText: (...args) => calls.push(['fillText', ...args]),
  };
  return ctx;
}

export function createCombatEntity(name, col, row, dead = false) {
  return {
    constructor: { name },
    active: true,
    gridCol: col,
    gridRow: row,
    x: 0,
    y: 0,
    isDead: () => dead,
  };
}
