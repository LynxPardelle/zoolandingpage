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

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

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
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(String(value))) {
                errors.push(rule.message ?? 'Please enter a valid email address.');
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

    readonly snapshot = computed<TInteractionScopeSnapshot>(() => {
        const fields = this.fieldStates();
        const computedValues = this.computedValues();
        const valid = Object.values(fields).every((field) => field.valid);

        return {
            scopeId: this.scopeId(),
            submitted: this.submitted(),
            valid,
            values: this.values(),
            fields,
            computed: computedValues,
        };
    });

    configure(config: TInteractionScopeConfig): void {
        this.scopeIdSignal.set(String(config.scopeId ?? config.id ?? '').trim());
        this.initialValues.set(config.initialValues ?? {});
        this.computations.set(
            Object.fromEntries((config.computations ?? []).map((definition) => [definition.resultId, definition]))
        );
    }

    registerField(config: TInteractionRegisteredFieldConfig): void {
        const fieldId = String(config.fieldId ?? '').trim();
        if (!fieldId) return;

        this.fieldDefinitions.update((current) => ({
            ...current,
            [fieldId]: config,
        }));

        this.fieldStates.update((current) => {
            const existing = current[fieldId];
            const initialValue = config.initialValue ?? this.initialValues()[fieldId] ?? '';
            const nextState = this.buildFieldState(
                existing?.value ?? initialValue,
                config,
                existing,
            );

            return {
                ...current,
                [fieldId]: nextState,
            };
        });
    }

    setFieldValue(fieldId: string, value: unknown, opts?: { markTouched?: boolean }): void {
        const normalizedFieldId = String(fieldId ?? '').trim();
        if (!normalizedFieldId) return;

        const definition = this.fieldDefinitions()[normalizedFieldId] ?? { fieldId: normalizedFieldId };

        this.fieldStates.update((current) => {
            const previous = current[normalizedFieldId];
            return {
                ...current,
                [normalizedFieldId]: this.buildFieldState(value, definition, {
                    ...previous,
                    touched: opts?.markTouched ?? previous?.touched ?? false,
                    dirty: true,
                }),
            };
        });
    }

    markTouched(fieldId: string): void {
        const normalizedFieldId = String(fieldId ?? '').trim();
        if (!normalizedFieldId) return;

        const definition = this.fieldDefinitions()[normalizedFieldId] ?? { fieldId: normalizedFieldId };

        this.fieldStates.update((current) => {
            const previous = current[normalizedFieldId];
            if (!previous) return current;

            return {
                ...current,
                [normalizedFieldId]: this.buildFieldState(previous.value, definition, {
                    ...previous,
                    touched: true,
                }),
            };
        });
    }

    reset(): void {
        this.submitted.set(false);
        const definitions = this.fieldDefinitions();
        const initialValues = this.initialValues();

        this.fieldStates.set(
            Object.fromEntries(
                Object.entries(definitions).map(([fieldId, definition]) => [
                    fieldId,
                    this.buildFieldState(definition.initialValue ?? initialValues[fieldId] ?? '', definition),
                ])
            )
        );
    }

    submit(): TInteractionScopeSnapshot {
        this.submitted.set(true);
        const definitions = this.fieldDefinitions();

        this.fieldStates.update((current) =>
            Object.fromEntries(
                Object.entries(current).map(([fieldId, state]) => [
                    fieldId,
                    this.buildFieldState(state.value, definitions[fieldId] ?? { fieldId }, {
                        ...state,
                        touched: true,
                    }),
                ])
            )
        );

        return this.snapshot();
    }

    getFieldState(fieldId: string): TInteractionFieldRuntimeState | undefined {
        return this.fieldStates()[fieldId];
    }

    resolvePath(path: string): unknown {
        const normalized = String(path ?? '').trim();
        if (!normalized) return this.snapshot();

        const snapshot = {
            values: this.values(),
            fields: this.fieldStates(),
            computed: this.computedValues(),
            meta: {
                scopeId: this.scopeId(),
                submitted: this.submitted(),
                valid: this.snapshot().valid,
            },
        };

        return normalized.split('.').filter(Boolean).reduce<unknown>((current, segment) => {
            if (!isRecord(current) && !Array.isArray(current)) return undefined;
            return (current as Record<string, unknown>)[segment];
        }, snapshot);
    }

    private buildFieldState(
        value: unknown,
        definition: TInteractionRegisteredFieldConfig,
        previous?: Partial<TInteractionFieldRuntimeState>,
    ): TInteractionFieldRuntimeState {
        const errors = validateInteractionValue(value, definition.validation, Boolean(definition.required));
        return {
            value,
            touched: previous?.touched ?? false,
            dirty: previous?.dirty ?? false,
            errors,
            valid: errors.length === 0,
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
