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
    | 'select'
    | 'file'
    | 'button-group';

export type TGenericInputOption = {
    readonly value: TGenericInputOptionValue;
    readonly label: TDynamicStringValue;
    readonly description?: TDynamicStringValue;
    readonly disabled?: TDynamicBooleanValue;
};

export type TGenericInputConfig = {
    readonly fieldId: string;
    readonly controlType: TGenericInputControlType;
    readonly inputType?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
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
    readonly valuePrefix?: TDynamicStringValue;
    readonly valueSuffix?: TDynamicStringValue;
    readonly showRangeValue?: TDynamicBooleanValue;
    readonly options?: TDynamicValue<readonly TGenericInputOption[]>;
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
