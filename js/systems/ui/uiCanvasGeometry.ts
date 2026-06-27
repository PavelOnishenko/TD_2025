export function getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const transform = canvas.viewportTransform;
    if (transform) {
        const { scale = 1, offsetX = 0, offsetY = 0 } = transform;
        return { x: (canvasX - offsetX) / scale, y: (canvasY - offsetY) / scale };
    }

    return { x: canvasX, y: canvasY };
}

export const isInside = (pos, rect) => (
    pos.x >= rect.x &&
    pos.x <= rect.x + rect.w &&
    pos.y >= rect.y &&
    pos.y <= rect.y + rect.h
);

export const isWithinTowerWithMargin = (tower, pos, marginFactor) => {
    const width = tower.w ?? 0;
    const height = tower.h ?? 0;
    const marginX = width * marginFactor;
    const marginY = height * marginFactor;
    return (
        pos.x >= tower.x - marginX &&
        pos.x <= tower.x + width + marginX &&
        pos.y >= tower.y - marginY &&
        pos.y <= tower.y + height + marginY
    );
};
