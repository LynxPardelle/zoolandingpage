import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { inject } from '@angular/core';
import type { ValueHandler } from '../value-handler.types';

export const variableValueHandler = (): ValueHandler => {
    const store = inject(VariableStoreService);
    return {
        id: 'var',
        resolve: (_ctx, args) => {
            const path = String(args?.[0] ?? '').trim();
            if (!path) return undefined;
            return store.get(path);
        },
    };
};

export const variableOrValueHandler = (): ValueHandler => {
    const store = inject(VariableStoreService);
    return {
        id: 'varOr',
        resolve: (_ctx, args) => {
            const path = String(args?.[0] ?? '').trim();
            const fallback = args?.[1];
            const value = path ? store.get(path) : undefined;
            return value == null ? (fallback ?? '') : value;
        },
    };
};
