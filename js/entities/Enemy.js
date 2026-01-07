import { drawEnemyEngineGlow } from '../systems/effects.js';
import gameConfig from '../config/gameConfig.js';

export default class Enemy {
    constructor(
        maxHp,
        color,
        x,
        y,
        speedX = gameConfig.enemies.swarm.speed.x,
        speedY = gameConfig.enemies.swarm.speed.y,
        spriteKey = 'swarm',
        damage = 1
    ) {
        this.x = x;
        this.y = y;
        const { width, height } = gameConfig.enemies.dimensions;
        this.w = width;
        this.h = height;
        const speedMultiplier = Number.isFinite(gameConfig.enemies.speedMultiplier)
            ? gameConfig.enemies.speedMultiplier
            : 1;
        this.speedX = speedX * speedMultiplier;
        this.speedY = speedY * speedMultiplier;
        this.maxHp = maxHp;
        this.hp = this.maxHp;
        this.color = color;
        this.spriteKey = spriteKey;
        this.damage = damage;
        if (typeof Enemy._glowPhaseCursor !== 'number') {
            Enemy._glowPhaseCursor = 0;
        }
        this.glowPhase = Enemy._glowPhaseCursor;
        Enemy._glowPhaseCursor = (Enemy._glowPhaseCursor + Math.PI * 0.85) % (Math.PI * 2);
        this.engineFlame = { anchor: {x: this.w * 0.5, y: this.h * 0.5}, offset: {x: 0, y: 0}, angle: -35 };
    }

    update(dt) {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
    }

    draw(ctx, assets) {
        const propertyName = `${this.spriteKey}_${this.color.charAt(0)}`;
        const sprite = assets[propertyName];
        if (typeof Enemy.engineGlowDrawer === 'function') {
            Enemy.engineGlowDrawer(ctx, this);
        }
        ctx.drawImage(sprite, this.x, this.y, this.w, this.h);

        const barWidth = this.w;
        const barHeight = 4;
        const barX = this.x;
        const barY = this.y - barHeight - 2;

        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    setEngineFlamePlacement({ anchorX, anchorY, offsetX, offsetY, angleDegrees }) {
        if (typeof anchorX === 'number') {
            this.engineFlame.anchor.x = anchorX;
        }
        if (typeof anchorY === 'number') {
            this.engineFlame.anchor.y = anchorY;
        }
        if (typeof offsetX === 'number') {
            this.engineFlame.offset.x = offsetX;
        }
        if (typeof offsetY === 'number') {
            this.engineFlame.offset.y = offsetY;
        }
        if (typeof angleDegrees === 'number') {
            this.engineFlame.angle = angleDegrees * (Math.PI / 180);
        }
    }

    canRenderGlow(ctx) {
        return (
            typeof ctx.save === 'function' &&
            typeof ctx.restore === 'function' &&
            typeof ctx.beginPath === 'function' &&
            typeof ctx.arc === 'function' &&
            typeof ctx.moveTo === 'function' &&
            typeof ctx.quadraticCurveTo === 'function' &&
            typeof ctx.fill === 'function' &&
            typeof ctx.translate === 'function' &&
            typeof ctx.scale === 'function' &&
            typeof ctx.createRadialGradient === 'function' &&
            typeof ctx.createLinearGradient === 'function'
        );
    }

    getGlowPalette() {
        const palettes = {
            red: {
                core: 'rgba(255, 243, 232, 1)', mid: 'rgba(255, 186, 140, 0.85)', halo: 'rgba(255, 90, 40, 0.24)', 
                flare: 'rgba(255, 154, 84, 0.7)', trail: 'rgba(255, 94, 48, 0)', spark: 'rgba(255, 246, 235, 0.95)'
            },
            blue: {
                core: 'rgba(232, 246, 255, 1)', mid: 'rgba(132, 206, 255, 0.85)', halo: 'rgba(64, 148, 255, 0.24)',
                flare: 'rgba(152, 214, 255, 0.75)', trail: 'rgba(66, 156, 255, 0)', spark: 'rgba(255, 255, 255, 0.92)'
            }
        };
        return (
            palettes[this.color] ?? {
                core: 'rgba(255, 248, 220, 1)', mid: 'rgba(255, 224, 150, 0.8)', halo: 'rgba(255, 200, 80, 0.22)',
                flare: 'rgba(255, 210, 120, 0.65)', trail: 'rgba(255, 190, 90, 0)', spark: 'rgba(255, 255, 245, 0.9)',
            }
        );
    }

    isOutOfBounds(canvasHeight) {
        return this.y >= canvasHeight;
    }
}

export class TankEnemy extends Enemy {
    constructor(
        maxHp = 15,
        color = 'red',
        x = 0,
        y = 0,
        speedX = gameConfig.enemies.tank.speed.x,
        speedY = gameConfig.enemies.tank.speed.y
    ) {
        super(maxHp, color, x, y, speedX, speedY, 'tank', 1);
    }
}

export class SwarmEnemy extends Enemy {
    constructor(
        maxHp = 1,
        color = 'red',
        x = 0,
        y = 0,
        speedX = gameConfig.enemies.swarm.speed.x,
        speedY = gameConfig.enemies.swarm.speed.y
    ) {
        super(maxHp, color, x, y, speedX, speedY, 'swarm', 1);
    }
}

export class SkeletonEnemy extends Enemy {
    constructor(
        maxHp = 1,
        color = 'red',
        x = 0,
        y = 0,
        speedX = gameConfig.enemies.skeleton?.speed?.x ?? gameConfig.enemies.swarm.speed.x,
        speedY = gameConfig.enemies.skeleton?.speed?.y ?? gameConfig.enemies.swarm.speed.y
    ) {
        super(maxHp, color, x, y, speedX, speedY, 'skeleton', 2);
    }
}

export class ZombieEnemy extends Enemy {
    constructor(
        maxHp = 7,
        color = 'red',
        x = 0,
        y = 0,
        speedX = gameConfig.enemies.zombie?.speed?.x ?? gameConfig.enemies.swarm.speed.x,
        speedY = gameConfig.enemies.zombie?.speed?.y ?? gameConfig.enemies.swarm.speed.y
    ) {
        super(maxHp, color, x, y, speedX, speedY, 'zombie', 1);
    }
}

Enemy.engineGlowDrawer = drawEnemyEngineGlow;