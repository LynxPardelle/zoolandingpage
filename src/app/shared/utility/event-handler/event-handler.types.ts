export type OrchestratorEvent = {
    componentId: string;
    eventName: string;
    meta_title?: string;
    eventData?: unknown;
    eventInstructions?: string;
    userGesture?: boolean;
};

export type EventHost = unknown;

export type EventExecutionContext = {
    event: OrchestratorEvent;
    host: EventHost;
    /** Trusted active page identity supplied by the runtime for pre-bootstrap actions. */
    pageId?: string;
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
    handle: (ctx: EventExecutionContext, args: unknown[]) => void | Promise<void>;
};
