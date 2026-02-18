import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { inject } from '@angular/core';
import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';

const parsePrimitive = (raw: unknown): unknown => {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    if (raw === 'undefined') return undefined;
    if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
    return raw;
};

const getVar = (store: VariableStoreService, path: string): unknown => store.get(path);

export const variableConditionHandlers = (): ConditionHandler[] => {
    const store = inject(VariableStoreService);

    return [
        {
            id: 'var',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                if (!path) return false;
                return Boolean(getVar(store, path));
            },
        },
        {
            id: 'varEq',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                if (!path) return false;
                const expected = parsePrimitive(args?.[1]);
                return getVar(store, path) === expected;
            },
        },
        {
            id: 'varNeq',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                if (!path) return false;
                const expected = parsePrimitive(args?.[1]);
                return getVar(store, path) !== expected;
            },
        },
        {
            id: 'varGt',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = Number(getVar(store, path));
                return !Number.isNaN(value) && !Number.isNaN(expected) && value > expected;
            },
        },
        {
            id: 'varGte',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = Number(getVar(store, path));
                return !Number.isNaN(value) && !Number.isNaN(expected) && value >= expected;
            },
        },
        {
            id: 'varLt',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = Number(getVar(store, path));
                return !Number.isNaN(value) && !Number.isNaN(expected) && value < expected;
            },
        },
        {
            id: 'varLte',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = Number(getVar(store, path));
                return !Number.isNaN(value) && !Number.isNaN(expected) && value <= expected;
            },
        },
        {
            id: 'varIncludes',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = parsePrimitive(args?.[1]);
                const value = getVar(store, path) as any;
                if (typeof value === 'string') return value.includes(String(expected));
                if (Array.isArray(value)) return value.includes(expected);
                return false;
            },
        },
        {
            id: 'varLenEq',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = getVar(store, path) as any;
                return value?.length === expected;
            },
        },
        {
            id: 'varLenGt',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = getVar(store, path) as any;
                return typeof value?.length === 'number' && value.length > expected;
            },
        },
        {
            id: 'varLenGte',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = getVar(store, path) as any;
                return typeof value?.length === 'number' && value.length >= expected;
            },
        },
        {
            id: 'varLenLt',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = getVar(store, path) as any;
                return typeof value?.length === 'number' && value.length < expected;
            },
        },
        {
            id: 'varLenLte',
            resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
                const path = String(args?.[0] ?? '').trim();
                const expected = Number(parsePrimitive(args?.[1]));
                const value = getVar(store, path) as any;
                return typeof value?.length === 'number' && value.length <= expected;
            },
        },
    ];
};
