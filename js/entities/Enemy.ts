import { drawEnemyEngineGlow } from '../systems/effects.js';
import gameConfig from '../config/gameConfig.js';
import Damageable from '../../engine/core/Damageable.js';

type EnemyColor = 'red' | 'blue' | string;

interface EnemyAssets {
    [key: string]: CanvasImageSource;
}

interface EnemyFlamePlacement {
    anchorX?: number;
    anchorY?: number;
    offsetX?: number;
    offsetY?: number;
    angleDegrees?: number;
}

interface EnemyPalette {
    core: string;
    mid: string;
    halo: string;
    flare: string;
    trail: string;
    spark: string;
}

interface EnemyFlameState {
    anchor: { x: number; y: number };
    offset: { x: number; y: number };
    angle: number;
}

type EngineGlowDrawer = (ctx: CanvasRenderingContext2D, enemy: Enemy) => void;

const DEG_TO_RAD = Math.PI / 180;

interface EnemyConfigShape {
    enemies: {
        dimensions: { width: number; height: number };
        speedMultiplier?: number;
        swarm: { speed: { x: number; y: number } };
        tank: { speed: { x: number; y: number } };
    };
}

const enemyConfig = gameConfig as unknown as EnemyConfigShape;

export default class Enemy extends Damageable {
    public static engineGlowDrawer: EngineGlowDrawer | null = drawEnemyEngineGlow;
    private static _glowPhaseCursor = 0;

    public x: number;
    public y: number;
    public w: number;
    public h: number;
    public speedX: number;
    public speedY: number;
    public color: EnemyColor;
    public spriteKey: string;
    public glowPhase: number;
    public engineFlame: EnemyFlameState;

    constructor(
        maxHp: number,
        color: EnemyColor,
        x: number,
        y: number,
        speedX = enemyConfig.enemies.swarm.speed.x,
        speedY = enemyConfig.enemies.swarm.speed.y,
        spriteKey = 'swarm',
    ) {
        super(maxHp);

        this.x = x;
        this.y = y;
        const { width, height } = enemyConfig.enemies.dimensions;
        this.w = width;
        this.h = height;
        const speedMultiplier = Number.isFinite(enemyConfig.enemies.speedMultiplier)
            ? enemyConfig.enemies.speedMultiplier
            : 1;
        this.speedX = speedX * speedMultiplier;
        this.speedY = speedY * speedMultiplier;
        this.color = color;
        this.spriteKey = spriteKey;

        this.glowPhase = Enemy._glowPhaseCursor;
        Enemy._glowPhaseCursor = (Enemy._glowPhaseCursor + Math.PI * 0.85) % (Math.PI * 2);

        this.engineFlame = {
            anchor: { x: this.w * 0.5, y: this.h * 0.5 },
            offset: { x: 0, y: 0 },
            angle: -35,
        };
    }

    public update(dt: number): void {
        this.x += this.speedX * dt;
        this.y += this.speedY * dt;
    }

    public draw(ctx: CanvasRenderingContext2D, assets: EnemyAssets): void {
        const propertyName = `${this.spriteKey}_${this.color.charAt(0)}`;
        const sprite = assets[propertyName];
        if (typeof Enemy.engineGlowDrawer === 'function') {
            Enemy.engineGlowDrawer(ctx, this);
        }
        if (sprite) {
            ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
        }

        const barWidth = this.w;
        const barHeight = 4;
        const barX = this.x;
        const barY = this.y - barHeight - 2;

        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * (this as any).getHealthPercent(), barHeight);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    public setEngineFlamePlacement({ anchorX, anchorY, offsetX, offsetY, angleDegrees }: EnemyFlamePlacement): void {
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
            this.engineFlame.angle = angleDegrees * DEG_TO_RAD;
        }
    }

    public canRenderGlow(ctx: CanvasRenderingContext2D): boolean {
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

    public getGlowPalette(): EnemyPalette {
        const palettes: Record<string, EnemyPalette> = {
            red: {
                core: 'rgba(255, 243, 232, 1)', mid: 'rgba(255, 186, 140, 0.85)', halo: 'rgba(255, 90, 40, 0.24)',
                flare: 'rgba(255, 154, 84, 0.7)', trail: 'rgba(255, 94, 48, 0)', spark: 'rgba(255, 246, 235, 0.95)',
            },
            blue: {
                core: 'rgba(232, 246, 255, 1)', mid: 'rgba(132, 206, 255, 0.85)', halo: 'rgba(64, 148, 255, 0.24)',
                flare: 'rgba(152, 214, 255, 0.75)', trail: 'rgba(66, 156, 255, 0)', spark: 'rgba(255, 255, 255, 0.92)',
            },
        };

        return palettes[this.color] ?? {
            core: 'rgba(255, 248, 220, 1)', mid: 'rgba(255, 224, 150, 0.8)', halo: 'rgba(255, 200, 80, 0.22)',
            flare: 'rgba(255, 210, 120, 0.65)', trail: 'rgba(255, 190, 90, 0)', spark: 'rgba(255, 255, 245, 0.9)',
        };
    }

    public isOutOfBounds(canvasHeight: number): boolean {
        return this.y >= canvasHeight;
    }
}

export class TankEnemy extends Enemy {
    constructor(
        maxHp = 15,
        color: EnemyColor = 'red',
        x = 0,
        y = 0,
        speedX = enemyConfig.enemies.tank.speed.x,
        speedY = enemyConfig.enemies.tank.speed.y,
    ) {
        super(maxHp, color, x, y, speedX, speedY, 'tank');
    }
}

export class SwarmEnemy extends Enemy {
    constructor(
        maxHp = 1,
        color: EnemyColor = 'red',
        x = 0,
        y = 0,
        speedX = enemyConfig.enemies.swarm.speed.x,
        speedY = enemyConfig.enemies.swarm.speed.y,
    ) {
        super(maxHp, color, x, y, speedX, speedY, 'swarm');
    }
}
