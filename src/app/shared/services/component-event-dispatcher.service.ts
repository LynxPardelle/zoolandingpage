import { inject, Injectable } from '@angular/core';
import { EventOrchestrator } from './event-orchestrator';
import { ALLOWED_EVENT_IDS } from './event-orchestrator-allowlist';

export type ComponentEvent = {
    componentId: string;
    meta_title?: string;
    eventName: string;
    eventData?: unknown;
    eventInstructions?: string;
    userGesture?: boolean;
};

export type ComponentEventDispatchContext = {
    event: ComponentEvent;
    host: unknown;
};

export type ComponentEventDispatchOptions = {
    allowedActions?: readonly string[];
    fallback?: (action: string, args: unknown[]) => void;
};

@Injectable({
    providedIn: 'root',
})
export class ComponentEventDispatcherService {
    private readonly eventOrchestrator = inject(EventOrchestrator);
    private readonly allowedEventIds = inject(ALLOWED_EVENT_IDS);

    dispatch(ctx: ComponentEventDispatchContext, options: ComponentEventDispatchOptions): void {
        this.eventOrchestrator.execute(ctx, {
            allowedActions: options.allowedActions ?? this.allowedEventIds,
            fallback: options.fallback,
        });
    }
}
