
import type { Provider } from '@angular/core';

import type { ConditionExecutionContext, ConditionHandler } from './condition-handler.types';
import { CONDITION_HANDLERS } from './condition-handlers.token';
import {
    hostConditionHandler,
    hostEndsWithConditionHandler,
    hostEqConditionHandler,
    hostGtConditionHandler,
    hostGteConditionHandler,
    hostIncludesConditionHandler,
    hostLenEqConditionHandler,
    hostLenGtConditionHandler,
    hostLenGteConditionHandler,
    hostLenLtConditionHandler,
    hostLenLteConditionHandler,
    hostLtConditionHandler,
    hostLteConditionHandler,
    hostNeqConditionHandler,
    hostRegexConditionHandler,
    hostStartsWithConditionHandler,
} from './handlers/host.condition-handler';
import { i18nExistsConditionHandler } from './handlers/i18n.condition-handler';
import { createLogicHandlers } from './handlers/logic.condition-handler';
import { modalRefIdConditionHandler } from './handlers/modal-ref.condition-handler';
import { navigationConditionHandler } from './handlers/navigation.condition-handler';
import { provideVariableConditionHandlers } from './handlers/variable.condition-handler';

export function provideConditionHandlers(): Provider[] {
    // Registry for logic handlers (self-referential, so must be built after all others)
    const baseHandlers: ConditionHandler[] = [
        i18nExistsConditionHandler,
        navigationConditionHandler,
        hostConditionHandler,
        hostEqConditionHandler,
        hostIncludesConditionHandler,
        hostNeqConditionHandler,
        hostGtConditionHandler,
        hostGteConditionHandler,
        hostLtConditionHandler,
        hostLteConditionHandler,
        hostStartsWithConditionHandler,
        hostEndsWithConditionHandler,
        hostRegexConditionHandler,
        hostLenEqConditionHandler,
        hostLenGtConditionHandler,
        hostLenGteConditionHandler,
        hostLenLtConditionHandler,
        hostLenLteConditionHandler,
        modalRefIdConditionHandler,
        // --- Utility handlers ---
        { id: 'true', resolve: () => true },
        { id: 'false', resolve: () => false },
        { id: 'always', resolve: () => true },
        { id: 'never', resolve: () => false },
        { id: 'exists', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => args.length > 0 && args[0] != null },
        { id: 'empty', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => args.length === 0 || args[0] == null || args[0] === '' || (Array.isArray(args[0]) && args[0].length === 0) },
        { id: 'eq', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => args.length > 1 && args[0] == args[1] },
        { id: 'neq', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => args.length > 1 && args[0] != args[1] },
        { id: 'gt', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => args.length > 1 && Number(args[0]) > Number(args[1]) },
        { id: 'lt', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => args.length > 1 && Number(args[0]) < Number(args[1]) },
        { id: 'gte', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => args.length > 1 && Number(args[0]) >= Number(args[1]) },
        { id: 'lte', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => args.length > 1 && Number(args[0]) <= Number(args[1]) },
        { id: 'type', resolve: (_ctx: ConditionExecutionContext, args: unknown[]) => typeof args[0] === args[1] },
    ];

    // Build logic handlers with access to all base handlers
    const registry: Record<string, ConditionHandler> = {};
    for (const h of baseHandlers) registry[h.id] = h;
    const logicHandlers = createLogicHandlers(registry);

    return [
        ...baseHandlers.map((h) => ({ provide: CONDITION_HANDLERS, multi: true, useValue: h })),
        ...logicHandlers.map((h) => ({ provide: CONDITION_HANDLERS, multi: true, useValue: h })),
        ...provideVariableConditionHandlers(),
    ];
}
