import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';

export type ValueHost = unknown;

export type ValueExecutionContext = {
    component: TGenericComponent;
    host: ValueHost;
};

export type ValueHandler = {
    /**
     * Stable string identifier for the resolver (matches the DSL token used in `valueInstructions`).
     * Example: "i18n", "literal".
     */
    id: string;
    /** Back-compat alias. Prefer `id`. */
    action?: string;
    /** Resolve a value from args + context. */
    resolve: (ctx: ValueExecutionContext, args: unknown[]) => unknown;
};
