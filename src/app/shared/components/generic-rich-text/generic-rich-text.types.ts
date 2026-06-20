import type {
  TDynamicBooleanValue,
  TDynamicNumberValue,
  TDynamicStringValue,
  TDynamicValue,
} from '@/app/shared/types/component-runtime.types';

export type TGenericRichTextProvider = 'quill' | 'textarea';
export type TGenericRichTextFormat =
  | 'quill-delta-json'
  | 'quill-delta-object'
  | 'markdown'
  | 'plain-text';
export type TGenericRichTextToolbarItem =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'code'
  | 'link'
  | 'clean';

export type TGenericRichTextConfig = {
  readonly id?: TDynamicStringValue;
  readonly fieldId: string;
  readonly provider?: TDynamicValue<TGenericRichTextProvider>;
  readonly format?: TDynamicValue<TGenericRichTextFormat>;
  readonly value?: unknown;
  readonly label?: TDynamicStringValue;
  readonly description?: TDynamicStringValue;
  readonly helperText?: TDynamicStringValue;
  readonly placeholder?: TDynamicStringValue;
  readonly required?: TDynamicBooleanValue;
  readonly disabled?: TDynamicBooleanValue;
  readonly readOnly?: TDynamicBooleanValue;
  readonly maxLength?: TDynamicNumberValue;
  readonly rows?: TDynamicNumberValue;
  readonly debounceMs?: TDynamicNumberValue;
  readonly toolbar?: readonly TGenericRichTextToolbarItem[];
  readonly sanitizerPolicyId?: TDynamicStringValue;
  readonly classes?: TDynamicStringValue;
  readonly labelClasses?: TDynamicStringValue;
  readonly descriptionClasses?: TDynamicStringValue;
  readonly helperTextClasses?: TDynamicStringValue;
  readonly editorClasses?: TDynamicStringValue;
  readonly textareaClasses?: TDynamicStringValue;
  readonly errorClasses?: TDynamicStringValue;
  readonly loading?: TDynamicBooleanValue;
  readonly loadingText?: TDynamicStringValue;
  readonly errorText?: TDynamicStringValue;
};

export type TGenericRichTextValueChange = {
  readonly fieldId: string;
  readonly provider: TGenericRichTextProvider;
  readonly format: TGenericRichTextFormat;
  readonly value: unknown;
  readonly plainText: string;
  readonly isEmpty: boolean;
  readonly wordCount: number;
  readonly source: 'user' | 'api' | 'silent' | 'textarea';
  readonly sanitizerPolicyId?: string;
};
