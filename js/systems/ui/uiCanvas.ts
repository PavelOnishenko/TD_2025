import { getMousePos, isInside, isWithinTowerWithMargin } from './uiCanvasGeometry.js';
import { handleCellTap, handleTowerColorSwitch } from './uiCanvasPlacement.js';

const colorSwitchThreshold = 0.28;
const dragThreshold = 12;
const cancelMarginFactor = 0.25;

const createPointerState = () => ({
    pointerId: null,
    tower: null,
    downPos: null,
    movedTooFar: false,
    cancelled: false,
    removalTriggered: false,
    startedRemoval: false,
    chargeSoundHandle: null,
    mergeSelection: false,
    upgradeSelection: false,
});

const getPointerId = (event) => (typeof event.pointerId === 'number' ? event.pointerId : 0);

class CanvasInteractionController {
    constructor(game, updateHUD) {
        this.game = game;
        this.updateHUD = updateHUD;
        this.pointerState = createPointerState();
        this.hoveredTower = null;
        this.hoveredCell = null;
        this.host = typeof window !== 'undefined'
            ? window
            : (typeof globalThis !== 'undefined' ? globalThis : null);
    }

    bind() {
        this.game.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.game.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.game.canvas.addEventListener('pointerup', this.handlePointerUp);
        this.game.canvas.addEventListener('pointerleave', this.handlePointerCancel);
        this.game.canvas.addEventListener('pointercancel', this.handlePointerCancel);
        this.game.canvas.addEventListener('contextmenu', this.preventContextMenu);
    }

    cancelChargeSoundTimer = () => {
        if (this.pointerState.chargeSoundHandle && this.host && typeof this.host.clearTimeout === 'function') {
            this.host.clearTimeout(this.pointerState.chargeSoundHandle);
        }
        this.pointerState.chargeSoundHandle = null;
    };

    isTowerInGame = (tower) => Array.isArray(this.game?.towers) && this.game.towers.includes(tower);

    releasePointerCapture = () => {
        if (this.pointerState.pointerId === null || typeof this.game.canvas?.releasePointerCapture !== 'function') {
            return;
        }
        try {
            this.game.canvas.releasePointerCapture(this.pointerState.pointerId);
        } catch {
            // ignore release failures
        }
    };

    resetPointerState = () => {
        this.releasePointerCapture();
        this.cancelChargeSoundTimer();
        this.pointerState = createPointerState();
    };

    scheduleChargeSound = () => {
        if (!this.pointerState.startedRemoval) {
            return;
        }
        // Preserve abrupt stop logic by clearing any pending timers
        this.cancelChargeSoundTimer();
        if (typeof this.game.audio?.playTowerRemoveCharge === 'function') {
            this.game.audio.playTowerRemoveCharge();
        }
    };

    cancelTowerRemovalAttempt = (playSound) => {
        const tower = this.pointerState.tower;
        if (!tower || this.pointerState.removalTriggered || !this.isTowerInGame(tower)) {
            return;
        }
        const progress = typeof tower.getRemovalChargeProgress === 'function'
            ? tower.getRemovalChargeProgress()
            : 0;
        if (typeof tower.cancelRemovalCharge === 'function') {
            tower.cancelRemovalCharge();
        }
        if (playSound && this.pointerState.startedRemoval && progress > 0.08 && typeof this.game.audio?.playTowerRemoveCancel === 'function') {
            this.game.audio.playTowerRemoveCancel();
        }
    };

    findTowerAtPosition = (pos) => {
        if (!Array.isArray(this.game?.towers)) {
            return null;
        }
        return this.game.towers.find(tower => isInside(pos, tower)) ?? null;
    };

    findCellAtPosition = (pos) => {
        const cells = typeof this.game.getAllCells === 'function' ? this.game.getAllCells() : [];
        return cells.find(cell => isInside(pos, cell)) ?? null;
    };

