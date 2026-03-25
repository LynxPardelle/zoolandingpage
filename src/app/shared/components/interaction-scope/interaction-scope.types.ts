import type { TComponentChild } from '../component-children.types';

export type TInteractionScopeTag = 'div' | 'section' | 'form';

export type TInteractionValidationRule =
    | {
        readonly type: 'required';
        readonly message?: string;
    }
    | {
        readonly type: 'min';
        readonly value: number;
        readonly message?: string;
    }
    | {
        readonly type: 'max';
        readonly value: number;
        readonly message?: string;
    }
    | {
        readonly type: 'minLength';
        readonly value: number;
        readonly message?: string;
    }
    | {
        readonly type: 'maxLength';
        readonly value: number;
        readonly message?: string;
    }
    | {
        readonly type: 'pattern';
        readonly value: string;
        readonly flags?: string;
        readonly message?: string;
    }
    | {
        readonly type: 'email';
        readonly message?: string;
    };

export type TInteractionNumericSource =
    | {
        readonly source: 'field';
        readonly fieldId: string;
    }
    | {
        readonly source: 'literal';
        readonly value: number;
    };

export type TInteractionComputationStep =
    | {
        readonly op: 'add' | 'subtract' | 'multiply' | 'divide' | 'min' | 'max';
        readonly value: TInteractionNumericSource;
    }
    | {
        readonly op: 'clamp';
        readonly min?: number;
        readonly max?: number;
    }
    | {
        readonly op: 'round';
        readonly precision?: number;
    }
    | {
        readonly op: 'abs' | 'floor' | 'ceil';
    };

export type TInteractionComputedDefinition = {
    readonly resultId: string;
    readonly initial: TInteractionNumericSource;
    readonly steps?: readonly TInteractionComputationStep[];
};

export type TInteractionRegisteredFieldConfig = {
    readonly fieldId: string;
    readonly initialValue?: unknown;
    readonly required?: boolean;
    readonly disabled?: boolean;
    readonly readOnly?: boolean;
    readonly validation?: readonly TInteractionValidationRule[];
};

export type TInteractionFieldRuntimeState = {
    readonly value: unknown;
    readonly touched: boolean;
    readonly dirty: boolean;
    readonly errors: readonly string[];
    readonly valid: boolean;
};

export type TInteractionScopeSnapshot = {
    readonly scopeId: string;
    readonly valid: boolean;
    readonly submitted: boolean;
    readonly values: Readonly<Record<string, unknown>>;
    readonly fields: Readonly<Record<string, TInteractionFieldRuntimeState>>;
    readonly computed: Readonly<Record<string, number>>;
};

export type TInteractionScopeConfig = {
    readonly scopeId?: string;
    readonly id?: string;
    readonly tag?: TInteractionScopeTag;
    readonly classes?: string | (() => string);
    readonly role?: string | (() => string);
    readonly ariaLabel?: string | (() => string);
    readonly components?: readonly TComponentChild[];
    readonly initialValues?: Readonly<Record<string, unknown>>;
    readonly computations?: readonly TInteractionComputedDefinition[];
    readonly submitEventInstructions?: string;
};
