import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { inject } from '@angular/core';
import type { ValueHandler } from '../value-handler.types';

const coerceNumber = (value: unknown, fallback = 0): number => {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
};

const decodeNumericEntities = (value: string): string => {
    const decimalDecoded = value.replace(/&#(\d+);/g, (_match, dec) => {
        const codePoint = Number(dec);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    });

    return decimalDecoded.replace(/&#x([\da-fA-F]+);/g, (_match, hex) => {
        const codePoint = Number.parseInt(hex, 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    });
};

export const numberClampValueHandler = (): ValueHandler => ({
    id: 'numberClamp',
    resolve: (_ctx, args) => {
        const value = coerceNumber(args?.[0], 0);
        const min = coerceNumber(args?.[1], Number.NEGATIVE_INFINITY);
        const max = coerceNumber(args?.[2], Number.POSITIVE_INFINITY);

        if (min > max) return value;
        return Math.min(max, Math.max(min, value));
    },
});

export const statsFormatVarValueHandler = (): ValueHandler => {
    const store = inject(VariableStoreService);

    return {
        id: 'statsFormatVar',
        resolve: (_ctx, args) => {
            const modePath = String(args?.[0] ?? '').trim();
            const fallbackMode = String(args?.[1] ?? 'number').trim().toLowerCase();
            const suffixPath = String(args?.[2] ?? '').trim();
            const fallbackSuffix = String(args?.[3] ?? '').trim();
            const prefixPath = String(args?.[4] ?? '').trim();
            const fallbackPrefix = String(args?.[5] ?? '').trim();

            const modeValue = modePath ? store.get(modePath) : undefined;
            const suffixValue = suffixPath ? store.get(suffixPath) : undefined;
            const prefixValue = prefixPath ? store.get(prefixPath) : undefined;

            const mode = String(modeValue ?? fallbackMode ?? 'number').trim().toLowerCase();
            const suffix = decodeNumericEntities(String(suffixValue ?? fallbackSuffix ?? '').trim());
            const prefix = decodeNumericEntities(String(prefixValue ?? fallbackPrefix ?? '').trim());

            if (mode === 'percent') {
                return (value: number) => `${ Math.max(0, Math.round(value)) }%`;
            }

            if (mode === 'suffix') {
                return (value: number) => `${ Math.max(0, Math.round(value)) }${ suffix }`;
            }

            if (mode === 'prefix') {
                return (value: number) => `${ prefix }${ Math.max(0, Math.round(value)).toLocaleString() }`;
            }

            if (mode === 'prefixsuffix') {
                return (value: number) => `${ prefix }${ Math.max(0, Math.round(value)).toLocaleString() }${ suffix }`;
            }

            return (value: number) => `${ prefix }${ Math.max(0, Math.round(value)).toLocaleString() }${ suffix }`;
        },
    };
};
