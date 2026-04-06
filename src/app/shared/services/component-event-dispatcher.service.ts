import { inject, Injectable } from '@angular/core';
import { EventOrchestrator } from './event-orchestrator';
import { ALLOWED_EVENT_IDS } from './event-orchestrator-allowlist';

export type ComponentEvent = {
    componentId: string;
    meta_title?: string;
    eventName: string;
    eventData?: unknown;
    eventInstructions?: string;
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
        const { event } = ctx;
        console.log(
            `Event "${ event.eventName }" triggered from component with id "${ event.componentId }" with the following data: `,
            event.eventData,
            ' // and the following instructions: ',
            event.eventInstructions,
        );

        this.eventOrchestrator.execute(ctx, {
            allowedActions: options.allowedActions ?? this.allowedEventIds,
            fallback: options.fallback,
        });
    }
}
