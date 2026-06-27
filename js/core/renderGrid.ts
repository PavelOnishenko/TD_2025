const drawCellImage = (ctx, cell, cellImage) => {
    if (!cell.occupied && cellImage) {
        ctx.drawImage(cellImage, cell.x, cell.y, cell.w, cell.h);
    }
};

const drawCellHover = (ctx, cell) => {
    if (cell.occupied || cell.hover <= 0) {
        return;
    }

    const alpha = Math.min(0.35, 0.18 + cell.hover * 0.35);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(160, 220, 255, 1)';
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.restore();
};

const drawPreparationPulse = (ctx, cell, elapsed) => {
    if (cell.occupied) {
        return;
    }

    const centerX = cell.x + cell.w / 2;
    const centerY = cell.y + cell.h / 2;
    const pulse = Math.sin(elapsed * 2.8 + (cell.x + cell.y) * 0.008);
    const easedPulse = Math.pow((pulse + 1) / 2, 0.7);
    const baseRadius = Math.min(cell.w, cell.h) / 2;
    const innerRadius = baseRadius * 0.4;
    const glowRadius = baseRadius * (0.9 + easedPulse * 0.12);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.12 + easedPulse * 0.22;
    ctx.fillStyle = createPreparationFill(ctx, centerX, centerY, innerRadius, glowRadius);
    ctx.fillRect(centerX - glowRadius, centerY - glowRadius, glowRadius * 2, glowRadius * 2);
    ctx.restore();
};

const createPreparationFill = (ctx, centerX, centerY, innerRadius, glowRadius) => {
    if (typeof ctx.createRadialGradient !== 'function') {
        return 'rgba(128, 234, 255, 0.45)';
    }

    const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, glowRadius);
    gradient.addColorStop(0, 'rgba(150, 245, 255, 0.98)');
    gradient.addColorStop(0.55, 'rgba(128, 234, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(128, 234, 255, 0)');
    return gradient;
};

const drawCellHighlight = (ctx, cell) => {
    if (cell.highlight <= 0) {
        return;
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1, cell.highlight * 3);
    ctx.fillStyle = 'red';
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.restore();
};

const getCellMergeColor = (cell, blueColor, redColor) => (
    cell.tower?.color === 'blue' ? blueColor : redColor
);

const drawCellMergeSelection = (ctx, cell, elapsed) => {
    if (cell.mergeSelection <= 0 || !cell.occupied) {
        return;
    }

    const normalized = (Math.sin(elapsed * 5 + (cell.x + cell.y) * 0.01) + 1) / 2;
    const alpha = 0.45 + normalized * 0.35;
    const thickness = 4.5 + normalized * 2.5;
    const color = getCellMergeColor(cell, `rgba(150, 210, 255, ${alpha})`, `rgba(255, 200, 160, ${alpha})`);
    drawCellStroke(ctx, cell, thickness, color, thickness * 0.75);
};

const drawCellMergeHint = (ctx, cell, elapsed) => {
    if (cell.mergeHint <= 0 || !cell.occupied) {
        return;
    }

    const normalized = (Math.sin(elapsed * 4 + (cell.x + cell.y) * 0.01) + 1) / 2;
    const alpha = 0.35 + normalized * 0.35;
    const thickness = 3 + normalized * 2;
    const color = getCellMergeColor(cell, `rgba(130, 180, 255, ${alpha})`, `rgba(255, 180, 120, ${alpha})`);
    drawCellStroke(ctx, cell, thickness, color, thickness);
};

const drawCellStroke = (ctx, cell, thickness, color, inset) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.strokeRect(cell.x + inset, cell.y + inset, cell.w - inset * 2, cell.h - inset * 2);
    ctx.restore();
};

const drawMergeHintPair = (ctx, pair, pairPulse) => {
    const { cellA, cellB, color } = pair;
    const startX = cellA.x + cellA.w / 2;
    const startY = cellA.y + cellA.h / 2;
    const endX = cellB.x + cellB.w / 2;
    const endY = cellB.y + cellB.h / 2;
    const alpha = 0.35 + pairPulse * 0.45;
    const hue = color === 'blue' ? `rgba(130, 180, 255, ${alpha})` : `rgba(255, 180, 120, ${alpha})`;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 4 + pairPulse * 3;
    ctx.strokeStyle = hue;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
};

const drawMergeHintPairs = (ctx, pairs, elapsed) => {
    if (!Array.isArray(pairs) || pairs.length === 0) {
        return;
    }

    const pairPulse = (Math.sin(elapsed * 4.2) + 1) / 2;
    pairs.forEach((pair) => drawMergeHintPair(ctx, pair, pairPulse));
};

export function drawGrid(game) {
    const ctx = game.ctx;
    const cellImage = game.assets?.cell;
    const elapsed = game.elapsedTime ?? 0;

    game.getAllCells().forEach((cell) => {
        drawCellImage(ctx, cell, cellImage);
        drawCellHover(ctx, cell);
        if (!game.waveInProgress) {
            drawPreparationPulse(ctx, cell, elapsed);
        }
        drawCellHighlight(ctx, cell);
        drawCellMergeSelection(ctx, cell, elapsed);
        drawCellMergeHint(ctx, cell, elapsed);
    });

    drawMergeHintPairs(ctx, game.mergeHintPairs, elapsed);
}
