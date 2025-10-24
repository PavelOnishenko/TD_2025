import { updateHUD } from '../../systems/ui.js';
import { createColorSwitchBurstFromTower } from '../../systems/effects.js';
import { createProjectileVisualState } from './projectileVisualState.js';
import gameConfig from '../../config/gameConfig.js';

function normalizeLevel(level) {
    const parsed = Number(level);
    if (!Number.isFinite(parsed)) {
        return 1;
    }
    return Math.max(1, Math.min(parsed, 3));
}

function createProjectile(game, angle, tower, radius) {
    const center = tower.center();
    const speed = game.projectileSpeed;
    game.projectiles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: tower.color,
        damage: tower.damage,
        anim: createProjectileVisualState(),
        radius,
    });
}

function updateMaxProjectileRadius(game, radius) {
    if (radius <= game.maxProjectileRadius) {
        return;
    }
    game.maxProjectileRadius = radius;
    game.worldBounds = game.computeWorldBounds();
}

const projectileManagement = {
    getProjectileRadiusForLevel(level) {
        const base = Number.isFinite(this.projectileRadius)
            ? this.projectileRadius
            : gameConfig.projectiles.baseRadius;
        const normalizedLevel = normalizeLevel(level);
        const increase = (normalizedLevel - 1) * gameConfig.projectiles.radiusPerLevel;
        return base + increase;
    },

    spawnProjectile(angle, tower) {
        const radius = this.getProjectileRadiusForLevel(tower?.level);
        createProjectile(this, angle, tower, radius);
        updateMaxProjectileRadius(this, radius);
        tower.triggerFlash();
        this.audio.playFire();
    },

    switchTowerColor(tower) {
        if (this.energy < this.switchCost) {
            if (tower && typeof tower.triggerErrorPulse === 'function') {
                tower.triggerErrorPulse();
            }
            if (this.audio && typeof this.audio.playError === 'function') {
                this.audio.playError();
            }
            return false;
        }
        const nextColor = tower.color === 'red' ? 'blue' : 'red';
        tower.color = nextColor;
        this.energy -= this.switchCost;
        if (typeof this.addEnergyPopup === 'function' && tower) {
            const center = typeof tower.center === 'function'
                ? tower.center()
                : { x: (tower.x ?? 0) + (tower.w ?? 0) / 2, y: (tower.y ?? 0) + (tower.h ?? 0) / 2 };
            const rawCost = Number.isFinite(this.switchCost) ? this.switchCost : 0;
            const cost = Math.max(0, Math.round(rawCost));
            const text = `-${cost}`;
            const popupY = center.y - (tower.h ?? 0) * 0.4;
            this.addEnergyPopup(text, center.x, popupY, {
                color: '#facc15',
                stroke: 'rgba(0,0,0,0.5)',
            });
        }
        const burst = createColorSwitchBurstFromTower(tower, nextColor);
        if (burst) {
            this.colorSwitchBursts.push(burst);
        }
        this.audio.playColorSwitch();
        updateHUD(this);
        return true;
    },
};

export default projectileManagement;
