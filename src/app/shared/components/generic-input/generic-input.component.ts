import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
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

    private readonly scope = inject(InteractionScopeService);

    constructor() {
        effect(() => {
            const registeredConfig = {
                fieldId: this.fieldId(),
                initialValue: this.initialValue(),
                required: this.required(),
                disabled: this.disabled(),
                readOnly: this.readOnly(),
                validation: this.validationRules(),
            };

            this.scope.registerField(registeredConfig);
        });
    }

    readonly fieldId = computed<string>(() => String(this.config().fieldId ?? '').trim());
    readonly controlType = computed(() => this.config().controlType);
    readonly inputType = computed(() => this.config().inputType ?? 'text');
    readonly name = computed(() => String(this.resolveValue(this.config().name) ?? this.fieldId()));
    readonly label = computed(() => this.asString(this.config().label));
    readonly description = computed(() => this.asString(this.config().description));
    readonly helperText = computed(() => this.asString(this.config().helperText));
    readonly placeholder = computed(() => this.asString(this.config().placeholder));
    readonly accept = computed(() => this.asString(this.config().accept));
    readonly ariaLabel = computed(() => this.asString(this.config().ariaLabel));
    readonly classes = computed(() => this.asString(this.config().classes));
    readonly labelClasses = computed(() => this.asString(this.config().labelClasses));
    readonly descriptionClasses = computed(() => this.asString(this.config().descriptionClasses));
    readonly helperTextClasses = computed(() => this.asString(this.config().helperTextClasses));
    readonly fieldClasses = computed(() => this.asString(this.config().fieldClasses));
    readonly inputClasses = computed(() => this.asString(this.config().inputClasses));
    readonly dropdownTriggerClasses = computed(() => this.asString(this.config().dropdownTriggerClasses));
    readonly dropdownIndicatorText = computed(() => this.asString(this.config().dropdownIndicatorText));
    readonly dropdownIndicatorClasses = computed(() => this.asString(this.config().dropdownIndicatorClasses));
    readonly optionContainerClasses = computed(() => this.asString(this.config().optionContainerClasses));
    readonly optionClasses = computed(() => this.asString(this.config().optionClasses));
    readonly activeOptionClasses = computed(() => this.asString(this.config().activeOptionClasses));
    readonly errorClasses = computed(() => this.asString(this.config().errorClasses));
    readonly valuePrefix = computed(() => this.asString(this.config().valuePrefix));
    readonly valueSuffix = computed(() => this.asString(this.config().valueSuffix));
    readonly showRangeValue = computed(() => Boolean(this.resolveValue(this.config().showRangeValue) ?? false));
    readonly required = computed(() => Boolean(this.resolveValue(this.config().required) ?? false));
    readonly disabled = computed(() => Boolean(this.resolveValue(this.config().disabled) ?? false));
    readonly readOnly = computed(() => Boolean(this.resolveValue(this.config().readOnly) ?? false));
    readonly min = computed<number | undefined>(() => this.asNumber(this.config().min));
    readonly max = computed<number | undefined>(() => this.asNumber(this.config().max));
    readonly step = computed<number | undefined>(() => this.asNumber(this.config().step));
    readonly rows = computed<number | undefined>(() => this.asNumber(this.config().rows));
    readonly multiple = computed(() => Boolean(this.resolveValue(this.config().multiple) ?? false));
    readonly initialValue = computed<unknown>(() => this.normalizeValue(this.resolveValue(this.config().value)));
    readonly validationRules = computed<readonly TInteractionValidationRule[]>(() => {
        const resolved = this.resolveValue(this.config().validation);
        return Array.isArray(resolved)
            ? resolved.filter((entry): entry is TInteractionValidationRule => !!entry && typeof entry === 'object' && 'type' in entry)
            : [];
    });
    readonly options = computed<readonly TGenericInputOption[]>(() => {
        const resolved = this.resolveValue(this.config().options);
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
        const value = this.initialValue();
        const errors = validateInteractionValue(value, this.validationRules(), this.required());

        return this.scope.getFieldState(this.fieldId()) ?? {
            value,
            touched: false,
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
        { tag: 'span', classes: '', ariaLabel: this.ariaLabel() || this.label() || undefined }
    ));
    readonly dropdownConfig = computed<DropdownConfig>(() => {
        const override = this.asRecord(this.resolveValue(this.config().dropdownConfig));

        return {
            classes: this.asString(override?.['classes']),
            buttonClasses: this.joinClasses(
                this.inputClasses(),
                this.asString(override?.['buttonClasses'])
            ),
            itemLinkClasses: this.asString(override?.['itemLinkClasses']),
            selectedItemClasses: this.asString(override?.['selectedItemClasses']),
            disabledItemClasses: this.asString(override?.['disabledItemClasses']),
            menuContainerClasses: this.asString(override?.['menuContainerClasses']),
            menuNavClasses: this.asString(override?.['menuNavClasses']),
            menuListClasses: this.asString(override?.['menuListClasses']),
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
        return this.fieldState().touched || this.scope.submitted();
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

    onFileInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = input.files ? Array.from(input.files) : [];

        if (this.multiple()) {
            this.updateValue(files);
            return;
        }

        this.updateValue(files[0] ?? null);
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
        this.scope.markTouched(this.fieldId());
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
        return Boolean(this.resolveValue(option.disabled) ?? false);
    }

    isOptionSelected(option: TGenericInputOption): boolean {
        return this.currentValue() === option.value;
    }

    private updateValue(nextValue: unknown): void {
        const normalized = this.normalizeValue(nextValue);
        const previousValue = this.currentValue();

        this.scope.setFieldValue(this.fieldId(), normalized, { markTouched: true });

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

        if (this.controlType() === 'file') {
            if (this.multiple()) {
                return Array.isArray(value) ? value : [];
            }

            return value ?? null;
        }

        return value ?? '';
    }

    private defaultValue(): unknown {
        if (this.controlType() === 'checkbox') return false;
        if (this.controlType() === 'number' || this.controlType() === 'range') return this.min() ?? 0;
        if (this.controlType() === 'file') return this.multiple() ? [] : null;
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
        const override = this.asRecord(this.resolveValue(overrideValue));

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

    private resolveValue(value: unknown): unknown {
        return resolveDynamicValue(value as never);
    }

    private asString(value: unknown): string {
        const resolved = this.resolveValue(value);
        return resolved == null ? '' : String(resolved);
    }

    private asNumber(value: unknown): number | undefined {
        const resolved = this.resolveValue(value);
        return typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : undefined;
    }
}
