type TutorialTargetNode = object;
type TutorialTargetValue = TutorialTargetNode | TutorialTargetNode[] | Iterable<TutorialTargetNode> | null | undefined;
type TutorialTargetResolver = () => TutorialTargetValue;
type CleanupFn = () => void;

const registry = new Map<string, Set<TutorialTargetResolver>>();

function normalizeId(id: string | null | undefined): string {
    return typeof id === 'string' ? id.trim() : '';
}

function isIterableObject(value: unknown): value is Iterable<TutorialTargetNode> {
    return typeof value === 'object' && value !== null && typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === 'function';
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

export function resolveTutorialTargets(ids: string[]): TutorialTargetNode[] {
    if (!Array.isArray(ids) || ids.length === 0) {
        return [];
    }

    const uniqueElements = new Set<TutorialTargetNode>();
    const resolved: TutorialTargetNode[] = [];

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

                if (isIterableObject(value) && typeof value !== 'string') {
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

export function clearTutorialTargets(): void {
    registry.clear();
}

export default {
    register: registerTutorialTarget,
    resolve: resolveTutorialTargets,
    clear: clearTutorialTargets,
};
