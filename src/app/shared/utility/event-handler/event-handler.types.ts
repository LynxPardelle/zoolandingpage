export type OrchestratorEvent = {
    componentId: string;
    eventName: string;
    meta_title?: string;
    eventData?: unknown;
    eventInstructions?: string;
};

export type EventHost = unknown;

export type EventExecutionContext = {
    event: OrchestratorEvent;
    host: EventHost;
};

export type EventHandler = {
    /**
     * Stable string identifier for the handler (matches the DSL action token).
    * Example: "toggleTheme", "openModal".
     */
    id: string;
    /**
     * Back-compat alias. Prefer `id`.
     */
    action?: string;
    handle: (ctx: EventExecutionContext, args: unknown[]) => void;
};
