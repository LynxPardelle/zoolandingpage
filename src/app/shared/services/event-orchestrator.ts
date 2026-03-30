import { inject, Injectable } from '@angular/core';
import type {
  EventExecutionContext,
  EventHandler,
  OrchestratorEvent,
} from '../utility/event-handler/event-handler.types';
import { EVENT_HANDLERS } from '../utility/event-handler/event-handlers.token';

@Injectable({
  providedIn: 'root',
})
export class EventOrchestrator {

  private readonly handlers = inject(EVENT_HANDLERS, { optional: true }) ?? [];

  private handlerById(): ReadonlyMap<string, EventHandler> {
    const map = new Map<string, EventHandler>();
    for (const handler of this.handlers) {
      const id = handler?.id ?? handler?.action;
      if (!id) continue;

      if (map.has(id)) {
        throw new Error(`Duplicate event handler for id "${ id }"`);
      }
      map.set(id, handler);
    }
    return map;
  }

  execute(
    ctx: EventExecutionContext,
    opts?: {
      allowedActions?: ReadonlyArray<string>;
      fallback?: (action: string, args: unknown[], ctx: EventExecutionContext) => void;
    },
  ): void {
    const instructions = ctx.event.eventInstructions;
    if (!instructions) return;

    const allowed = opts?.allowedActions ? new Set(opts.allowedActions) : undefined;
    const handlers = this.handlerById();

    const commands = instructions
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const command of commands) {
      const { id, rawArgs } = this.parseCommand(command);
      if (!id) continue;
      if (allowed && !allowed.has(id)) continue;

      const args = rawArgs.map((a) => this.resolveArg(a, ctx.event));

      const handler = handlers.get(id);
      if (handler) {
        handler.handle(ctx, args);
        continue;
      }

      if (opts?.fallback) {
        opts.fallback(id, args, ctx);
        continue;
      }

      // Intentionally non-fatal; configs may contain older actions.
      console.warn(`[EventOrchestrator] No handler registered for id: ${ id }`);
    }
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
    const rawArgs = paramStr
      ? paramStr.split(',').map((s) => s.trim())
      : [];

    return { id, rawArgs };
  }

  private resolveArg(raw: string, event: OrchestratorEvent): unknown {
    const trimmed = raw.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('event.')) {
      return this.resolveEventPath(trimmed, event);
    }

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;

    // Keep parity with legacy behavior: numeric strings become numbers.
    if (!Number.isNaN(Number(trimmed))) return Number(trimmed);

    return trimmed;
  }

  private resolveEventPath(rawPath: string, event: OrchestratorEvent): unknown {
    const path = rawPath.trim();
    const parts = path.replace(/^event\./, '').split('.').filter(Boolean);

    let cur: any = event as any;
    for (const part of parts) {
      if (cur == null) return undefined;
      cur = cur[part];
    }
    return cur;
  }
}
