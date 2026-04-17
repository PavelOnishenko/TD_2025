export type PlayerStat = 'vitality' | 'toughness' | 'strength' | 'agility' | 'connection' | 'intelligence';

export type PlayerCreationOptions = {
    startingSkillAllocation?: Partial<Record<PlayerStat, number>> | null;
};

export const RANDOM_NAME_POOL = [
    'Arin', 'Kael', 'Nyx', 'Sable', 'Thorne', 'Mira', 'Orin', 'Vex', 'Lyra', 'Dorian',
    'Selene', 'Riven', 'Kara', 'Juno', 'Bram', 'Talia', 'Ezra', 'Nora', 'Cassian', 'Iris'
];

export const RANDOM_STAT_POOL: PlayerStat[] = ['vitality', 'toughness', 'strength', 'agility', 'connection', 'intelligence'];
