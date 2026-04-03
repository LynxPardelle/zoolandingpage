import { ConditionOrchestrator } from '@/app/shared/services/condition-orchestrator';
import { inject } from '@angular/core';
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

export const whenValueHandler = (): ValueHandler => {
    const conditionOrchestrator = inject(ConditionOrchestrator);

    return {
        id: 'when',
        resolve: (ctx, args) => {
            const conditionSource = args?.[0];
            const truthyValue = args?.[1] ?? '';
            const falsyValue = args?.[2] ?? '';

            const matches = typeof conditionSource === 'string'
                ? conditionSource.trim().length > 0
                && conditionOrchestrator.evaluate({
                    ...ctx.component,
                    condition: conditionSource.trim(),
                }, { host: ctx.host })
                : Boolean(conditionSource);

            return matches ? truthyValue : falsyValue;
        },
    };
};
