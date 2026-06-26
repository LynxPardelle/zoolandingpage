import { Injectable, Signal, computed, signal } from '@angular/core';
import type {
    TInteractionComputationStep,
    TInteractionComputedDefinition,
    TInteractionFieldRuntimeState,
    TInteractionNumericSource,
    TInteractionRegisteredFieldConfig,
    TInteractionScopeConfig,
    TInteractionScopeSnapshot,
    TInteractionValidationRule,
} from './interaction-scope.types';

const DEFAULT_EMPTY_VALUE = '';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeKey = (value: unknown): string => String(value ?? '').trim();

const resolveRecordPath = (root: unknown, path: string): unknown =>
    path
        .split('.')
        .filter(Boolean)
        .reduce<unknown>((current, segment) => {
            if (!isRecord(current) && !Array.isArray(current)) return undefined;
            return (current as Record<string, unknown>)[segment];
        }, root);

const normalizeValidationRules = (rules: unknown): readonly TInteractionValidationRule[] =>
    Array.isArray(rules)
        ? rules.filter((rule): rule is TInteractionValidationRule => isRecord(rule) && typeof rule['type'] === 'string')
        : [];

const asFiniteNumber = (value: unknown): number | undefined => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

export const validateInteractionValue = (
    value: unknown,
    rules: readonly TInteractionValidationRule[] | unknown = [],
    required = false,
    context: { readonly values?: Readonly<Record<string, unknown>> } = {},
): readonly string[] => {
    const errors: string[] = [];
    const safeRules = normalizeValidationRules(rules);
    const normalizedRules = required
        ? [{ type: 'required', message: undefined } as const, ...safeRules]
        : [...safeRules];

    normalizedRules.forEach((rule) => {
        if (rule.type === 'required') {
            const missing =
                value == null ||
                value === '' ||
                (typeof value === 'string' && value.trim().length === 0) ||
                (Array.isArray(value) && value.length === 0) ||
                value === false;
            if (missing) {
                errors.push(rule.message ?? 'This field is required.');
            }
            return;
        }

        if (value == null || value === '') {
            return;
        }

        if (rule.type === 'min') {
            const numeric = asFiniteNumber(value);
            if (numeric == null || numeric < rule.value) {
                errors.push(rule.message ?? `Minimum value is ${ rule.value }.`);
            }
            return;
        }

        if (rule.type === 'max') {
            const numeric = asFiniteNumber(value);
            if (numeric == null || numeric > rule.value) {
                errors.push(rule.message ?? `Maximum value is ${ rule.value }.`);
            }
            return;
        }

        if (rule.type === 'minLength') {
            const length = String(value).length;
            if (length < rule.value) {
                errors.push(rule.message ?? `Minimum length is ${ rule.value }.`);
            }
            return;
        }

        if (rule.type === 'maxLength') {
            const length = String(value).length;
            if (length > rule.value) {
                errors.push(rule.message ?? `Maximum length is ${ rule.value }.`);
            }
            return;
        }

        if (rule.type === 'pattern') {
            try {
                const expression = new RegExp(rule.value, rule.flags);
                if (!expression.test(String(value))) {
                    errors.push(rule.message ?? 'The value format is invalid.');
                }
            } catch {
                errors.push(rule.message ?? 'The value format is invalid.');
            }
            return;
        }

        if (rule.type === 'email') {
            if (!EMAIL_PATTERN.test(String(value))) {
                errors.push(rule.message ?? 'Please enter a valid email address.');
            }
            return;
        }

        if (rule.type === 'matchesField') {
            const otherValue = context.values?.[rule.fieldId];
            if (String(value) !== String(otherValue ?? '')) {
                errors.push(rule.message ?? 'The values do not match.');
            }
        }
    });

    return errors;
};

export type TInteractionScopeHost = {
    readonly scopeId: string;
    readonly interactionScope: InteractionScopeService;
    readonly parentHost?: unknown;
    readonly submitInteractionScope?: () => TInteractionScopeSnapshot;
    readonly resetInteractionScope?: () => void;
    readonly autoSubmitInteractionScope?: (source: TInteractionScopeAutoSubmitSource) => void;
};

