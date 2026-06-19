const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const setNestedError = (
    obj: Record<string, unknown>,
    path: string,
    error: { type: string; message: string },
) => {
    const parts = path.split('.');
    let cur: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i]!;
        if (FORBIDDEN_KEYS.has(key)) return; // ← bloqueia pollution
        if (cur[key] == null || typeof cur[key] !== 'object') {
            cur[key] = {};
        }
        cur = cur[key] as Record<string, unknown>;
    }
    const lastKey = parts[parts.length - 1]!;
    if (!FORBIDDEN_KEYS.has(lastKey)) {
        cur[lastKey] = error;
    }
};