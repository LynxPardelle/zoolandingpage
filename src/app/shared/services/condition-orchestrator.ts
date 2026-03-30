import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { inject, Injectable } from '@angular/core';
import type { ConditionExecutionContext, ConditionHandler } from '../utility/condition-handler/condition-handler.types';
import { CONDITION_HANDLERS } from '../utility/condition-handler/condition-handlers.token';

/**
 * ConditionOrchestrator
 *
 * Parses and applies `conditionInstructions` to a component, producing a boolean result
 * for dynamic condition evaluation via registered condition handlers.
 *
 * DSL (semicolon-separated commands):
 * - all:<handlerId>,<arg1>,<arg2>...; any:<handlerId>,<arg1>,<arg2>...; not:<handlerId>,<arg1>,...
 *
 * Example:
 *   all:hostEq,modalHostConfig.variant,dialog; not:modalRefId,terms-of-service
 */
@Injectable({ providedIn: 'root' })
export class ConditionOrchestrator {
    private readonly handlers = inject(CONDITION_HANDLERS, { optional: true }) ?? [];

    private handlerById(): ReadonlyMap<string, ConditionHandler> {
        const map = new Map<string, ConditionHandler>();
        for (const handler of this.handlers) {
            const id = handler?.id ?? handler?.action;
            if (!id) continue;
            if (map.has(id)) {
                throw new Error(`Duplicate condition handler for id "${ id }"`);
            }
            map.set(id, handler);
        }
        return map;
    }

    evaluate(component: TGenericComponent, ctx: { host: unknown }): boolean {
        const cond = component.condition;
        if (typeof cond !== 'string') return true;
        const instructions = cond;
        if (!instructions) return true;

        const handlers = this.handlerById();
        const commands = instructions.split(';').map((s) => s.trim()).filter(Boolean);
        const context: ConditionExecutionContext = { component, host: ctx.host };

        let result = true;
        for (const command of commands) {
            const { op, id, rawArgs } = this.parseCommand(command);
            if (!id) continue;
            const handler = handlers.get(id);
            if (!handler) {
                console.warn(`[ConditionOrchestrator] No handler registered for id: ${ id }`);
                continue;
            }
            const resolved = handler.resolve(context, rawArgs);
            if (op === 'all') {
                result = result && resolved;
            } else if (op === 'any') {
                result = result || resolved;
            } else if (op === 'not') {
                result = result && !resolved;
            }
        }
        return result;
    }

    private parseCommand(command: string): { op: string; id: string; rawArgs: string[] } {
        const trimmed = command.trim();
        if (!trimmed) return { op: '', id: '', rawArgs: [] };
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) return { op: 'all', id: trimmed, rawArgs: [] };
        const op = trimmed.slice(0, colonIdx).trim();
        const rest = trimmed.slice(colonIdx + 1);
        const commaIdx = rest.indexOf(',');
        if (commaIdx === -1) return { op, id: rest.trim(), rawArgs: [] };
        const id = rest.slice(0, commaIdx).trim();
        const paramStr = rest.slice(commaIdx + 1);
        const rawArgs = paramStr ? paramStr.split(',').map((s) => s.trim()) : [];
        return { op, id, rawArgs };
    }
}
