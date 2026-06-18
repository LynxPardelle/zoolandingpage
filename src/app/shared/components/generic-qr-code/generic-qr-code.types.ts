import type { QrCodeGenerateOptions } from 'uqr';
import type { TDynamicStringValue, TDynamicValue } from '@/app/shared/types/component-runtime.types';

export type TGenericQrCodeErrorCorrectionLevel = NonNullable<QrCodeGenerateOptions['ecc']>;

export type TGenericQrCodeConfig = {
  readonly id?: TDynamicStringValue;
  readonly value?: TDynamicStringValue;
  readonly ariaLabel?: TDynamicStringValue;
  readonly classes?: TDynamicStringValue;
  readonly gridClasses?: TDynamicStringValue;
  readonly moduleClasses?: TDynamicStringValue;
  readonly darkModuleClasses?: TDynamicStringValue;
  readonly lightModuleClasses?: TDynamicStringValue;
  readonly emptyClasses?: TDynamicStringValue;
  readonly errorClasses?: TDynamicStringValue;
  readonly emptyText?: TDynamicStringValue;
  readonly errorText?: TDynamicStringValue;
  readonly size?: TDynamicValue<number>;
  readonly margin?: TDynamicValue<number>;
  readonly errorCorrectionLevel?: TDynamicValue<TGenericQrCodeErrorCorrectionLevel>;
  readonly darkColor?: TDynamicStringValue;
  readonly lightColor?: TDynamicStringValue;
  readonly styles?: TDynamicValue<Readonly<Record<string, string | number | null | undefined>>>;
};
