interface SimpleSaveSystemFlag {
    enabled: boolean;
    storageKey: string;
}

interface FeatureFlags {
    simpleSaveSystem: SimpleSaveSystemFlag;
}

export const featureFlags: FeatureFlags = {
    simpleSaveSystem: {
        enabled: true,
        storageKey: 'td_simple_save_v1',
    },
};

export default featureFlags;
