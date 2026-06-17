import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

const clean = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const currentQuery = (): URLSearchParams | null => {
    if (typeof window === 'undefined' || !window.location?.href) {
        return null;
    }

    try {
        return new URL(window.location.href).searchParams;
    } catch {
        return null;
    }
};

export const queryEqConditionHandler: ConditionHandler = {
    id: 'queryEq',
    resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        const key = clean(args?.[0]);
        if (!key) return false;

        const query = currentQuery();
        if (!query) return false;

        return query.get(key) === String(args?.[1] ?? '').trim();
    },
};
