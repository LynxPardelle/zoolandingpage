import type { TDynamicBooleanValue, TDynamicStringValue } from '@/app/shared/types/component-runtime.types';

export type TGenericCellValueFormat =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'json';

export type TGenericCellColumnConfig = {
  readonly id: string;
  readonly header?: TDynamicStringValue;
  readonly valuePath?: TDynamicStringValue;
  readonly format?: TGenericCellValueFormat;
  readonly sortable?: TDynamicBooleanValue;
  readonly align?: 'start' | 'center' | 'end';
  readonly emptyText?: TDynamicStringValue;
  readonly trueText?: TDynamicStringValue;
  readonly falseText?: TDynamicStringValue;
  readonly componentId?: TDynamicStringValue;
  readonly componentIds?: readonly string[];
  readonly classes?: TDynamicStringValue;
  readonly headerClasses?: TDynamicStringValue;
  readonly cellClasses?: TDynamicStringValue;
  readonly valueClasses?: TDynamicStringValue;
};

export type TGenericCellConfig = {
  readonly id?: TDynamicStringValue;
  readonly value?: unknown;
  readonly row?: unknown;
  readonly valuePath?: TDynamicStringValue;
  readonly format?: TGenericCellValueFormat;
  readonly emptyText?: TDynamicStringValue;
  readonly trueText?: TDynamicStringValue;
  readonly falseText?: TDynamicStringValue;
  readonly componentId?: TDynamicStringValue;
  readonly componentIds?: readonly string[];
  readonly classes?: TDynamicStringValue;
  readonly valueClasses?: TDynamicStringValue;
};

export type TGenericCellContext = {
  readonly parent?: unknown;
  readonly row: unknown;
  readonly column: TGenericCellColumnConfig;
  readonly value: unknown;
  readonly rowIndex: number;
};