    clearHoveredTower = () => {
        if (this.hoveredTower && typeof this.hoveredTower.setHovered === 'function') {
            this.hoveredTower.setHovered(false);
        }
        this.hoveredTower = null;
    };

    clearHoveredCell = () => {
        if (this.hoveredCell) {
            this.hoveredCell.hoverActive = false;
            this.hoveredCell.hover = 0;
        }
        this.hoveredCell = null;
    };

    applyTowerHover = (tower) => {
        if (tower !== this.hoveredTower) {
            this.clearHoveredTower();
            this.hoveredTower = tower;
        }
        if (typeof this.hoveredTower?.setHovered === 'function') {
            this.hoveredTower.setHovered(true);
        }
        this.clearHoveredCell();
    };

    applyCellHover = (cell) => {
        if (cell !== this.hoveredCell) {
            this.clearHoveredCell();
            this.hoveredCell = cell;
        }
        this.hoveredCell.hoverActive = true;
        this.hoveredCell.hover = 1;
    };

    applyHoverHighlight = (pos) => {
        if (!pos) {
            this.clearHoverState();
            return;
        }

        const tower = this.findTowerAtPosition(pos);
        if (tower) {
            this.applyTowerHover(tower);
            return;
        }

        this.clearHoveredTower();
        const cell = this.findCellAtPosition(pos);
        if (cell && !cell.occupied) {
            this.applyCellHover(cell);
            return;
        }
        this.clearHoveredCell();
    };

    clearHoverState = () => {
        this.clearHoveredTower();
        this.clearHoveredCell();
    };

    capturePointer = (pointerId) => {
        if (typeof this.game.canvas?.setPointerCapture !== 'function') {
            return;
        }
        try {
            this.game.canvas.setPointerCapture(pointerId);
        } catch {
            // ignore capture failures
        }
    };

    resetPointerDownState = (pointerId, pos) => {
        Object.assign(this.pointerState, createPointerState(), {
            pointerId,
            downPos: pos,
        });
        this.cancelChargeSoundTimer();
    };

    beginTowerSelection = (tower, pointerId, type, event) => {
        this.pointerState.tower = tower;
        this.pointerState[type] = true;
        this.capturePointer(pointerId);
        event.preventDefault();
    };

    beginTowerRemoval = (tower, pointerId, event) => {
        this.pointerState.tower = tower;
        const started = typeof tower.beginRemovalCharge === 'function'
            ? tower.beginRemovalCharge()
            : false;
        this.pointerState.startedRemoval = started || Boolean(tower.isRemovalCharging?.());
        this.pointerState.removalTriggered = !this.isTowerInGame(tower);
        this.capturePointer(pointerId);
        if (this.pointerState.startedRemoval) {
            this.scheduleChargeSound();
        }
        event.preventDefault();
    };

    handleTowerPointerDown = (tower, pointerId, event) => {
        if (this.game.mergeModeActive) {
            this.beginTowerSelection(tower, pointerId, 'mergeSelection', event);
            return;
        }
        if (this.game.upgradeModeActive) {
            this.beginTowerSelection(tower, pointerId, 'upgradeSelection', event);
            return;
        }
        this.beginTowerRemoval(tower, pointerId, event);
    };

    handlePointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) {
            return;
        }
        const pointerId = getPointerId(event);
        const pos = getMousePos(this.game.canvas, event);
        this.applyHoverHighlight(pos);
        this.resetPointerDownState(pointerId, pos);

        const tower = this.findTowerAtPosition(pos);
        if (tower) {
            this.handleTowerPointerDown(tower, pointerId, event);
            return;
        }
        this.capturePointer(pointerId);
    };

    markDragDistance = (pos) => {
        const distance = Math.hypot(
            pos.x - this.pointerState.downPos.x,
            pos.y - this.pointerState.downPos.y,
        );
        if (distance > dragThreshold) {
            this.pointerState.movedTooFar = true;
        }
    };

    handleSelectionPointerMove = (pos) => {
        this.markDragDistance(pos);
    };

    handleRemovalPointerMove = (pos) => {
        if (!this.pointerState.removalTriggered && !this.isTowerInGame(this.pointerState.tower)) {
            this.pointerState.removalTriggered = true;
            this.cancelChargeSoundTimer();
            return;
        }
        if (this.pointerState.cancelled || this.pointerState.removalTriggered) {
            return;
        }
        const within = isWithinTowerWithMargin(this.pointerState.tower, pos, cancelMarginFactor);
        if (!within) {
            this.pointerState.cancelled = true;
            this.cancelChargeSoundTimer();
            this.cancelTowerRemovalAttempt(true);
        }
    };

    handleTowerPointerMove = (pos) => {
        if (this.pointerState.upgradeSelection || this.pointerState.mergeSelection) {
            this.handleSelectionPointerMove(pos);
            return;
        }
        this.handleRemovalPointerMove(pos);
    };

    handlePointerMove = (event) => {
        const pos = getMousePos(this.game.canvas, event);
        this.applyHoverHighlight(pos);

        if (this.pointerState.pointerId !== getPointerId(event)) {
            return;
        }
        if (this.pointerState.tower) {
            this.handleTowerPointerMove(pos);
            return;
        }
        if (this.pointerState.downPos) {
            this.markDragDistance(pos);
        }
    };

    handleSelectionPointerUp = () => {
        if (this.pointerState.upgradeSelection && typeof this.game.attemptTowerUpgrade === 'function') {
            this.game.attemptTowerUpgrade(this.pointerState.tower);
        }
        if (this.pointerState.mergeSelection && typeof this.game.selectTowerForMerge === 'function') {
            this.game.selectTowerForMerge(this.pointerState.tower);
        }
    };

    handleRemovalPointerUp = () => {
        const tower = this.pointerState.tower;
        const towerInGame = this.isTowerInGame(tower);
        const progress = typeof tower.getRemovalChargeProgress === 'function'
            ? tower.getRemovalChargeProgress()
            : 0;
        const removalTriggered = this.pointerState.removalTriggered || !towerInGame || progress >= 0.999;

        if (removalTriggered) {
            return;
        }
        if (this.pointerState.cancelled) {
            this.cancelTowerRemovalAttempt(true);
            return;
        }
        const playCancelSound = progress > colorSwitchThreshold;
        this.cancelTowerRemovalAttempt(playCancelSound);
        if (progress <= colorSwitchThreshold) {
            handleTowerColorSwitch(this.game, tower);
        }
    };

    handleTowerPointerUp = () => {
        if (!this.pointerState.movedTooFar) {
            this.handleSelectionPointerUp();
        }
        if (!this.pointerState.upgradeSelection && !this.pointerState.mergeSelection) {
            this.handleRemovalPointerUp();
        }
        this.resetPointerState();
    };

    handlePointerUp = (event) => {
        if (this.pointerState.pointerId !== getPointerId(event)) {
            return;
        }
        const pos = getMousePos(this.game.canvas, event);
        this.cancelChargeSoundTimer();

        if (this.pointerState.tower) {
            this.handleTowerPointerUp();
            return;
        }
        if (!this.pointerState.movedTooFar) {
            handleCellTap(this.game, pos, this.updateHUD);
        }
        this.resetPointerState();
    };

    handlePointerCancel = (event) => {
        this.clearHoverState();
        if (this.pointerState.pointerId !== getPointerId(event)) {
            return;
        }
        this.cancelChargeSoundTimer();
        if (this.pointerState.tower && !this.pointerState.removalTriggered) {
            this.cancelTowerRemovalAttempt(true);
        }
        this.resetPointerState();
    };

    preventContextMenu = (event) => {
        event.preventDefault();
    };
}

export function bindCanvasInteractions(game, { updateHUD }) {
    if (!game?.canvas) {
        return;
    }
    const controller = new CanvasInteractionController(game, updateHUD);
    controller.bind();
}