export type TInteractionScopeAutoSubmitSource = {
    readonly componentId: string;
    readonly eventName: string;
    readonly eventData?: unknown;
};

export const findInteractionScopeHost = (host: unknown): TInteractionScopeHost | undefined => {
    let current = host;
    while (isRecord(current)) {
        if (current['interactionScope'] instanceof InteractionScopeService) {
            return current as TInteractionScopeHost;
        }
        current = current['parentHost'];
    }
    return undefined;
};

export const findInteractionScope = (host: unknown): InteractionScopeService | undefined =>
    findInteractionScopeHost(host)?.interactionScope;

@Injectable()
export class InteractionScopeService {
    private readonly scopeIdSignal = signal('');
    private readonly initialValues = signal<Readonly<Record<string, unknown>>>({});
    private readonly fieldDefinitions = signal<Readonly<Record<string, TInteractionRegisteredFieldConfig>>>({});
    private readonly fieldStates = signal<Readonly<Record<string, TInteractionFieldRuntimeState>>>({});
    private readonly computations = signal<Readonly<Record<string, TInteractionComputedDefinition>>>({});
    readonly submitted = signal(false);

    readonly scopeId: Signal<string> = computed(() => this.scopeIdSignal());
    readonly valid: Signal<boolean> = computed(() =>
        Object.values(this.fieldStates()).every((field) => field.valid)
    );

    readonly computedValues = computed<Readonly<Record<string, number>>>(() => {
        const definitions = this.computations();
        const values = this.values();
        const results: Record<string, number> = {};

        Object.values(definitions).forEach((definition) => {
            results[definition.resultId] = this.runComputation(definition, values);
        });

        return results;
    });

    readonly values = computed<Readonly<Record<string, unknown>>>(() => {
        const initialValues = this.initialValues();
        const states = this.fieldStates();

        return {
            ...initialValues,
            ...Object.fromEntries(
                Object.entries(states).map(([fieldId, state]) => [fieldId, state.value])
            ),
        };
    });

    readonly scopeState = computed(() => ({
        values: this.values(),
        fields: this.fieldStates(),
        computed: this.computedValues(),
        meta: {
            scopeId: this.scopeId(),
            submitted: this.submitted(),
            valid: this.valid(),
        },
    }));

    readonly snapshot = computed<TInteractionScopeSnapshot>(() => {
        const state = this.scopeState();

        return {
            scopeId: this.scopeId(),
            submitted: this.submitted(),
            valid: state.meta.valid,
            values: state.values,
            fields: state.fields,
            computed: state.computed,
        };
    });

    configure(config: TInteractionScopeConfig): void {
        const nextScopeId = normalizeKey(config.scopeId ?? config.id);
        const nextInitialValues = config.initialValues ?? {};
        const nextComputations = Object.fromEntries(
            (config.computations ?? []).map((definition) => [definition.resultId, definition])
        );

        if (this.scopeIdSignal() === nextScopeId
            && this.stableValue(this.initialValues()) === this.stableValue(nextInitialValues)
            && this.stableValue(this.computations()) === this.stableValue(nextComputations)) {
            return;
        }

        this.scopeIdSignal.set(nextScopeId);
        this.initialValues.set(nextInitialValues);
        this.computations.set(nextComputations);
    }

    registerField(config: TInteractionRegisteredFieldConfig): void {
        const fieldId = normalizeKey(config.fieldId);
        if (!fieldId) return;

        const currentDefinitions = this.fieldDefinitions();
        if (!this.areRegisteredFieldConfigsEqual(currentDefinitions[fieldId], config)) {
            this.fieldDefinitions.set({
                ...currentDefinitions,
                [fieldId]: config,
            });
        }

        const currentStates = this.fieldStates();
        const existing = currentStates[fieldId];
        const initialValue = config.initialValue ?? this.initialValues()[fieldId] ?? DEFAULT_EMPTY_VALUE;
        const nextValue = existing?.dirty ? existing.value : initialValue;
        const nextStates = this.rebuildFieldStates(
            {
                ...currentStates,
                [fieldId]: {
                    ...(existing ?? {
                        touched: false,
                        dirty: false,
                        errors: [],
                        valid: true,
                    }),
                    value: nextValue,
                },
            },
            {
                [fieldId]: {
                    value: nextValue,
                    definition: config,
                    previous: existing,
                },
            }
        );

        if (this.stableValue(currentStates) !== this.stableValue(nextStates)) {
            this.fieldStates.set(nextStates);
        }
    }

