import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import { I18nService } from '../../services/i18n.service';
import { VariableStoreService } from '../../services/variable-store.service';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericDropdown } from '../generic-dropdown/generic-dropdown.component';
import type {
  DropdownConfig,
  DropdownItem,
} from '../generic-dropdown/generic-dropdown.types';
import { GenericTextComponent } from '../generic-text/generic-text';
import type { TGenericTextConfig } from '../generic-text/generic-text.types';
import {
  InteractionScopeService,
  validateInteractionValue,
} from '../interaction-scope/interaction-scope.service';
import type { TInteractionValidationRule } from '../interaction-scope/interaction-scope.types';
import type {
  TGenericInputConfig,
  TGenericInputOption,
  TGenericInputOptionsSource,
  TGenericInputValueChange,
} from './generic-input.types';

@Component({
  selector: 'generic-input',
  standalone: true,
  imports: [GenericButtonComponent, GenericDropdown, GenericTextComponent],
  templateUrl: './generic-input.component.html',
  styles: [`
    .zlp-joined-search-input {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      border-right: 0;
    }
  `],
  host: {
    '[attr.data-zlp-field-id]': 'fieldId()',
    '[attr.data-zlp-field-valid]': 'fieldState().valid ? "true" : "false"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericInputComponent {
  readonly config = input.required<TGenericInputConfig>();
  readonly valueChanged = output<TGenericInputValueChange>();
  readonly blurred = output<{ fieldId: string }>();

  private readonly scope = inject(InteractionScopeService, { optional: true });
  private readonly variables = inject(VariableStoreService);
  private readonly i18n = inject(I18nService);
  private readonly localValue = signal<unknown>(undefined);
  private readonly localTouched = signal(false);
  private readonly localDirty = signal(false);

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

      untracked(() => {
        if (this.scope) {
          this.scope.registerField(registeredConfig);
          return;
        }

        if (!this.localDirty()) {
          this.localValue.set(this.initialValue());
        }
      });
    });
  }

  readonly fieldId = computed<string>(() =>
    String(this.config().fieldId ?? '').trim()
  );
  readonly controlType = computed(() => this.config().controlType);
  readonly inputType = computed(() => this.config().inputType ?? 'text');
  readonly name = computed(() =>
    String(this.resolveValue(this.config().name) ?? this.fieldId())
  );
  readonly label = computed(() => this.asString(this.config().label));
  readonly description = computed(() =>
    this.asString(this.config().description)
  );
  readonly helperText = computed(() => this.asString(this.config().helperText));
  readonly placeholder = computed(() =>
    this.asString(this.config().placeholder)
  );
  readonly accept = computed(() => this.asString(this.config().accept));
  readonly ariaLabel = computed(() => this.asString(this.config().ariaLabel));
  readonly classes = computed(() => this.asString(this.config().classes));
  readonly labelClasses = computed(() =>
    this.asString(this.config().labelClasses)
  );
  readonly descriptionClasses = computed(() =>
    this.asString(this.config().descriptionClasses)
  );
  readonly helperTextClasses = computed(() =>
    this.asString(this.config().helperTextClasses)
  );
  readonly fieldClasses = computed(() =>
    this.asString(this.config().fieldClasses)
  );
  readonly inputClasses = computed(() =>
    this.asString(this.config().inputClasses)
  );
  readonly passwordToggleClasses = computed(() =>
    this.asString(this.config().passwordToggleClasses)
  );
  readonly passwordToggleIconClasses = computed(() =>
    this.asString(this.config().passwordToggleIconClasses)
  );
  readonly switchTrackClasses = computed(() =>
    this.asString(this.config().switchTrackClasses)
  );
  readonly switchTrackActiveClasses = computed(() =>
    this.asString(this.config().switchTrackActiveClasses)
  );
  readonly switchThumbClasses = computed(() =>
    this.asString(this.config().switchThumbClasses)
  );
  readonly switchThumbActiveClasses = computed(() =>
    this.asString(this.config().switchThumbActiveClasses)
  );
  readonly dropdownTriggerClasses = computed(() =>
    this.asString(this.config().dropdownTriggerClasses)
  );
  readonly dropdownIndicatorText = computed(() =>
    this.asString(this.config().dropdownIndicatorText)
  );
  readonly dropdownIndicatorClasses = computed(() =>
    this.asString(this.config().dropdownIndicatorClasses)
  );
  readonly optionContainerClasses = computed(() =>
    this.asString(this.config().optionContainerClasses)
  );
  readonly optionClasses = computed(() =>
    this.asString(this.config().optionClasses)
  );
  readonly activeOptionClasses = computed(() =>
    this.asString(this.config().activeOptionClasses)
  );
  readonly errorClasses = computed(() =>
    this.asString(this.config().errorClasses)
  );
  readonly validationChecklistClasses = computed(() =>
    this.asString(this.config().validationChecklistClasses)
  );
  readonly validationChecklistItemClasses = computed(() =>
    this.asString(this.config().validationChecklistItemClasses)
  );
  readonly validationChecklistValidItemClasses = computed(() =>
    this.asString(this.config().validationChecklistValidItemClasses)
  );
  readonly validationChecklistInvalidItemClasses = computed(() =>
    this.asString(this.config().validationChecklistInvalidItemClasses)
  );
  readonly validationChecklistIconClasses = computed(() =>
    this.asString(this.config().validationChecklistIconClasses)
  );
  readonly validationChecklistLabel = computed(() =>
    this.asString(this.config().validationChecklistLabel)
  );
  readonly validationChecklistValidIcon = computed(() =>
    this.asString(this.config().validationChecklistValidIcon) || 'OK'
  );
  readonly validationChecklistInvalidIcon = computed(() =>
    this.asString(this.config().validationChecklistInvalidIcon) || '-'
  );
  readonly valuePrefix = computed(() =>
    this.asString(this.config().valuePrefix)
  );
  readonly valueSuffix = computed(() =>
    this.asString(this.config().valueSuffix)
  );
  readonly showRangeValue = computed(() =>
    Boolean(this.resolveValue(this.config().showRangeValue) ?? false)
  );
  readonly showValidationChecklist = computed(() =>
    Boolean(this.resolveValue(this.config().showValidationChecklist) ?? false)
  );
  readonly showPasswordToggle = computed(
    () =>
      this.inputType() === 'password' &&
      Boolean(this.resolveValue(this.config().showPasswordToggle) ?? false)
  );
  readonly passwordVisible = signal(false);
  readonly resolvedInputType = computed(() =>
    this.showPasswordToggle() && this.passwordVisible() ? 'text' : this.inputType()
  );
  readonly showPasswordLabel = computed(
    () => this.asString(this.config().showPasswordLabel) || 'Show password'
  );
  readonly hidePasswordLabel = computed(
    () => this.asString(this.config().hidePasswordLabel) || 'Hide password'
  );
  readonly passwordToggleLabel = computed(() =>
    this.passwordVisible() ? this.hidePasswordLabel() : this.showPasswordLabel()
  );
  readonly passwordToggleIcon = computed(() => {
    const configured = this.passwordVisible()
      ? this.asString(this.config().passwordToggleHideIcon)
      : this.asString(this.config().passwordToggleShowIcon);
    return configured || (this.passwordVisible() ? 'visibility_off' : 'preview');
  });
  readonly required = computed(() =>
    Boolean(this.resolveValue(this.config().required) ?? false)
  );
  readonly disabled = computed(() =>
    Boolean(this.resolveValue(this.config().disabled) ?? false)
  );
  readonly readOnly = computed(() =>
    Boolean(this.resolveValue(this.config().readOnly) ?? false)
  );
  readonly min = computed<number | undefined>(() =>
    this.asNumber(this.config().min)
  );
  readonly max = computed<number | undefined>(() =>
    this.asNumber(this.config().max)
  );
  readonly step = computed<number | undefined>(() =>
    this.asNumber(this.config().step)
  );
  readonly rows = computed<number | undefined>(() =>
    this.asNumber(this.config().rows)
  );
  readonly multiple = computed(() =>
    Boolean(this.resolveValue(this.config().multiple) ?? false)
  );
  readonly initialValue = computed<unknown>(() =>
    this.normalizeValue(this.resolveValue(this.config().value))
  );
  readonly validationRules = computed<readonly TInteractionValidationRule[]>(
    () => {
      const resolved = this.resolveValue(this.config().validation);
      return Array.isArray(resolved)
        ? resolved.filter(
            (entry): entry is TInteractionValidationRule =>
              !!entry && typeof entry === 'object' && 'type' in entry
          )
        : [];
    }
  );
  readonly options = computed<readonly TGenericInputOption[]>(() => {
    return this.resolveOptions(this.config().options);
  });
  readonly autocompleteOptions = computed<readonly TGenericInputOption[]>(
    () => {
      return this.resolveOptions(this.config().autocompleteOptions);
    }
  );
  readonly autocompleteMinLength = computed(() =>
    Math.max(
      0,
      Math.floor(this.asNumber(this.config().autocompleteMinLength) ?? 0)
    )
  );
  readonly autocompleteMaxOptions = computed(() => {
    const resolved = this.asNumber(this.config().autocompleteMaxOptions);
    return resolved === undefined
      ? undefined
      : Math.max(0, Math.floor(resolved));
  });
  readonly autocompleteMatchMode = computed<'none' | 'startsWith' | 'contains'>(
    () => {
      const resolved = this.asString(
        this.config().autocompleteMatchMode
      ).trim();
      return resolved === 'startsWith' ||
        resolved === 'contains' ||
        resolved === 'none'
        ? resolved
        : 'none';
    }
  );
  readonly visibleAutocompleteOptions = computed<
    readonly TGenericInputOption[]
  >(() => {
    const query = this.currentTextValue().trim().toLowerCase();
    if (query.length < this.autocompleteMinLength()) {
      return [];
    }

    const mode = this.autocompleteMatchMode();
    const filtered =
      mode === 'none'
        ? this.autocompleteOptions()
        : this.autocompleteOptions().filter((option) => {
            const value = String(option.value ?? '').toLowerCase();
            const label = this.optionLabel(option).toLowerCase();
            return mode === 'startsWith'
              ? value.startsWith(query) || label.startsWith(query)
              : value.includes(query) || label.includes(query);
          });

    const maxOptions = this.autocompleteMaxOptions();
    return maxOptions === undefined || maxOptions === 0
      ? filtered
      : filtered.slice(0, maxOptions);
  });
  readonly autocompleteListId = computed(
    () => `${this.fieldId() || 'input'}-autocomplete`
  );
  readonly dropdownItems = computed<readonly DropdownItem[]>(() =>
    this.options().map((option, index) => ({
      id: `${this.fieldId()}-${index}-${String(option.value)}`,
      label: option.label,
      value: String(option.value),
      disabled: this.optionDisabled(option),
    }))
  );

  readonly fieldState = computed(() => {
    const value = this.scope
      ? this.initialValue()
      : this.localDirty()
        ? this.localValue()
        : this.initialValue();
    const errors = validateInteractionValue(
      value,
      this.validationRules(),
      this.required(),
      { values: this.currentScopeValues() }
    );

    return (
      this.scope?.getFieldState(this.fieldId()) ?? {
        value,
        touched: this.localTouched(),
        dirty: this.localDirty(),
        errors,
        valid: errors.length === 0,
      }
    );
  });

  readonly currentValue = computed(() => this.fieldState().value);
  readonly currentTextValue = computed(() => String(this.currentValue() ?? ''));
  readonly currentNumberValue = computed(() => {
    const current = this.currentValue();
    return typeof current === 'number'
      ? current
      : Number(current ?? this.min() ?? 0);
  });
  readonly currentBooleanValue = computed(() =>
    this.asBoolean(this.currentValue())
  );
  readonly resolvedSwitchTrackClasses = computed(() =>
    this.joinClasses(
      this.switchTrackClasses(),
      this.currentBooleanValue() ? this.switchTrackActiveClasses() : ''
    )
  );
  readonly resolvedSwitchThumbClasses = computed(() =>
    this.joinClasses(
      this.switchThumbClasses(),
      this.currentBooleanValue() ? this.switchThumbActiveClasses() : ''
    )
  );
  readonly selectedOptionLabel = computed(() => {
    const selected = this.options().find((option) =>
      this.isOptionSelected(option)
    );
    if (selected) return this.optionLabel(selected);

    const firstOption = this.options()[0];
    if (firstOption) return this.optionLabel(firstOption);

    return this.placeholder() || '';
  });
  readonly labelTextConfig = computed<TGenericTextConfig>(() =>
    this.buildTextConfig(this.label(), this.config().labelTextConfig, {
      tag: 'span',
      classes: this.labelClasses(),
      ariaLabel: this.ariaLabel() || undefined,
    })
  );
  readonly descriptionTextConfig = computed<TGenericTextConfig>(() =>
    this.buildTextConfig(
      this.description(),
      this.config().descriptionTextConfig,
      { tag: 'p', classes: this.descriptionClasses() }
    )
  );
  readonly helperTextConfig = computed<TGenericTextConfig>(() =>
    this.buildTextConfig(this.helperText(), this.config().helperTextConfig, {
      tag: 'p',
      classes: this.helperTextClasses(),
    })
  );
  readonly checkboxTextConfig = computed<TGenericTextConfig>(() =>
    this.buildTextConfig(
      this.helperText() || this.label(),
      this.config().helperTextConfig,
      { tag: 'span', classes: '' }
    )
  );
  readonly rangeValueTextConfig = computed<TGenericTextConfig>(() =>
    this.buildTextConfig(
      `${this.valuePrefix()}${this.currentNumberValue()}${this.valueSuffix()}`,
      this.config().helperTextConfig,
      { tag: 'p', classes: this.helperTextClasses() }
    )
  );
  readonly dropdownTriggerTextConfig = computed<TGenericTextConfig>(() =>
    this.buildTextConfig(
      this.selectedOptionLabel(),
      this.config().dropdownTriggerTextConfig,
      {
        tag: 'span',
        classes: '',
        ariaLabel: this.ariaLabel() || this.label() || undefined,
      }
    )
  );
  readonly dropdownConfig = computed<DropdownConfig>(() => {
    const override = this.asRecord(
      this.resolveValue(this.config().dropdownConfig)
    );

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
      menuRole:
        (override?.['menuRole'] as 'menu' | 'listbox' | undefined) ?? 'listbox',
      itemRole:
        (override?.['itemRole'] as 'menuitem' | 'option' | undefined) ??
        'option',
      triggerRole:
        typeof override?.['triggerRole'] === 'string'
          ? String(override['triggerRole'])
          : 'combobox',
      ariaLabel:
        typeof override?.['ariaLabel'] === 'string'
          ? String(override['ariaLabel'])
          : this.ariaLabel() || this.label() || undefined,
      selectedItemId:
        typeof override?.['selectedItemId'] === 'string'
          ? String(override['selectedItemId'])
          : this.currentTextValue(),
      closeOnSelect:
        override?.['closeOnSelect'] === undefined
          ? true
          : Boolean(override['closeOnSelect']),
      renderMode:
        (override?.['renderMode'] as 'overlay' | 'inline' | undefined) ??
        'overlay',
      menuId:
        typeof override?.['menuId'] === 'string'
          ? String(override['menuId'])
          : undefined,
      menuContainerId:
        typeof override?.['menuContainerId'] === 'string'
          ? String(override['menuContainerId'])
          : undefined,
      inlinePortalTargetSelector:
        typeof override?.['inlinePortalTargetSelector'] === 'string'
          ? String(override['inlinePortalTargetSelector'])
          : undefined,
      overlayOrigin:
        (override?.['overlayOrigin'] as
          | 'host'
          | 'closestHeader'
          | 'closestContainer'
          | undefined) ?? undefined,
      overlayMatchWidth:
        (override?.['overlayMatchWidth'] as
          | 'none'
          | 'origin'
          | 'viewport'
          | undefined) ?? 'origin',
      overlayOffsetY:
        typeof override?.['overlayOffsetY'] === 'number'
          ? override['overlayOffsetY']
          : 6,
    };
  });
  readonly showErrors = computed(() => {
    return this.fieldState().touched || (this.scope?.submitted() ?? false);
  });
  readonly visibleErrors = computed(() =>
    this.showErrors() ? this.fieldState().errors : []
  );
  readonly validationChecklistItems = computed(() =>
    this.validationRules()
      .filter((rule) => typeof rule.message === 'string' && rule.message.trim().length > 0)
      .map((rule) => ({
        message: rule.message?.trim() ?? '',
        valid: this.isValidationChecklistRuleMet(rule),
      }))
  );

  onTextInput(event: Event): void {
    this.updateTextTargetValue(event.target);
  }

  onDeferredTextInput(event: Event): void {
    const target = event.target;
    globalThis.setTimeout(() => this.updateTextTargetValue(target), 0);
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
    this.updateValue(
      this.resolveOptionValue(String(item.value ?? item.id ?? ''))
    );
    this.onBlur();
  }

  onBlur(event?: Event): void {
    this.updateTextTargetValue(event?.target ?? null);
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

  togglePasswordVisibility(): void {
    if (!this.showPasswordToggle()) return;
    this.passwordVisible.update((visible) => !visible);
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

    if (this.scope) {
      this.scope.setFieldValue(this.fieldId(), normalized, { markTouched: true });
    } else {
      this.localValue.set(normalized);
      this.localTouched.set(true);
      this.localDirty.set(true);
    }

    this.valueChanged.emit({
      fieldId: this.fieldId(),
      value: normalized,
      previousValue,
    });
  }

  private updateTextTargetValue(target: EventTarget | null): void {
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    this.updateValue(target.value);
  }

  private resolveOptionValue(rawValue: string): unknown {
    const matched = this.options().find(
      (option) => String(option.value) === rawValue
    );
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

    if (this.controlType() === 'checkbox' || this.controlType() === 'switch') {
      return this.asBoolean(value);
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
    if (this.controlType() === 'checkbox' || this.controlType() === 'switch')
      return false;
    if (this.controlType() === 'number' || this.controlType() === 'range')
      return this.min() ?? 0;
    if (this.controlType() === 'file') return this.multiple() ? [] : null;
    return '';
  }

  errorTextConfig(error: string): TGenericTextConfig {
    return this.buildTextConfig(error, this.config().errorTextConfig, {
      tag: 'p',
      classes: '',
    });
  }

  validationChecklistItemClassesFor(valid: boolean): string {
    return this.joinClasses(
      this.validationChecklistItemClasses(),
      valid
        ? this.validationChecklistValidItemClasses()
        : this.validationChecklistInvalidItemClasses()
    );
  }

  private isValidationChecklistRuleMet(rule: TInteractionValidationRule): boolean {
    const value = this.currentValue();
    const empty = value == null || value === '' || (typeof value === 'string' && value.trim().length === 0);
    if (empty && rule.type !== 'required') {
      return false;
    }

    return validateInteractionValue(value, [rule], false, { values: this.currentScopeValues() }).length === 0;
  }

  private currentScopeValues(): Readonly<Record<string, unknown>> {
    if (this.scope) {
      return this.scope.values();
    }

    const fieldId = this.fieldId();
    return fieldId
      ? {
          [fieldId]: this.localDirty()
            ? this.localValue()
            : this.initialValue(),
        }
      : {};
  }

  buildTextConfig(
    text: string,
    overrideValue: unknown,
    base: Omit<TGenericTextConfig, 'text'>
  ): TGenericTextConfig {
    const override = this.asRecord(this.resolveValue(overrideValue));

    return {
      tag:
        typeof override?.['tag'] === 'string'
          ? (override['tag'] as TGenericTextConfig['tag'])
          : base.tag,
      text,
      classes: this.joinClasses(
        typeof base.classes === 'string' ? base.classes : '',
        typeof override?.['classes'] === 'string'
          ? String(override['classes'])
          : ''
      ),
      id:
        typeof override?.['id'] === 'string' ? String(override['id']) : base.id,
      ariaLabel:
        typeof override?.['ariaLabel'] === 'string'
          ? String(override['ariaLabel'])
          : base.ariaLabel,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private joinClasses(...values: string[]): string {
    return values
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .join(' ');
  }

  private resolveValue(value: unknown): unknown {
    return resolveDynamicValue(value as never);
  }

  private resolveOptions(value: unknown): readonly TGenericInputOption[] {
    const resolved = this.resolveValue(value);

    if (this.isOptionsSource(resolved)) {
      const sourcedValue = this.resolveOptionsSource(resolved);
      return this.normalizeOptions(sourcedValue);
    }

    return this.normalizeOptions(resolved);
  }

  private resolveOptionsSource(source: TGenericInputOptionsSource): unknown {
    const path = String(source.path ?? '').trim();
    if (!path) return this.resolveValue(source.fallback);

    const value =
      source.source === 'var' ? this.variables.get(path) : this.i18n.get(path);

    return value == null ? this.resolveValue(source.fallback) : value;
  }

  private normalizeOptions(value: unknown): readonly TGenericInputOption[] {
    return Array.isArray(value)
      ? value.filter((entry): entry is TGenericInputOption =>
          this.isOption(entry)
        )
      : [];
  }

  private isOptionsSource(value: unknown): value is TGenericInputOptionsSource {
    const record = this.asRecord(value);
    if (!record) return false;
    const source = record['source'];
    return (
      (source === 'var' || source === 'i18n') &&
      typeof record['path'] === 'string'
    );
  }

  private isOption(value: unknown): value is TGenericInputOption {
    const record = this.asRecord(value);
    return !!record && 'value' in record && 'label' in record;
  }

  private asString(value: unknown): string {
    const resolved = this.resolveValue(value);
    return resolved == null ? '' : String(resolved);
  }

  private asNumber(value: unknown): number | undefined {
    const resolved = this.resolveValue(value);
    return typeof resolved === 'number' && Number.isFinite(resolved)
      ? resolved
      : undefined;
  }

  private asBoolean(value: unknown): boolean {
    const resolved = this.resolveValue(value);
    if (typeof resolved === 'boolean') return resolved;
    if (typeof resolved === 'number') return resolved !== 0;
    const normalized = String(resolved ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    if (['false', '0', 'off', 'no', 'null', 'undefined'].includes(normalized))
      return false;
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    return Boolean(resolved);
  }
}
