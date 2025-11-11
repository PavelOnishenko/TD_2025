const registry = new Map();

function normalizeId(id) {
    return typeof id === 'string' ? id.trim() : '';
}

function addResolver(id, resolver) {
    const key = normalizeId(id);
    if (!key || typeof resolver !== 'function') {
        return () => {};
    }
    let entry = registry.get(key);
    if (!entry) {
        entry = new Set();
        registry.set(key, entry);
    }
    entry.add(resolver);
    return () => {
        entry.delete(resolver);
        if (entry.size === 0) {
            registry.delete(key);
        }
    };
}

export function registerTutorialTarget(id, resolver) {
    return addResolver(id, resolver);
}

export function resolveTutorialTargets(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
        return [];
    }
    const uniqueElements = new Set();
    const resolved = [];
    ids.forEach(id => {
        const key = normalizeId(id);
        if (!key) {
            return;
        }
        const entry = registry.get(key);
        if (!entry) {
            return;
        }
        entry.forEach(resolver => {
            if (typeof resolver !== 'function') {
                return;
            }
            try {
                const value = resolver();
                if (!value) {
                    return;
                }
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (item && !uniqueElements.has(item)) {
                            uniqueElements.add(item);
                            resolved.push(item);
                        }
                    });
                    return;
                }
                if (typeof value === 'object' && value && typeof value[Symbol.iterator] === 'function' && typeof value !== 'string') {
                    for (const item of value) {
                        if (item && !uniqueElements.has(item)) {
                            uniqueElements.add(item);
                            resolved.push(item);
                        }
                    }
                    return;
                }
                if (!uniqueElements.has(value)) {
                    uniqueElements.add(value);
                    resolved.push(value);
                }
            } catch (error) {
                console.warn('Failed to resolve tutorial target', error);
            }
        });
    });
    return resolved;
}

export function clearTutorialTargets() {
    registry.clear();
}

export default {
    register: registerTutorialTarget,
    resolve: resolveTutorialTargets,
    clear: clearTutorialTargets,
};
