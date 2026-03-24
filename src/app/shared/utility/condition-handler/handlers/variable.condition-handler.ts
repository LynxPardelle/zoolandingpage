import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import type { Provider } from '@angular/core';
import type { ConditionExecutionContext, ConditionHandler } from '../condition-handler.types';
import { CONDITION_HANDLERS } from '../condition-handlers.token';

const parsePrimitive = (raw: unknown): unknown => {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (raw === 'null') return null;
    if (raw === 'undefined') return undefined;
    if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
    return raw;
};

const getVar = (store: VariableStoreService, path: string): unknown => store.get(path);

type VariableConditionHandlerFactory = (store: VariableStoreService) => ConditionHandler;

const variableConditionHandlerFactories: readonly VariableConditionHandlerFactory[] = [
    (store) => ({
        id: 'var',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            if (!path) return false;
            return Boolean(getVar(store, path));
        },
    }),
    (store) => ({
        id: 'varEq',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            if (!path) return false;
            const expected = parsePrimitive(args?.[1]);
            return getVar(store, path) === expected;
        },
    }),
    (store) => ({
        id: 'varNeq',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            if (!path) return false;
            const expected = parsePrimitive(args?.[1]);
            return getVar(store, path) !== expected;
        },
    }),
    (store) => ({
        id: 'varGt',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = Number(getVar(store, path));
            return !Number.isNaN(value) && !Number.isNaN(expected) && value > expected;
        },
    }),
    (store) => ({
        id: 'varGte',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = Number(getVar(store, path));
            return !Number.isNaN(value) && !Number.isNaN(expected) && value >= expected;
        },
    }),
    (store) => ({
        id: 'varLt',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = Number(getVar(store, path));
            return !Number.isNaN(value) && !Number.isNaN(expected) && value < expected;
        },
    }),
    (store) => ({
        id: 'varLte',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = Number(getVar(store, path));
            return !Number.isNaN(value) && !Number.isNaN(expected) && value <= expected;
        },
    }),
    (store) => ({
        id: 'varIncludes',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = parsePrimitive(args?.[1]);
            const value = getVar(store, path) as any;
            if (typeof value === 'string') return value.includes(String(expected));
            if (Array.isArray(value)) return value.includes(expected);
            return false;
        },
    }),
    (store) => ({
        id: 'varLenEq',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getVar(store, path) as any;
            return value?.length === expected;
        },
    }),
    (store) => ({
        id: 'varLenGt',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getVar(store, path) as any;
            return typeof value?.length === 'number' && value.length > expected;
        },
    }),
    (store) => ({
        id: 'varLenGte',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getVar(store, path) as any;
            return typeof value?.length === 'number' && value.length >= expected;
        },
    }),
    (store) => ({
        id: 'varLenLt',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getVar(store, path) as any;
            return typeof value?.length === 'number' && value.length < expected;
        },
    }),
    (store) => ({
        id: 'varLenLte',
        resolve: (_ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getVar(store, path) as any;
            return typeof value?.length === 'number' && value.length <= expected;
        },
    }),
];

export const variableConditionHandlers = (store: VariableStoreService): ConditionHandler[] =>
    variableConditionHandlerFactories.map((factory) => factory(store));

export const provideVariableConditionHandlers = (): Provider[] =>
    variableConditionHandlerFactories.map((factory) => ({
        provide: CONDITION_HANDLERS,
        multi: true,
        useFactory: (store: VariableStoreService): ConditionHandler => factory(store),
        deps: [VariableStoreService],
    }));
