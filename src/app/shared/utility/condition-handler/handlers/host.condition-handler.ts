import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

function parsePrimitive(value: string): unknown {
    const trimmed = value.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && trimmed !== '') return asNumber;
    return trimmed;
}

function resolvePath(target: unknown, path: string): unknown {
    if (!path) return undefined;
    const normalized = path.replace(/\[(\d+)\]/g, '.$1');
    const segments = normalized.split('.').filter(Boolean);
    let value: any = target;
    for (const segment of segments) {
        if (value == null) return undefined;
        if (Array.isArray(value) && /^[0-9]+$/.test(segment)) {
            value = value[Number(segment)];
            continue;
        }
        if (typeof value === 'object' && segment in value) {
            value = (value as any)[segment];
            continue;
        }
        return undefined;
    }
    return value;
}

export const hostConditionHandler: ConditionHandler = {
    id: 'host',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length === 0) return false;
        const path = String(args[0]);
        const value = resolvePath(ctx.host, path);
        if (value == null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value as object).length > 0;
        return Boolean(value);
    },
};

export const hostEqConditionHandler: ConditionHandler = {
    id: 'hostEq',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = parsePrimitive(String(args[1]));
        const value = resolvePath(ctx.host, path);
        return value === expected;
    },
};

export const hostIncludesConditionHandler: ConditionHandler = {
    id: 'hostIncludes',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = parsePrimitive(String(args[1]));
        const value = resolvePath(ctx.host, path);
        if (typeof value === 'string') return value.includes(String(expected));
        if (Array.isArray(value)) return value.includes(expected as never);
        return false;
    },
};

export const hostNeqConditionHandler: ConditionHandler = {
    id: 'hostNeq',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = parsePrimitive(String(args[1]));
        const value = resolvePath(ctx.host, path);
        return value !== expected;
    },
};

export const hostGtConditionHandler: ConditionHandler = {
    id: 'hostGt',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = Number(resolvePath(ctx.host, path));
        return Number.isFinite(value) && Number.isFinite(expected) && value > expected;
    },
};

export const hostGteConditionHandler: ConditionHandler = {
    id: 'hostGte',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = Number(resolvePath(ctx.host, path));
        return Number.isFinite(value) && Number.isFinite(expected) && value >= expected;
    },
};

export const hostLtConditionHandler: ConditionHandler = {
    id: 'hostLt',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = Number(resolvePath(ctx.host, path));
        return Number.isFinite(value) && Number.isFinite(expected) && value < expected;
    },
};

export const hostLteConditionHandler: ConditionHandler = {
    id: 'hostLte',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = Number(resolvePath(ctx.host, path));
        return Number.isFinite(value) && Number.isFinite(expected) && value <= expected;
    },
};

export const hostStartsWithConditionHandler: ConditionHandler = {
    id: 'hostStartsWith',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = String(parsePrimitive(String(args[1])));
        const value = resolvePath(ctx.host, path);
        return typeof value === 'string' && value.startsWith(expected);
    },
};

export const hostEndsWithConditionHandler: ConditionHandler = {
    id: 'hostEndsWith',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = String(parsePrimitive(String(args[1])));
        const value = resolvePath(ctx.host, path);
        return typeof value === 'string' && value.endsWith(expected);
    },
};

export const hostRegexConditionHandler: ConditionHandler = {
    id: 'hostRegex',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const pattern = String(args[1]);
        const flags = String(args[2] ?? '');
        const value = resolvePath(ctx.host, path);
        if (typeof value !== 'string') return false;
        try {
            return new RegExp(pattern, flags).test(value);
        } catch {
            return false;
        }
    },
};

function lengthOf(value: unknown): number | undefined {
    if (typeof value === 'string' || Array.isArray(value)) return value.length;
    return undefined;
}

export const hostLenEqConditionHandler: ConditionHandler = {
    id: 'hostLenEq',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = lengthOf(resolvePath(ctx.host, path));
        return value != null && Number.isFinite(expected) && value === expected;
    },
};

export const hostLenGtConditionHandler: ConditionHandler = {
    id: 'hostLenGt',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = lengthOf(resolvePath(ctx.host, path));
        return value != null && Number.isFinite(expected) && value > expected;
    },
};

export const hostLenGteConditionHandler: ConditionHandler = {
    id: 'hostLenGte',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = lengthOf(resolvePath(ctx.host, path));
        return value != null && Number.isFinite(expected) && value >= expected;
    },
};

export const hostLenLtConditionHandler: ConditionHandler = {
    id: 'hostLenLt',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = lengthOf(resolvePath(ctx.host, path));
        return value != null && Number.isFinite(expected) && value < expected;
    },
};

export const hostLenLteConditionHandler: ConditionHandler = {
    id: 'hostLenLte',
    resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        if (!Array.isArray(args) || args.length < 2) return false;
        const path = String(args[0]);
        const expected = Number(parsePrimitive(String(args[1])));
        const value = lengthOf(resolvePath(ctx.host, path));
        return value != null && Number.isFinite(expected) && value <= expected;
    },
};
