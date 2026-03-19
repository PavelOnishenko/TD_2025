// Game-specific type definitions for RGFN

export type GameMode = 'WORLD_MAP' | 'BATTLE';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'upLeft' | 'upRight' | 'downLeft' | 'downRight';

export type FogState = 'unknown' | 'discovered' | 'hidden';

export type TerrainType = 'grass' | 'forest' | 'mountain' | 'water' | 'desert';

export type TerrainPattern = 'dots' | 'lines' | 'cross' | 'plain' | 'waves' | 'dunes' | 'groves' | 'ridges';

export interface TerrainData {
    type: TerrainType;
    color: string;
    pattern: TerrainPattern;
    elevation: number;
    moisture: number;
    heat: number;
    seed: number;
}

export interface TerrainNeighbors {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
    northEast: boolean;
    northWest: boolean;
    southEast: boolean;
    southWest: boolean;
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

export interface SelectedWorldCellInfo {
    col: number;
    row: number;
    terrainType: TerrainType;
    fogState: FogState;
    isVisible: boolean;
    isVillage: boolean;
    villageName: string | null;
    villageStatus: 'current' | 'mapped' | null;
    isTraversable: boolean;
}

export interface StateMachineCallbacks {
    enter?: (data?: any) => void;
    update?: (deltaTime: number, data?: any) => void;
    exit?: (data?: any) => void;
}

export interface TimingConfig {
    battle: {
        playerActionDelay: number;
        waitActionDelay: number;
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
        itemDiscoverySplashDuration: number;
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
    takeDamage(amount: number): boolean | void;
    isDead(): boolean;
}
