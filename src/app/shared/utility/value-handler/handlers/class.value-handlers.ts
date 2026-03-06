import type { ValueHandler } from '../value-handler.types';

const toClassTokens = (value: unknown): string[] => {
    if (value == null) return [];

    if (Array.isArray(value)) {
        return value.flatMap((entry) => toClassTokens(entry));
    }

    const text = String(value).trim();
    if (!text) return [];

    return text.split(/\s+/).filter(Boolean);
};

export const classJoinValueHandler = (): ValueHandler => ({
    id: 'classJoin',
    resolve: (_ctx, args) => {
        const seen = new Set<string>();

        for (const arg of args ?? []) {
            for (const token of toClassTokens(arg)) {
                if (!seen.has(token)) {
                    seen.add(token);
                }
            }
        }

        return Array.from(seen).join(' ');
    },
});
