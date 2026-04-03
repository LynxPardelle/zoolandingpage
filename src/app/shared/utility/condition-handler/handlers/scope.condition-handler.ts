import { findInteractionScope } from '@/app/shared/components/interaction-scope/interaction-scope.service';
import { type Provider } from '@angular/core';
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

const getScopeValue = (ctx: ConditionExecutionContext, path: string): unknown => {
    const scope = findInteractionScope(ctx.host);
    if (!scope) return undefined;
    return scope.resolvePath(path);
};

type ScopeConditionHandlerFactory = () => ConditionHandler;

const scopeConditionHandlerFactories: readonly ScopeConditionHandlerFactory[] = [
    () => ({
        id: 'scope',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            if (!path) return false;
            return Boolean(getScopeValue(ctx, path));
        },
    }),
    () => ({
        id: 'scopeEq',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            if (!path) return false;
            const expected = parsePrimitive(args?.[1]);
            return getScopeValue(ctx, path) === expected;
        },
    }),
    () => ({
        id: 'scopeNeq',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            if (!path) return false;
            const expected = parsePrimitive(args?.[1]);
            return getScopeValue(ctx, path) !== expected;
        },
    }),
    () => ({
        id: 'scopeGt',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = Number(getScopeValue(ctx, path));
            return !Number.isNaN(value) && !Number.isNaN(expected) && value > expected;
        },
    }),
    () => ({
        id: 'scopeGte',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = Number(getScopeValue(ctx, path));
            return !Number.isNaN(value) && !Number.isNaN(expected) && value >= expected;
        },
    }),
    () => ({
        id: 'scopeLt',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = Number(getScopeValue(ctx, path));
            return !Number.isNaN(value) && !Number.isNaN(expected) && value < expected;
        },
    }),
    () => ({
        id: 'scopeLte',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = Number(getScopeValue(ctx, path));
            return !Number.isNaN(value) && !Number.isNaN(expected) && value <= expected;
        },
    }),
    () => ({
        id: 'scopeIncludes',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = parsePrimitive(args?.[1]);
            const value = getScopeValue(ctx, path) as any;
            if (typeof value === 'string') return value.includes(String(expected));
            if (Array.isArray(value)) return value.includes(expected);
            return false;
        },
    }),
    () => ({
        id: 'scopeLenEq',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getScopeValue(ctx, path) as any;
            return value?.length === expected;
        },
    }),
    () => ({
        id: 'scopeLenGt',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getScopeValue(ctx, path) as any;
            return typeof value?.length === 'number' && value.length > expected;
        },
    }),
    () => ({
        id: 'scopeLenGte',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getScopeValue(ctx, path) as any;
            return typeof value?.length === 'number' && value.length >= expected;
        },
    }),
    () => ({
        id: 'scopeLenLt',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getScopeValue(ctx, path) as any;
            return typeof value?.length === 'number' && value.length < expected;
        },
    }),
    () => ({
        id: 'scopeLenLte',
        resolve: (ctx: ConditionExecutionContext, args: unknown[]): boolean => {
            const path = String(args?.[0] ?? '').trim();
            const expected = Number(parsePrimitive(args?.[1]));
            const value = getScopeValue(ctx, path) as any;
            return typeof value?.length === 'number' && value.length <= expected;
        },
    }),
];

export const scopeConditionHandlers = (): ConditionHandler[] =>
    scopeConditionHandlerFactories.map((factory) => factory());

export const provideScopeConditionHandlers = (): Provider[] =>
    scopeConditionHandlerFactories.map((factory) => ({
        provide: CONDITION_HANDLERS,
        multi: true,
        useFactory: factory,
    }));
