import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';

export type ConditionHost = unknown;

export type ConditionExecutionContext = {
    component: TGenericComponent;
    host: ConditionHost;
};

export type ConditionHandler = {
    /**
     * Stable string identifier for the handler (matches the DSL token used in `conditionInstructions`).
     * Example: "env", "featureFlag", "i18nExists".
     */
    id: string;
    /** Back-compat alias. Prefer `id`. */
    action?: string;
    /** Resolve a boolean condition from args + context. */
    resolve: (ctx: ConditionExecutionContext, args: unknown[]) => boolean;
};
