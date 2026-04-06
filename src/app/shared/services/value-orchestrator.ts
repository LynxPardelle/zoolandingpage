import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { environment } from '@/environments/environment';
import { inject, Injectable } from '@angular/core';
import type { ValueExecutionContext, ValueHandler } from '../utility/value-handler/value-handler.types';
import { VALUE_HANDLERS } from '../utility/value-handler/value-handlers.token';
import { ALLOWED_VALUE_IDS } from './value-orchestrator-allowlist';

/**
 * ValueOrchestrator
 *
 * Parses and applies `valueInstructions` to a component, producing a cloned component
 * where selected config fields become dynamic (functions) resolved by registered value handlers.
 *
 * DSL (semicolon-separated commands):
 * - set:<destPath>,<resolverId>,<arg1>,<arg2>...
 *
 * Example:
 *   set:config.label,i18n,hero.primary.label
 *   set:config.ariaLabel,i18n,hero.primary.ariaLabel
 */
@Injectable({ providedIn: 'root' })
export class ValueOrchestrator {
    private readonly handlers = inject(VALUE_HANDLERS, { optional: true }) ?? [];
    private readonly allowedValueIds = inject(ALLOWED_VALUE_IDS);

    private handlerById(): ReadonlyMap<string, ValueHandler> {
        const map = new Map<string, ValueHandler>();
        for (const handler of this.handlers) {
            const id = handler?.id ?? handler?.action;
            if (!id) continue;

            if (map.has(id)) {
                throw new Error(`Duplicate value handler for id "${ id }"`);
            }
            map.set(id, handler);
        }
        return map;
    }

    apply(component: TGenericComponent, ctx: { host: unknown }): TGenericComponent {
        const instructions = (component as any).valueInstructions as string | undefined;
        if (!instructions) return component;

        const allowed = this.allowedValueIds ? new Set(this.allowedValueIds) : undefined;
        const handlers = this.handlerById();

        const commands = this.splitDelimited(instructions, ';', true)
            .map((s) => s.trim())
            .filter(Boolean);

        // IMPORTANT:
        // - We apply commands sequentially so a single `valueInstructions` string can update multiple fields.
        // - Thunks resolve their args at call-time (not apply-time), so they can reference other fields
        //   that were set by earlier commands in the same instruction string.
        let next: any = component as any;
        const host = ctx.host;

        for (const command of commands) {
            const { id, rawArgs } = this.parseCommand(command);
            if (!id) continue;

            if (id === 'set') {
                const destPath = String(rawArgs[0] ?? '').trim();
                const resolverId = String(rawArgs[1] ?? '').trim();
                if (!destPath || !resolverId) continue;
                if (allowed && !allowed.has(resolverId)) continue;

                const resolver = handlers.get(resolverId);
                if (!resolver) {
                    console.warn(`[ValueOrchestrator] No handler registered for id: ${ resolverId }`);
                    continue;
                }

                const resolverRawArgs = rawArgs.slice(2);

                // Store as a thunk to keep it signal-reactive (e.g., i18n/theme/language).
                // Args are resolved when the thunk is called, using the final cloned component state.
                const thunk = () => {
                    const executionCtx: ValueExecutionContext = { component: next as any, host };
                    const resolvedArgs = resolverRawArgs.map((a) => this.resolveArg(a, executionCtx));
                    return resolver.resolve(executionCtx, resolvedArgs);
                };

                next = this.setAtPath(next, destPath, thunk);
                continue;
            }

            // Non-fatal: configs may contain future commands.
            console.warn(`[ValueOrchestrator] Unknown command id: ${ id }`);
        }

        return next as TGenericComponent;
    }

    private parseCommand(command: string): { id: string; rawArgs: string[] } {
        const trimmed = command.trim();
        if (!trimmed) return { id: '', rawArgs: [] };

        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) {
            return { id: trimmed, rawArgs: [] };
        }

        const id = trimmed.slice(0, colonIdx).trim();
        const paramStr = trimmed.slice(colonIdx + 1);
        const rawArgs = paramStr ? this.splitDelimited(paramStr, ',').map((s) => s.trim()) : [];

        return { id, rawArgs };
    }

    private splitDelimited(value: string, delimiter: string, preserveQuotes = false): string[] {
        const tokens: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let index = 0; index < value.length; index += 1) {
            const char = value[index];
            const next = value[index + 1];

            if (char === '\\' && next === '"') {
                if (preserveQuotes) current += '"';
                inQuotes = !inQuotes;
                index += 1;
                continue;
            }

            if (char === '"') {
                if (inQuotes && next === '"') {
                    current += '"';
                    index += 1;
                    continue;
                }

                if (preserveQuotes) current += char;
                inQuotes = !inQuotes;
                continue;
            }

            if (char === delimiter && !inQuotes) {
                tokens.push(current);
                current = '';
                continue;
            }

            current += char;
        }

        tokens.push(current);
        return tokens;
    }

    private resolveArg(raw: string, ctx: ValueExecutionContext): unknown {
        const trimmed = String(raw ?? '').trim();
        if (!trimmed) return '';

        // Explicit evaluation of thunk-like fields.
        // Example: eval:config.label
        if (trimmed.startsWith('eval:')) {
            const inner = trimmed.slice('eval:'.length);
            const value = this.resolveArg(inner, ctx);
            return this.tryCallThunk(value);
        }

        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;

        if (trimmed.startsWith('component.')) {
            return this.resolvePath(trimmed, ctx.component as any, 'component.');
        }

        if (trimmed.startsWith('config.')) {
            return this.resolvePath(trimmed, (ctx.component as any).config, 'config.');
        }

        if (trimmed.startsWith('host.')) {
            return this.resolvePath(trimmed, ctx.host as any, 'host.');
        }

        if (trimmed.startsWith('env.')) {
            return this.resolvePath(trimmed, environment as any, 'env.');
        }

        if (trimmed === 'null') return null;
        if (trimmed === 'undefined') return undefined;

        if (!Number.isNaN(Number(trimmed))) return Number(trimmed);

        return trimmed;
    }

    private tryCallThunk(value: unknown): unknown {
        if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
            return (value as () => unknown)();
        }
        return value;
    }

    private resolvePath(rawPath: string, root: any, prefix: string): unknown {
        const parts = rawPath.replace(prefix, '').split('.').filter(Boolean);
        let cur: any = root;
        for (const part of parts) {
            if (cur == null) return undefined;
            cur = cur[part];
        }
        return cur;
    }

    private setAtPath(obj: any, rawPath: string, value: unknown): any {
        const path = String(rawPath ?? '').trim();
        if (!path) return obj;

        const parts = path.split('.').map((p) => p.trim()).filter(Boolean);
        if (parts.length === 0) return obj;

        const cloneContainer = (v: any) => {
            if (Array.isArray(v)) return v.slice();
            if (v && typeof v === 'object') return { ...v };
            return {};
        };

        const nextRoot = cloneContainer(obj);
        let curNext: any = nextRoot;
        let curPrev: any = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            const prevChild = curPrev?.[key];
            const nextChild = cloneContainer(prevChild);
            curNext[key] = nextChild;
            curNext = nextChild;
            curPrev = prevChild;
        }

        const lastKey = parts[parts.length - 1];
        curNext[lastKey] = value;

        return nextRoot;
    }
}
