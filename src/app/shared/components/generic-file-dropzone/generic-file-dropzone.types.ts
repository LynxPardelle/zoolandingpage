import type { TDynamicBooleanValue, TDynamicNumberValue, TDynamicStringValue } from '@/app/shared/types/component-runtime.types';

export type TGenericFileDropzoneFileSummary = {
  readonly name: string;
  readonly size: number;
  readonly type: string;
};

export type TGenericFileDropzoneRejectedFile = TGenericFileDropzoneFileSummary & {
  readonly reason: 'accept' | 'maxSize' | 'multipleDisabled';
};

export type TGenericFileDropzoneConfig = {
  readonly id?: TDynamicStringValue;
  readonly fieldId: string;
  readonly label?: TDynamicStringValue;
  readonly description?: TDynamicStringValue;
  readonly helperText?: TDynamicStringValue;
  readonly dropLabel?: TDynamicStringValue;
  readonly browseLabel?: TDynamicStringValue;
  readonly emptyText?: TDynamicStringValue;
  readonly accept?: TDynamicStringValue;
  readonly acceptLabel?: TDynamicStringValue;
  readonly maxFileSizeBytes?: TDynamicNumberValue;
  readonly maxSizeLabel?: TDynamicStringValue;
  readonly multiple?: TDynamicBooleanValue;
  readonly required?: TDynamicBooleanValue;
  readonly disabled?: TDynamicBooleanValue;
  readonly loading?: TDynamicBooleanValue;
  readonly loadingText?: TDynamicStringValue;
  readonly errorText?: TDynamicStringValue;
  readonly classes?: TDynamicStringValue;
  readonly labelClasses?: TDynamicStringValue;
  readonly descriptionClasses?: TDynamicStringValue;
  readonly dropzoneClasses?: TDynamicStringValue;
  readonly activeDropzoneClasses?: TDynamicStringValue;
  readonly disabledDropzoneClasses?: TDynamicStringValue;
  readonly loadingClasses?: TDynamicStringValue;
  readonly errorClasses?: TDynamicStringValue;
  readonly helperTextClasses?: TDynamicStringValue;
  readonly fileListClasses?: TDynamicStringValue;
  readonly fileItemClasses?: TDynamicStringValue;
  readonly browseButtonClasses?: TDynamicStringValue;
};

export type TGenericFileDropzoneValueChange = {
  readonly fieldId: string;
  readonly files: readonly File[];
  readonly fileSummaries: readonly TGenericFileDropzoneFileSummary[];
  readonly rejected: readonly TGenericFileDropzoneRejectedFile[];
};
