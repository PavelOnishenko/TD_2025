// Game-specific type definitions for RGFN

export type GameMode = 'WORLD_MAP' | 'BATTLE';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type FogState = 'unknown' | 'discovered' | 'hidden';

export type TerrainType = 'grass' | 'forest' | 'mountain' | 'water' | 'desert';

export type TerrainPattern = 'dots' | 'lines' | 'cross' | 'plain';

export interface TerrainData {
    type: TerrainType;
    color: string;
    pattern: TerrainPattern;
}

export interface GridCell {
    col: number;
    row: number;
    x: number;
    y: number;
    width: number;
    height: number;
    data: Record<string, any>;
}

export interface GridPosition {
    col: number;
    row: number;
}

export interface StateMachineCallbacks {
    enter?: (data?: any) => void;
    update?: (deltaTime: number, data?: any) => void;
    exit?: (data?: any) => void;
}

export interface TimingConfig {
    battle: {
        playerActionDelay: number;
        enemyTurnDelay: number;
        enemyActionStartDelay: number;
        fleeFailedDelay: number;
        turnStartInputDelay: number;
        defeatEndDelay: number;
        victoryEndDelay: number;
        fleeSuccessDelay: number;
        gameOverDelay: number;
        battleStartSplashDuration: number;
        battleEndSplashDuration: number;
    };
}

export interface CombatEntity {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    damage: number;
    active: boolean;
    gridCol?: number;
    gridRow?: number;
    takeDamage(amount: number): void;
    isDead(): boolean;
}
