import type { DropdownConfig } from '../generic-dropdown/generic-dropdown.types';
import type { TGenericTextConfig } from '../generic-text/generic-text.types';
import type { TInteractionValidationRule } from '../interaction-scope/interaction-scope.types';

export type TGenericInputTextConfig = Omit<TGenericTextConfig, 'text' | 'html' | 'components' | 'componentTemplates'>;

export type TGenericInputOptionValue = string | number | boolean;

export type TGenericInputControlType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'range'
    | 'checkbox'
    | 'select'
    | 'button-group';

export type TGenericInputOption = {
    readonly value: TGenericInputOptionValue;
    readonly label: string | (() => string);
    readonly description?: string | (() => string);
    readonly disabled?: boolean | (() => boolean);
};

export type TGenericInputConfig = {
    readonly fieldId: string;
    readonly controlType: TGenericInputControlType;
    readonly inputType?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
    readonly name?: string;
    readonly value?: unknown;
    readonly label?: string | (() => string);
    readonly description?: string | (() => string);
    readonly helperText?: string | (() => string);
    readonly placeholder?: string | (() => string);
    readonly ariaLabel?: string | (() => string);
    readonly classes?: string | (() => string);
    readonly labelClasses?: string | (() => string);
    readonly descriptionClasses?: string | (() => string);
    readonly helperTextClasses?: string | (() => string);
    readonly fieldClasses?: string | (() => string);
    readonly inputClasses?: string | (() => string);
    readonly dropdownTriggerClasses?: string | (() => string);
    readonly dropdownIndicatorText?: string | (() => string);
    readonly dropdownIndicatorClasses?: string | (() => string);
    readonly dropdownConfig?: DropdownConfig | (() => DropdownConfig);
    readonly labelTextConfig?: TGenericInputTextConfig | (() => TGenericInputTextConfig);
    readonly descriptionTextConfig?: TGenericInputTextConfig | (() => TGenericInputTextConfig);
    readonly helperTextConfig?: TGenericInputTextConfig | (() => TGenericInputTextConfig);
    readonly errorTextConfig?: TGenericInputTextConfig | (() => TGenericInputTextConfig);
    readonly dropdownTriggerTextConfig?: TGenericInputTextConfig | (() => TGenericInputTextConfig);
    readonly optionContainerClasses?: string | (() => string);
    readonly optionClasses?: string | (() => string);
    readonly activeOptionClasses?: string | (() => string);
    readonly errorClasses?: string | (() => string);
    readonly valuePrefix?: string | (() => string);
    readonly valueSuffix?: string | (() => string);
    readonly showRangeValue?: boolean | (() => boolean);
    readonly options?: readonly TGenericInputOption[] | (() => readonly TGenericInputOption[]);
    readonly min?: number | (() => number);
    readonly max?: number | (() => number);
    readonly step?: number | (() => number);
    readonly rows?: number | (() => number);
    readonly required?: boolean | (() => boolean);
    readonly disabled?: boolean | (() => boolean);
    readonly readOnly?: boolean | (() => boolean);
    readonly validation?: readonly TInteractionValidationRule[] | (() => readonly TInteractionValidationRule[]);
};

export type TGenericInputValueChange = {
    readonly fieldId: string;
    readonly value: unknown;
    readonly previousValue: unknown;
};
