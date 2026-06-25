import type {
  TDynamicBooleanValue,
  TDynamicNumberValue,
  TDynamicStringValue,
  TDynamicValue,
} from '@/app/shared/types/component-runtime.types';
import type { TGenericCellColumnConfig } from '../generic-cell/generic-cell.types';

export type TGenericTableRowsSource =
  | {
      readonly source: 'literal';
      readonly value?: readonly unknown[];
      readonly fallback?: readonly unknown[];
    }
  | {
      readonly source: 'var' | 'host';
      readonly path: string;
      readonly fallback?: readonly unknown[];
    };

export type TGenericTableSortConfig = {
  readonly active?: TDynamicStringValue;
  readonly direction?: 'asc' | 'desc';
};

export type TGenericTablePaginationConfig = {
  readonly enabled?: TDynamicBooleanValue;
  readonly pageSize?: TDynamicNumberValue;
  readonly pageSizeOptions?: readonly number[];
  readonly hidePageSize?: TDynamicBooleanValue;
  readonly showFirstLastButtons?: TDynamicBooleanValue;
};

export type TGenericTableSelectionConfig = {
  readonly enabled?: TDynamicBooleanValue;
  readonly mode?: 'single' | 'multiple';
  readonly selectedIds?: readonly string[];
  readonly disabled?: TDynamicBooleanValue;
  readonly columnLabel?: TDynamicStringValue;
  readonly label?: TDynamicStringValue;
};

export type TGenericTableRowActionConfig = {
  readonly id: string;
  readonly label: TDynamicStringValue;
  readonly ariaLabel?: TDynamicStringValue;
  readonly icon?: TDynamicStringValue;
  readonly classes?: TDynamicStringValue;
  readonly disabled?: TDynamicBooleanValue;
  readonly loading?: TDynamicBooleanValue;
  readonly eventInstructions?: TDynamicStringValue;
};

export type TGenericTableConfig = {
  readonly id?: TDynamicStringValue;
  readonly label?: TDynamicStringValue;
  readonly description?: TDynamicStringValue;
  readonly actionColumnLabel?: TDynamicStringValue;
  readonly rows?: readonly unknown[];
  readonly rowsSource?: TDynamicValue<TGenericTableRowsSource>;
  readonly columns: readonly TGenericCellColumnConfig[];
  readonly rowIdPath?: TDynamicStringValue;
  readonly sortable?: TDynamicBooleanValue;
  readonly sort?: TDynamicValue<TGenericTableSortConfig>;
  readonly pagination?: TDynamicValue<TGenericTablePaginationConfig>;
  readonly selection?: TDynamicValue<TGenericTableSelectionConfig>;
  readonly rowActions?: readonly TGenericTableRowActionConfig[];
  readonly eventPayloadFields?: readonly string[];
  readonly emitOnRowClick?: TDynamicBooleanValue;
  readonly loading?: TDynamicBooleanValue;
  readonly loadingText?: TDynamicStringValue;
  readonly error?: TDynamicStringValue;
  readonly errorText?: TDynamicStringValue;
  readonly emptyText?: TDynamicStringValue;
  readonly classes?: TDynamicStringValue;
  readonly labelClasses?: TDynamicStringValue;
  readonly descriptionClasses?: TDynamicStringValue;
  readonly tableWrapperClasses?: TDynamicStringValue;
  readonly tableClasses?: TDynamicStringValue;
  readonly headerCellClasses?: TDynamicStringValue;
  readonly rowClasses?: TDynamicStringValue;
  readonly actionCellClasses?: TDynamicStringValue;
  readonly actionButtonClasses?: TDynamicStringValue;
  readonly selectionCellClasses?: TDynamicStringValue;
  readonly stateClasses?: TDynamicStringValue;
};

export type TGenericTableRowEvent = {
  readonly rowId: string;
  readonly rowIndex: number;
  readonly rowData?: Record<string, unknown>;
};

export type TGenericTableActionEvent = TGenericTableRowEvent & {
  readonly actionId: string;
  readonly label: string;
  readonly eventInstructions?: string;
};

export type TGenericTableSelectionEvent = {
  readonly selectedIds: readonly string[];
  readonly selectedRows?: readonly Record<string, unknown>[];
};
