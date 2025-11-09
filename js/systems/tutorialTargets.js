const registry = new Map();

export function registerTutorialTarget(name, element) {
    if (!name) {
        return;
    }
    if (!element) {
        registry.delete(name);
        return;
    }
    registry.set(name, element);
}

export function registerTutorialTargets(targets = {}) {
    if (!targets || typeof targets !== 'object') {
        return;
    }
    Object.entries(targets).forEach(([name, element]) => {
        registerTutorialTarget(name, element);
    });
}

export function unregisterTutorialTarget(name) {
    if (!name) {
        return;
    }
    registry.delete(name);
}

export function clearTutorialTargets() {
    registry.clear();
}

export function getTutorialTarget(name) {
    if (!name) {
        return null;
    }
    return registry.get(name) ?? null;
}

export function resolveTutorialTargets(names = []) {
    if (!Array.isArray(names)) {
        return [];
    }
    return names
        .map(name => getTutorialTarget(name))
        .filter(target => target);
}

export function getTutorialRegistrySnapshot() {
    return new Map(registry);
}
