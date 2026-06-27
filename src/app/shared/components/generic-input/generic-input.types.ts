import type {
    TDynamicBooleanValue,
    TDynamicNumberValue,
    TDynamicStringValue,
    TDynamicValue,
} from '@/app/shared/types/component-runtime.types';
import type { DropdownConfig } from '../generic-dropdown/generic-dropdown.types';
import type { TGenericTextConfig } from '../generic-text/generic-text.types';
import type { TInteractionValidationRule } from '../interaction-scope/interaction-scope.types';

export type TGenericInputTextConfig = Omit<TGenericTextConfig, 'text' | 'html'>;

export type TGenericInputOptionValue = string | number | boolean;

export type TGenericInputControlType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'range'
    | 'checkbox'
    | 'switch'
    | 'select'
    | 'file'
    | 'button-group';

export type TGenericInputOption = {
    readonly value: TGenericInputOptionValue;
    readonly label: TDynamicStringValue;
    readonly description?: TDynamicStringValue;
    readonly disabled?: TDynamicBooleanValue;
};

export type TGenericInputOptionsSource = {
    readonly source: 'i18n' | 'var';
    readonly path: string;
    readonly fallback?: TDynamicValue<readonly TGenericInputOption[]>;
};

export type TGenericInputOptionsValue = readonly TGenericInputOption[] | TGenericInputOptionsSource;

export type TGenericInputConfig = {
    readonly fieldId: string;
    readonly controlType: TGenericInputControlType;
    readonly inputType?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local';
    readonly name?: TDynamicStringValue;
    readonly value?: unknown;
    readonly label?: TDynamicStringValue;
    readonly description?: TDynamicStringValue;
    readonly helperText?: TDynamicStringValue;
    readonly placeholder?: TDynamicStringValue;
    readonly accept?: TDynamicStringValue;
    readonly ariaLabel?: TDynamicStringValue;
    readonly classes?: TDynamicStringValue;
    readonly labelClasses?: TDynamicStringValue;
    readonly descriptionClasses?: TDynamicStringValue;
    readonly helperTextClasses?: TDynamicStringValue;
    readonly fieldClasses?: TDynamicStringValue;
    readonly inputClasses?: TDynamicStringValue;
    readonly switchTrackClasses?: TDynamicStringValue;
    readonly switchTrackActiveClasses?: TDynamicStringValue;
    readonly switchThumbClasses?: TDynamicStringValue;
    readonly switchThumbActiveClasses?: TDynamicStringValue;
    readonly dropdownTriggerClasses?: TDynamicStringValue;
    readonly dropdownIndicatorText?: TDynamicStringValue;
    readonly dropdownIndicatorClasses?: TDynamicStringValue;
    readonly dropdownConfig?: TDynamicValue<DropdownConfig>;
    readonly labelTextConfig?: TDynamicValue<TGenericInputTextConfig>;
    readonly descriptionTextConfig?: TDynamicValue<TGenericInputTextConfig>;
    readonly helperTextConfig?: TDynamicValue<TGenericInputTextConfig>;
    readonly errorTextConfig?: TDynamicValue<TGenericInputTextConfig>;
    readonly dropdownTriggerTextConfig?: TDynamicValue<TGenericInputTextConfig>;
    readonly optionContainerClasses?: TDynamicStringValue;
    readonly optionClasses?: TDynamicStringValue;
    readonly activeOptionClasses?: TDynamicStringValue;
    readonly errorClasses?: TDynamicStringValue;
    readonly validationChecklistClasses?: TDynamicStringValue;
    readonly validationChecklistItemClasses?: TDynamicStringValue;
    readonly validationChecklistValidItemClasses?: TDynamicStringValue;
    readonly validationChecklistInvalidItemClasses?: TDynamicStringValue;
    readonly validationChecklistIconClasses?: TDynamicStringValue;
    readonly validationChecklistLabel?: TDynamicStringValue;
    readonly validationChecklistValidIcon?: TDynamicStringValue;
    readonly validationChecklistInvalidIcon?: TDynamicStringValue;
    readonly valuePrefix?: TDynamicStringValue;
    readonly valueSuffix?: TDynamicStringValue;
    readonly showRangeValue?: TDynamicBooleanValue;
    readonly showValidationChecklist?: TDynamicBooleanValue;
    readonly showPasswordToggle?: TDynamicBooleanValue;
    readonly showPasswordLabel?: TDynamicStringValue;
    readonly hidePasswordLabel?: TDynamicStringValue;
    readonly passwordToggleClasses?: TDynamicStringValue;
    readonly passwordToggleIconClasses?: TDynamicStringValue;
    readonly passwordToggleShowIcon?: TDynamicStringValue;
    readonly passwordToggleHideIcon?: TDynamicStringValue;
    readonly options?: TDynamicValue<TGenericInputOptionsValue>;
    readonly autocompleteOptions?: TDynamicValue<TGenericInputOptionsValue>;
    readonly autocompleteMinLength?: TDynamicNumberValue;
    readonly autocompleteMaxOptions?: TDynamicNumberValue;
    readonly autocompleteMatchMode?: 'none' | 'startsWith' | 'contains';
    readonly min?: TDynamicNumberValue;
    readonly max?: TDynamicNumberValue;
    readonly step?: TDynamicNumberValue;
    readonly rows?: TDynamicNumberValue;
    readonly multiple?: TDynamicBooleanValue;
    readonly required?: TDynamicBooleanValue;
    readonly disabled?: TDynamicBooleanValue;
    readonly readOnly?: TDynamicBooleanValue;
    readonly validation?: TDynamicValue<readonly TInteractionValidationRule[]>;
};

export type TGenericInputValueChange = {
    readonly fieldId: string;
    readonly value: unknown;
    readonly previousValue: unknown;
};
