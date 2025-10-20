import { updateHUD } from '../../systems/ui.js';
import { createColorSwitchBurstFromTower } from '../../systems/effects.js';
import { createProjectileVisualState } from './projectileVisualState.js';

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
        const base = this.projectileRadius ?? 6;
        const normalizedLevel = normalizeLevel(level);
        const increase = (normalizedLevel - 1) * 2;
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
            return false;
        }
        const nextColor = tower.color === 'red' ? 'blue' : 'red';
        tower.color = nextColor;
        this.energy -= this.switchCost;
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