    setFieldValue(fieldId: string, value: unknown, opts?: { markTouched?: boolean }): void {
        const normalizedFieldId = normalizeKey(fieldId);
        if (!normalizedFieldId) return;

        const definition = this.getFieldDefinition(normalizedFieldId);

        this.fieldStates.update((current) =>
            this.rebuildFieldStates(current, {
                [normalizedFieldId]: {
                    value,
                    definition,
                    previous: {
                        ...current[normalizedFieldId],
                        touched: opts?.markTouched ?? current[normalizedFieldId]?.touched ?? false,
                        dirty: true,
                    },
                },
            })
        );
    }

    markTouched(fieldId: string): void {
        const normalizedFieldId = normalizeKey(fieldId);
        if (!normalizedFieldId) return;

        const definition = this.getFieldDefinition(normalizedFieldId);

        this.fieldStates.update((current) => {
            const previous = current[normalizedFieldId];
            if (!previous) return current;

            return this.rebuildFieldStates(current, {
                [normalizedFieldId]: {
                    value: previous.value,
                    definition,
                    previous: {
                        ...previous,
                        touched: true,
                    },
                },
            });
        });
    }

    reset(): void {
        this.submitted.set(false);
        const definitions = this.fieldDefinitions();
        const initialValues = this.initialValues();

        this.fieldStates.set(
            this.rebuildFieldStates(
                Object.fromEntries(
                    Object.entries(definitions).map(([fieldId, definition]) => [
                        fieldId,
                        {
                            value: definition.initialValue ?? initialValues[fieldId] ?? DEFAULT_EMPTY_VALUE,
                            touched: false,
                            dirty: false,
                            errors: [],
                            valid: true,
                        },
                    ])
                )
            )
        );
    }

    submit(): TInteractionScopeSnapshot {
        this.submitted.set(true);
        const definitions = this.fieldDefinitions();

        this.fieldStates.update((current) => {
            const overrides = Object.fromEntries(
                Object.entries(current).map(([fieldId, state]) => [
                    fieldId,
                    {
                        value: state.value,
                        definition: this.getFieldDefinition(fieldId),
                        previous: {
                            ...state,
                            touched: true,
                        },
                    },
                ])
            );
            return this.rebuildFieldStates(current, overrides);
        });

        return this.snapshot();
    }

    getFieldState(fieldId: string): TInteractionFieldRuntimeState | undefined {
        return this.fieldStates()[fieldId];
    }

    resolvePath(path: string): unknown {
        const normalized = normalizeKey(path);
        if (!normalized) return this.snapshot();

        return resolveRecordPath(this.scopeState(), normalized);
    }

    private getFieldDefinition(fieldId: string): TInteractionRegisteredFieldConfig {
        return this.fieldDefinitions()[fieldId] ?? { fieldId };
    }

    private areRegisteredFieldConfigsEqual(
        previous: TInteractionRegisteredFieldConfig | undefined,
        next: TInteractionRegisteredFieldConfig,
    ): boolean {
        if (!previous) return false;

        return previous.fieldId === next.fieldId
            && this.stableValue(previous.initialValue) === this.stableValue(next.initialValue)
            && previous.required === next.required
            && previous.disabled === next.disabled
            && previous.readOnly === next.readOnly
            && this.stableValue(previous.validation ?? []) === this.stableValue(next.validation ?? []);
    }

    private areFieldStatesEqual(
        previous: TInteractionFieldRuntimeState | undefined,
        next: TInteractionFieldRuntimeState,
    ): boolean {
        if (!previous) return false;

        return this.stableValue(previous.value) === this.stableValue(next.value)
            && previous.touched === next.touched
            && previous.dirty === next.dirty
            && previous.valid === next.valid
            && this.stableValue(previous.errors) === this.stableValue(next.errors);
    }

