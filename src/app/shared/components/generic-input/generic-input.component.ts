import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericDropdown } from '../generic-dropdown/generic-dropdown.component';
import type { DropdownConfig, DropdownItem } from '../generic-dropdown/generic-dropdown.types';
import { GenericTextComponent } from '../generic-text/generic-text';
import type { TGenericTextConfig } from '../generic-text/generic-text.types';
import { InteractionScopeService, validateInteractionValue } from '../interaction-scope/interaction-scope.service';
import type { TInteractionValidationRule } from '../interaction-scope/interaction-scope.types';
import type { TGenericInputConfig, TGenericInputOption, TGenericInputValueChange } from './generic-input.types';

@Component({
    selector: 'generic-input',
    standalone: true,
    imports: [CommonModule, GenericButtonComponent, GenericDropdown, GenericTextComponent],
    templateUrl: './generic-input.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericInputComponent {
    readonly config = input.required<TGenericInputConfig>();
    readonly valueChanged = output<TGenericInputValueChange>();
    readonly blurred = output<{ fieldId: string }>();

    private readonly scope = inject(InteractionScopeService, { optional: true });
    private readonly localValue = signal<unknown>('');
    private readonly localTouched = signal(false);

    constructor() {
        effect(() => {
            const initialValue = this.resolveMaybeThunk(this.config().value);
            const registeredConfig = {
                fieldId: this.fieldId(),
                initialValue,
                required: this.required(),
                disabled: this.disabled(),
                readOnly: this.readOnly(),
                validation: this.validationRules(),
            };

            if (this.scope) {
                this.scope.registerField(registeredConfig);
                return;
            }

            this.localValue.set(initialValue ?? this.defaultValue());
        });
    }

    readonly fieldId = computed<string>(() => String(this.config().fieldId ?? '').trim());
    readonly controlType = computed(() => this.config().controlType);
    readonly inputType = computed(() => this.config().inputType ?? 'text');
    readonly name = computed(() => String(this.resolveMaybeThunk(this.config().name) ?? this.fieldId()));
    readonly label = computed(() => this.asString(this.config().label));
    readonly description = computed(() => this.asString(this.config().description));
    readonly helperText = computed(() => this.asString(this.config().helperText));
    readonly placeholder = computed(() => this.asString(this.config().placeholder));
    readonly ariaLabel = computed(() => this.asString(this.config().ariaLabel));
    readonly classes = computed(() => this.asString(this.config().classes));
    readonly labelClasses = computed(() => this.asString(this.config().labelClasses));
    readonly descriptionClasses = computed(() => this.asString(this.config().descriptionClasses));
    readonly helperTextClasses = computed(() => this.asString(this.config().helperTextClasses));
    readonly fieldClasses = computed(() => this.asString(this.config().fieldClasses));
    readonly inputClasses = computed(() => this.asString(this.config().inputClasses));
    readonly optionContainerClasses = computed(() => this.asString(this.config().optionContainerClasses));
    readonly optionClasses = computed(() => this.asString(this.config().optionClasses));
    readonly activeOptionClasses = computed(() => this.asString(this.config().activeOptionClasses));
    readonly errorClasses = computed(() => this.asString(this.config().errorClasses));
    readonly valuePrefix = computed(() => this.asString(this.config().valuePrefix));
    readonly valueSuffix = computed(() => this.asString(this.config().valueSuffix));
    readonly showRangeValue = computed(() => Boolean(this.resolveMaybeThunk(this.config().showRangeValue) ?? false));
    readonly required = computed(() => Boolean(this.resolveMaybeThunk(this.config().required) ?? false));
    readonly disabled = computed(() => Boolean(this.resolveMaybeThunk(this.config().disabled) ?? false));
    readonly readOnly = computed(() => Boolean(this.resolveMaybeThunk(this.config().readOnly) ?? false));
    readonly min = computed<number | undefined>(() => this.asNumber(this.config().min));
    readonly max = computed<number | undefined>(() => this.asNumber(this.config().max));
    readonly step = computed<number | undefined>(() => this.asNumber(this.config().step));
    readonly rows = computed<number | undefined>(() => this.asNumber(this.config().rows));
    readonly validationRules = computed<readonly TInteractionValidationRule[]>(() => {
        const resolved = this.resolveMaybeThunk(this.config().validation);
        return Array.isArray(resolved)
            ? resolved.filter((entry): entry is TInteractionValidationRule => !!entry && typeof entry === 'object' && 'type' in entry)
            : [];
    });
    readonly options = computed<readonly TGenericInputOption[]>(() => {
        const resolved = this.resolveMaybeThunk(this.config().options);
        return Array.isArray(resolved) ? resolved.filter((entry): entry is TGenericInputOption => !!entry && typeof entry === 'object') : [];
    });
    readonly dropdownItems = computed<readonly DropdownItem[]>(() =>
        this.options().map((option, index) => ({
            id: `${ this.fieldId() }-${ index }-${ String(option.value) }`,
            label: option.label,
            value: String(option.value),
            disabled: this.optionDisabled(option),
        }))
    );

    readonly fieldState = computed(() => {
        if (this.scope) {
            return this.scope.getFieldState(this.fieldId()) ?? {
                value: this.defaultValue(),
                touched: false,
                dirty: false,
                errors: [],
                valid: true,
            };
        }

        const value = this.localValue();
        const errors = validateInteractionValue(value, this.validationRules(), this.required());

        return {
            value,
            touched: this.localTouched(),
            dirty: false,
            errors,
            valid: errors.length === 0,
        };
    });

    readonly currentValue = computed(() => this.fieldState().value);
    readonly currentTextValue = computed(() => String(this.currentValue() ?? ''));
    readonly currentNumberValue = computed(() => {
        const current = this.currentValue();
        return typeof current === 'number' ? current : Number(current ?? this.min() ?? 0);
    });
    readonly currentBooleanValue = computed(() => Boolean(this.currentValue()));
    readonly selectedOptionLabel = computed(() => {
        const selected = this.options().find((option) => this.isOptionSelected(option));
        if (selected) return this.optionLabel(selected);

        const firstOption = this.options()[0];
        if (firstOption) return this.optionLabel(firstOption);

        return this.placeholder() || '';
    });
    readonly labelTextConfig = computed<TGenericTextConfig>(() => this.buildTextConfig(
        this.label(),
        this.config().labelTextConfig,
        { tag: 'span', classes: this.labelClasses(), ariaLabel: this.ariaLabel() || undefined }
    ));
    readonly descriptionTextConfig = computed<TGenericTextConfig>(() => this.buildTextConfig(
        this.description(),
        this.config().descriptionTextConfig,
        { tag: 'p', classes: this.descriptionClasses() }
    ));
    readonly helperTextConfig = computed<TGenericTextConfig>(() => this.buildTextConfig(
        this.helperText(),
        this.config().helperTextConfig,
        { tag: 'p', classes: this.helperTextClasses() }
    ));
    readonly checkboxTextConfig = computed<TGenericTextConfig>(() => this.buildTextConfig(
        this.helperText() || this.label(),
        this.config().helperTextConfig,
        { tag: 'span', classes: '' }
    ));
    readonly rangeValueTextConfig = computed<TGenericTextConfig>(() => this.buildTextConfig(
        `${ this.valuePrefix() }${ this.currentNumberValue() }${ this.valueSuffix() }`,
        this.config().helperTextConfig,
        { tag: 'p', classes: this.helperTextClasses() }
    ));
    readonly dropdownTriggerTextConfig = computed<TGenericTextConfig>(() => this.buildTextConfig(
        this.selectedOptionLabel(),
        this.config().dropdownTriggerTextConfig,
        { tag: 'span', classes: 'ank-display-block ank-flex-1 ank-overflow-hidden', ariaLabel: this.ariaLabel() || this.label() || undefined }
    ));
    readonly dropdownConfig = computed<DropdownConfig>(() => {
        const override = this.asRecord(this.resolveMaybeThunk(this.config().dropdownConfig));

        return {
            classes: this.joinClasses('ank-width-100per', this.asString(override?.['classes'])),
            buttonClasses: this.joinClasses(
                this.inputClasses(),
                'ank-width-100per ank-display-flex ank-alignItems-center ank-justifyContent-spaceBetween ank-gap-12px ank-cursor-pointer',
                this.asString(override?.['buttonClasses'])
            ),
            itemLinkClasses: this.joinClasses(
                'ank-display-flex ank-width-100per ank-alignItems-center ank-textDecoration-none ank-paddingInline-14px ank-paddingBlock-12px ank-lineHeight-1_4 ank-color-titleColor',
                this.asString(override?.['itemLinkClasses'])
            ),
            selectedItemClasses: this.joinClasses(
                'ank-bg-secondaryBgColor ank-fontWeight-700',
                this.asString(override?.['selectedItemClasses'])
            ),
            disabledItemClasses: this.joinClasses(
                'ank-opacity-50 ank-cursor-notAllowed',
                this.asString(override?.['disabledItemClasses'])
            ),
            menuContainerClasses: this.joinClasses(
                'ank-border-1px__solid__secondaryAccentColor ank-borderRadius-14px ank-bg-bgColor ank-overflow-hidden ank-boxShadow-0__18px__40px__bgColor__OPA__0_18',
                this.asString(override?.['menuContainerClasses'])
            ),
            menuNavClasses: this.joinClasses('ank-width-100per', this.asString(override?.['menuNavClasses'])),
            menuListClasses: this.joinClasses('ank-display-flex ank-flexDirection-column ank-gap-0', this.asString(override?.['menuListClasses'])),
            menuRole: (override?.['menuRole'] as 'menu' | 'listbox' | undefined) ?? 'listbox',
            itemRole: (override?.['itemRole'] as 'menuitem' | 'option' | undefined) ?? 'option',
            triggerRole: typeof override?.['triggerRole'] === 'string' ? String(override['triggerRole']) : 'combobox',
            ariaLabel: typeof override?.['ariaLabel'] === 'string'
                ? String(override['ariaLabel'])
                : (this.ariaLabel() || this.label() || undefined),
            selectedItemId: typeof override?.['selectedItemId'] === 'string'
                ? String(override['selectedItemId'])
                : this.currentTextValue(),
            closeOnSelect: override?.['closeOnSelect'] === undefined ? true : Boolean(override['closeOnSelect']),
            renderMode: (override?.['renderMode'] as 'overlay' | 'inline' | undefined) ?? 'overlay',
            menuId: typeof override?.['menuId'] === 'string' ? String(override['menuId']) : undefined,
            menuContainerId: typeof override?.['menuContainerId'] === 'string' ? String(override['menuContainerId']) : undefined,
            inlinePortalTargetSelector: typeof override?.['inlinePortalTargetSelector'] === 'string' ? String(override['inlinePortalTargetSelector']) : undefined,
            overlayOrigin: (override?.['overlayOrigin'] as 'host' | 'closestHeader' | 'closestContainer' | undefined) ?? undefined,
            overlayMatchWidth: (override?.['overlayMatchWidth'] as 'none' | 'origin' | 'viewport' | undefined) ?? 'origin',
            overlayOffsetY: typeof override?.['overlayOffsetY'] === 'number' ? override['overlayOffsetY'] : 6,
        };
    });
    readonly showErrors = computed(() => {
        if (this.scope) {
            return this.fieldState().touched || this.scope.submitted();
        }
        return this.fieldState().touched;
    });
    readonly visibleErrors = computed(() => (this.showErrors() ? this.fieldState().errors : []));

    onTextInput(event: Event): void {
        this.updateValue((event.target as HTMLInputElement | HTMLTextAreaElement).value);
    }

    onNumberInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.updateValue(input.valueAsNumber);
    }

    onCheckboxInput(event: Event): void {
        this.updateValue((event.target as HTMLInputElement).checked);
    }

    onSelectInput(event: Event): void {
        const nextValue = (event.target as HTMLSelectElement).value;
        this.updateValue(this.resolveOptionValue(nextValue));
    }

    onDropdownSelect(item: DropdownItem): void {
        this.updateValue(this.resolveOptionValue(String(item.value ?? item.id ?? '')));
        this.onBlur();
    }

    onBlur(): void {
        if (this.scope) {
            this.scope.markTouched(this.fieldId());
        } else {
            this.localTouched.set(true);
        }
        this.blurred.emit({ fieldId: this.fieldId() });
    }

    onButtonGroupSelect(option: TGenericInputOption): void {
        this.updateValue(option.value);
        this.onBlur();
    }

    optionLabel(option: TGenericInputOption): string {
        return this.asString(option.label);
    }

    optionDescription(option: TGenericInputOption): string {
        return this.asString(option.description);
    }

    optionDisabled(option: TGenericInputOption): boolean {
        return Boolean(this.resolveMaybeThunk(option.disabled) ?? false);
    }

    isOptionSelected(option: TGenericInputOption): boolean {
        return this.currentValue() === option.value;
    }

    private updateValue(nextValue: unknown): void {
        const normalized = this.normalizeValue(nextValue);
        const previousValue = this.currentValue();

        if (this.scope) {
            this.scope.setFieldValue(this.fieldId(), normalized, { markTouched: true });
        } else {
            this.localValue.set(normalized);
        }

        this.valueChanged.emit({
            fieldId: this.fieldId(),
            value: normalized,
            previousValue,
        });
    }

    private resolveOptionValue(rawValue: string): unknown {
        const matched = this.options().find((option) => String(option.value) === rawValue);
        return matched?.value ?? rawValue;
    }

    private normalizeValue(value: unknown): unknown {
        if (this.controlType() === 'number' || this.controlType() === 'range') {
            const parsed = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(parsed)) {
                return this.min() ?? 0;
            }
            return parsed;
        }

        if (this.controlType() === 'checkbox') {
            return Boolean(value);
        }

        return value ?? '';
    }

    private defaultValue(): unknown {
        if (this.controlType() === 'checkbox') return false;
        if (this.controlType() === 'number' || this.controlType() === 'range') return this.min() ?? 0;
        return '';
    }

    errorTextConfig(error: string): TGenericTextConfig {
        return this.buildTextConfig(
            error,
            this.config().errorTextConfig,
            { tag: 'p', classes: '' }
        );
    }

    buildTextConfig(
        text: string,
        overrideValue: unknown,
        base: Omit<TGenericTextConfig, 'text'>,
    ): TGenericTextConfig {
        const override = this.asRecord(this.resolveMaybeThunk(overrideValue));

        return {
            tag: typeof override?.['tag'] === 'string' ? override['tag'] as TGenericTextConfig['tag'] : base.tag,
            text,
            classes: this.joinClasses(
                typeof base.classes === 'string' ? base.classes : '',
                typeof override?.['classes'] === 'string' ? String(override['classes']) : ''
            ),
            id: typeof override?.['id'] === 'string' ? String(override['id']) : base.id,
            ariaLabel: typeof override?.['ariaLabel'] === 'string' ? String(override['ariaLabel']) : base.ariaLabel,
        };
    }

    private asRecord(value: unknown): Record<string, unknown> | undefined {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? value as Record<string, unknown>
            : undefined;
    }

    private joinClasses(...values: string[]): string {
        return values.map((value) => String(value ?? '').trim()).filter(Boolean).join(' ');
    }

    private resolveMaybeThunk(value: unknown): unknown {
        if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
            return (value as () => unknown)();
        }
        return value;
    }

    private asString(value: unknown): string {
        const resolved = this.resolveMaybeThunk(value);
        return resolved == null ? '' : String(resolved);
    }

    private asNumber(value: unknown): number | undefined {
        const resolved = this.resolveMaybeThunk(value);
        return typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : undefined;
    }
}
