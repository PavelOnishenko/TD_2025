type TutorialTargetValue = Element | Element[] | Iterable<Element> | null | undefined;
type TutorialTargetResolver = () => TutorialTargetValue;
type CleanupFn = () => void;

const registry = new Map<string, Set<TutorialTargetResolver>>();

function normalizeId(id: string | null | undefined): string {
    return typeof id === 'string' ? id.trim() : '';
}

function addResolver(id: string, resolver: TutorialTargetResolver): CleanupFn {
    const key = normalizeId(id);
    if (!key || typeof resolver !== 'function') {
        return () => {};
    }

    let entry = registry.get(key);
    if (!entry) {
        entry = new Set<TutorialTargetResolver>();
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

export function registerTutorialTarget(id: string, resolver: TutorialTargetResolver): CleanupFn {
    return addResolver(id, resolver);
}

export function resolveTutorialTargets(ids: string[]): Element[] {
    if (!Array.isArray(ids) || ids.length === 0) {
        return [];
    }

    const uniqueElements = new Set<Element>();
    const resolved: Element[] = [];

    ids.forEach((id) => {
        const key = normalizeId(id);
        if (!key) {
            return;
        }

        const entry = registry.get(key);
        if (!entry) {
            return;
        }

        entry.forEach((resolver) => {
            if (typeof resolver !== 'function') {
                return;
            }

            try {
                const value = resolver();
                if (!value) {
                    return;
                }

                if (Array.isArray(value)) {
                    value.forEach((item) => {
                        if (item && !uniqueElements.has(item)) {
                            uniqueElements.add(item);
                            resolved.push(item);
                        }
                    });
                    return;
                }

                if (typeof value === 'object' && Symbol.iterator in value && typeof value !== 'string') {
                    for (const item of value as Iterable<Element>) {
                        if (item && !uniqueElements.has(item)) {
                            uniqueElements.add(item);
                            resolved.push(item);
                        }
                    }
                    return;
                }

                if (value instanceof Element && !uniqueElements.has(value)) {
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

export function clearTutorialTargets(): void {
    registry.clear();
}

export default {
    register: registerTutorialTarget,
    resolve: resolveTutorialTargets,
    clear: clearTutorialTargets,
};