    private stableValue(value: unknown): string {
        if (value === undefined) return 'undefined';

        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    private buildFieldState(
        value: unknown,
        definition: TInteractionRegisteredFieldConfig,
        previous?: Partial<TInteractionFieldRuntimeState>,
        values: Readonly<Record<string, unknown>> = this.values(),
    ): TInteractionFieldRuntimeState {
        const errors = validateInteractionValue(value, definition.validation, Boolean(definition.required), { values });
        return {
            value,
            touched: previous?.touched ?? false,
            dirty: previous?.dirty ?? false,
            errors,
            valid: errors.length === 0,
        };
    }

    private rebuildFieldStates(
        current: Readonly<Record<string, TInteractionFieldRuntimeState>>,
        overrides: Readonly<Record<string, {
            readonly value: unknown;
            readonly definition?: TInteractionRegisteredFieldConfig;
            readonly previous?: Partial<TInteractionFieldRuntimeState>;
        }>> = {},
    ): Readonly<Record<string, TInteractionFieldRuntimeState>> {
        const nextBase = { ...current };

        Object.entries(overrides).forEach(([fieldId, override]) => {
            nextBase[fieldId] = {
                ...(current[fieldId] ?? {
                    touched: false,
                    dirty: false,
                    errors: [],
                    valid: true,
                }),
                value: override.value,
            };
        });

        const values = this.buildValues(nextBase);
        return Object.fromEntries(
            Object.entries(nextBase).map(([fieldId, state]) => {
                const override = overrides[fieldId];
                return [
                    fieldId,
                    this.buildFieldState(
                        state.value,
                        override?.definition ?? this.getFieldDefinition(fieldId),
                        override?.previous ?? state,
                        values,
                    ),
                ];
            })
        );
    }

    private buildValues(states: Readonly<Record<string, TInteractionFieldRuntimeState>>): Readonly<Record<string, unknown>> {
        return {
            ...this.initialValues(),
            ...Object.fromEntries(
                Object.entries(states).map(([fieldId, state]) => [fieldId, state.value])
            ),
        };
    }

    private runComputation(
        definition: TInteractionComputedDefinition,
        values: Readonly<Record<string, unknown>>,
    ): number {
        let current = this.resolveNumericSource(definition.initial, values);

        definition.steps?.forEach((step) => {
            current = this.applyComputationStep(current, step, values);
        });

        return current;
    }

    private resolveNumericSource(
        source: TInteractionNumericSource,
        values: Readonly<Record<string, unknown>>,
    ): number {
        if (source.source === 'literal') {
            return Number.isFinite(source.value) ? source.value : 0;
        }

        const resolved = values[source.fieldId];
        return asFiniteNumber(resolved) ?? 0;
    }

    private applyComputationStep(
        current: number,
        step: TInteractionComputationStep,
        values: Readonly<Record<string, unknown>>,
    ): number {
        switch (step.op) {
            case 'abs':
                return Math.abs(current);
            case 'floor':
                return Math.floor(current);
            case 'ceil':
                return Math.ceil(current);
            case 'round': {
                const precision = Number.isFinite(step.precision) ? Number(step.precision) : 0;
                const factor = Math.pow(10, precision);
                return Math.round(current * factor) / factor;
            }
            case 'clamp': {
                const min = Number.isFinite(step.min) ? Number(step.min) : undefined;
                const max = Number.isFinite(step.max) ? Number(step.max) : undefined;
                const nextMin = min == null ? current : Math.max(current, min);
                return max == null ? nextMin : Math.min(nextMin, max);
            }
            case 'add':
                return current + this.resolveNumericSource(step.value, values);
            case 'subtract':
                return current - this.resolveNumericSource(step.value, values);
            case 'multiply':
                return current * this.resolveNumericSource(step.value, values);
            case 'divide':
                return this.resolveNumericSource(step.value, values) === 0
                    ? current
                    : current / this.resolveNumericSource(step.value, values);
            case 'min':
                return Math.min(current, this.resolveNumericSource(step.value, values));
            case 'max':
                return Math.max(current, this.resolveNumericSource(step.value, values));
            default:
                return current;
        }
    }
}
