import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, PLATFORM_ID, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import type { QuillModules } from 'ngx-quill/config';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import { InteractionScopeService } from '../interaction-scope/interaction-scope.service';
import type {
  TGenericRichTextConfig,
  TGenericRichTextFormat,
  TGenericRichTextProvider,
  TGenericRichTextToolbarItem,
  TGenericRichTextValueChange,
} from './generic-rich-text.types';

type TQuillFormat = 'json' | 'object' | 'text';
type TQuillContentChangedEvent = {
  readonly content?: unknown;
  readonly text?: string;
  readonly source?: string;
};
type TQuillToolbarGroup = Array<string | Record<string, unknown>>;

@Component({
  selector: 'generic-rich-text',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillEditorComponent],
  host: {
    '[attr.data-zlp-rich-text-id]': 'fieldId()',
    '[class]': 'classes()',
  },
  templateUrl: './generic-rich-text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericRichTextComponent {
  readonly config = input.required<TGenericRichTextConfig>();
  readonly valueChanged = output<TGenericRichTextValueChange>();
  readonly blurred = output<{ fieldId: string }>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly scope = inject(InteractionScopeService, { optional: true });
  private lastToolbarKey = '';
  private lastQuillModules: QuillModules = { toolbar: [] };
  readonly currentValue = signal<unknown>('');
  quillModel: unknown = { ops: [] };

  constructor() {
    effect(() => {
      const configValue = this.resolveValue(this.config().value) ?? '';
      const fieldId = this.fieldId();
      const required = this.required();
      const disabled = this.disabled();
      const readOnly = this.readOnly();
      untracked(() => {
        const scopedState = this.scope?.getFieldState(fieldId);
        const hasDirtyScopedValue = Boolean(scopedState?.dirty);
        const value = hasDirtyScopedValue ? scopedState?.value : configValue;
        const shouldSyncEditorModel = !this.valuesRepresentSameContent(value, this.currentValue());
        this.currentValue.set(value);
        if (!hasDirtyScopedValue && shouldSyncEditorModel) {
          this.quillModel = this.toQuillModel(value);
        }
        if (this.scope && fieldId) {
          this.scope.registerField({
            fieldId,
            initialValue: configValue,
            required,
            disabled,
            readOnly,
          });
          return;
        }
      });
    });
  }

  readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));
  readonly id = computed(() => this.asString(this.config().id) || this.fieldId());
  readonly fieldId = computed(() => String(this.config().fieldId ?? '').trim());
  readonly provider = computed<TGenericRichTextProvider>(() => {
    const provider = this.asString(this.config().provider);
    return provider === 'quill' ? 'quill' : 'textarea';
  });
  readonly format = computed<TGenericRichTextFormat>(() => {
    const format = this.asString(this.config().format);
    if (format === 'quill-delta-json' || format === 'quill-delta-object' || format === 'plain-text') return format;
    return 'markdown';
  });
  readonly useQuill = computed(() =>
    this.isBrowser()
    && this.provider() === 'quill'
    && (this.format() === 'quill-delta-json' || this.format() === 'quill-delta-object' || this.format() === 'plain-text')
  );
  readonly label = computed(() => this.asString(this.config().label));
  readonly description = computed(() => this.asString(this.config().description));
  readonly helperText = computed(() => this.asString(this.config().helperText));
  readonly placeholder = computed(() => this.asString(this.config().placeholder));
  readonly required = computed(() => this.asBoolean(this.config().required));
  readonly disabled = computed(() => this.asBoolean(this.config().disabled));
  readonly readOnly = computed(() => this.asBoolean(this.config().readOnly));
  readonly maxLength = computed(() => this.asNumber(this.config().maxLength));
  readonly rows = computed(() => Math.max(2, Math.floor(this.asNumber(this.config().rows) ?? 8)));
  readonly debounceMs = computed(() => Math.max(0, Math.floor(this.asNumber(this.config().debounceMs) ?? 120)));
  readonly sanitizerPolicyId = computed(() => this.asString(this.config().sanitizerPolicyId));
  readonly classes = computed(() => this.asString(this.config().classes));
  readonly labelClasses = computed(() => this.asString(this.config().labelClasses));
  readonly descriptionClasses = computed(() => this.asString(this.config().descriptionClasses));
  readonly helperTextClasses = computed(() => this.asString(this.config().helperTextClasses));
  readonly editorClasses = computed(() => this.asString(this.config().editorClasses));
  readonly textareaClasses = computed(() => this.asString(this.config().textareaClasses));
  readonly errorClasses = computed(() => this.asString(this.config().errorClasses));
  readonly loading = computed(() => this.asBoolean(this.config().loading));
  readonly loadingText = computed(() => this.asString(this.config().loadingText) || 'Loading editor');
  readonly errorText = computed(() => this.asString(this.config().errorText));
  readonly textValue = computed(() => {
    const value = this.currentValue();
    return typeof value === 'string' ? value : JSON.stringify(value ?? '');
  });
  readonly quillFormat = computed<TQuillFormat>(() => {
    if (this.format() === 'quill-delta-object') return 'object';
    if (this.format() === 'plain-text') return 'object';
    return 'json';
  });
  readonly quillModules = computed<QuillModules>(() => this.resolveQuillModules());

  onTextareaInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.currentValue.set(value);
    this.emitValue(value, value, 'textarea');
  }

  onQuillContentChanged(event: TQuillContentChangedEvent): void {
    const plainText = String(event.text ?? '').replace(/\n$/, '');
    const value = this.resolveQuillValue(event, plainText);
    const source = this.normalizeSource(event.source);
    this.currentValue.set(value);
    this.quillModel = event.content ?? this.toQuillModel(value);
    if (source === 'api' || source === 'silent') return;
    this.emitValue(value, plainText, source);
  }

  onBlur(): void {
    this.blurred.emit({ fieldId: this.fieldId() });
  }

  private resolveQuillValue(event: TQuillContentChangedEvent, plainText: string): unknown {
    if (this.format() === 'plain-text') return plainText;
    if (this.format() === 'quill-delta-object') return event.content ?? { ops: [] };
    try {
      return JSON.stringify(event.content ?? { ops: [] });
    } catch {
      return JSON.stringify({ ops: [] });
    }
  }

  private valuesRepresentSameContent(left: unknown, right: unknown): boolean {
    if (left === right) return true;
    return this.stableValueKey(left) === this.stableValueKey(right);
  }

  private stableValueKey(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value == null) return '';
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private toQuillModel(value: unknown): unknown {
    if (this.format() === 'plain-text') {
      if (value && typeof value === 'object') return value;
      const text = String(value ?? '');
      return text ? { ops: [{ insert: text.endsWith('\n') ? text : `${ text }\n` }] } : { ops: [] };
    }

    if (this.format() === 'quill-delta-object') {
      if (value && typeof value === 'object') return value;
      const text = String(value ?? '');
      if (!text) return { ops: [] };
      try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === 'object' ? parsed : { ops: [] };
      } catch {
        return this.toQuillDeltaFromText(text);
      }
    }

    if (value && typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return JSON.stringify({ ops: [] });
      }
    }

    const text = String(value ?? '');
    if (!text) return JSON.stringify({ ops: [] });
    try {
      JSON.parse(text);
      return text;
    } catch {
      return JSON.stringify(this.toQuillDeltaFromText(text));
    }
  }

  private toQuillDeltaFromText(text: string): { ops: Array<{ insert: string }> } {
    return { ops: [{ insert: text.endsWith('\n') ? text : `${text}\n` }] };
  }

  private emitValue(value: unknown, plainText: string, source: TGenericRichTextValueChange['source']): void {
    const normalizedText = plainText.trim();
    this.scope?.setFieldValue(this.fieldId(), value, { markTouched: true });
    this.valueChanged.emit({
      fieldId: this.fieldId(),
      provider: this.useQuill() ? 'quill' : 'textarea',
      format: this.format(),
      value,
      plainText,
      isEmpty: normalizedText.length === 0,
      wordCount: normalizedText ? normalizedText.split(/\s+/).length : 0,
      source,
      sanitizerPolicyId: this.sanitizerPolicyId() || undefined,
    });
  }

  private resolveToolbar(): QuillModules['toolbar'] {
    const defaultToolbar: readonly TGenericRichTextToolbarItem[] = ['bold', 'italic', 'heading', 'bulletList', 'orderedList', 'link', 'blockquote', 'code', 'clean'];
    const authoredToolbar = this.config().toolbar;
    const toolbar: readonly TGenericRichTextToolbarItem[] = authoredToolbar && authoredToolbar.length > 0 ? authoredToolbar : defaultToolbar;
    const groups: TQuillToolbarGroup[] = [];
    const inline = this.pickToolbar(toolbar, ['bold', 'italic', 'underline']);
    if (inline.length) groups.push(inline);
    if (toolbar.includes('heading')) groups.push([{ header: [1, 2, 3, false] }]);
    const lists = toolbar
      .filter((item) => item === 'orderedList' || item === 'bulletList')
      .map((item) => ({ list: item === 'orderedList' ? 'ordered' : 'bullet' }));
    if (lists.length) groups.push(lists);
    const block = [
      toolbar.includes('blockquote') ? 'blockquote' : '',
      toolbar.includes('code') ? 'code-block' : '',
      toolbar.includes('link') ? 'link' : '',
    ].filter(Boolean);
    if (block.length) groups.push(block);
    if (toolbar.includes('clean')) groups.push(['clean']);
    return groups as QuillModules['toolbar'];
  }

  private resolveQuillModules(): QuillModules {
    const toolbar = this.resolveToolbar();
    const key = this.stableValueKey(toolbar);
    if (key === this.lastToolbarKey) {
      return this.lastQuillModules;
    }
    this.lastToolbarKey = key;
    this.lastQuillModules = { toolbar };
    return this.lastQuillModules;
  }

  private pickToolbar(toolbar: readonly TGenericRichTextToolbarItem[] | undefined, allowed: readonly TGenericRichTextToolbarItem[]): string[] {
    return allowed.filter((item) => toolbar?.includes(item)).map((item) => item === 'bulletList' ? 'bullet' : item === 'orderedList' ? 'ordered' : item);
  }

  private normalizeSource(source: unknown): TGenericRichTextValueChange['source'] {
    return source === 'api' || source === 'silent' || source === 'user' ? source : 'user';
  }

  private asString(value: unknown): string {
    const resolved = this.resolveValue(value);
    return resolved == null ? '' : String(resolved);
  }

  private asNumber(value: unknown): number | undefined {
    const resolved = this.resolveValue(value);
    return typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : undefined;
  }

  private asBoolean(value: unknown): boolean {
    const resolved = this.resolveValue(value);
    if (typeof resolved === 'boolean') return resolved;
    if (resolved == null || resolved === '') return false;
    return !['false', '0', 'off', 'no'].includes(String(resolved).trim().toLowerCase());
  }

  private resolveValue(value: unknown): unknown {
    return resolveDynamicValue(value as never);
  }
}
