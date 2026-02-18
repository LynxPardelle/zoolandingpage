import { environment } from '@/environments/environment';
import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

export const envConditionHandler: ConditionHandler = {
    id: 'env',
    resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
        // Usage: all:env,features.debugMode
        if (!Array.isArray(args) || args.length === 0) return false;
        // Support dot notation: features.debugMode
        let value: any = environment;
        for (const part of String(args[0]).split('.')) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return false;
            }
        }
        return Boolean(value);
    },
};
