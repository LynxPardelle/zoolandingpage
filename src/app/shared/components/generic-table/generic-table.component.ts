import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, REQUEST, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorIntl, MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatSortModule, type Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '../../services/draft-runtime.service';
import { VariableStoreService } from '../../services/variable-store.service';
import { resolveDynamicValue, resolveHostPath, resolveStyleRecord } from '../../utility/component-orchestrator.utility';
import { navigateInCurrentWindow } from '../../utility/navigation/browser-navigation.utility';
import { resolveNavigationTarget } from '../../utility/navigation/navigation-target.utility';
import { GenericCellComponent } from '../generic-cell/generic-cell.component';
import { GenericIconComponent } from '../generic-icon/generic-icon.component';
import type { TGenericCellColumnConfig } from '../generic-cell/generic-cell.types';
import type {
  TGenericTableActionEvent,
  TGenericTableConfig,
  TGenericTablePaginationConfig,
  TGenericTableRowActionConfig,
  TGenericTableRowEvent,
  TGenericTableRowsSource,
  TGenericTableSelectionConfig,
  TGenericTableSelectionEvent,
  TGenericTableSortConfig,
} from './generic-table.types';
import { GenericTablePaginatorIntl } from './generic-table-paginator-intl';

@Component({
  selector: 'generic-table',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    GenericCellComponent,
    GenericIconComponent,
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: GenericTablePaginatorIntl },
  ],
  host: {
    '[attr.data-zlp-table-id]': 'id() || null',
    '[class]': 'classes()',
  },
  templateUrl: './generic-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericTableComponent {
  readonly config = input.required<TGenericTableConfig>();
  readonly hostContext = input<unknown>();
  readonly rowClicked = output<TGenericTableRowEvent>();
  readonly rowAction = output<TGenericTableActionEvent>();
  readonly selectionChanged = output<TGenericTableSelectionEvent>();

  private readonly variables = inject(VariableStoreService);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly sortState = signal<Sort>({ active: '', direction: '' });
  private readonly pageState = signal({ pageIndex: 0, pageSize: 10 });
  private readonly selectedIdsState = signal<readonly string[]>([]);

  readonly id = computed(() => this.asString(this.config().id));
  readonly label = computed(() => this.asString(this.config().label));
  readonly description = computed(() => this.asString(this.config().description));
  readonly actionColumnLabel = computed(() => this.asString(this.config().actionColumnLabel));
  readonly columns = computed<readonly TGenericCellColumnConfig[]>(() => this.config().columns ?? []);
  readonly actions = computed<readonly TGenericTableRowActionConfig[]>(() => this.config().rowActions ?? []);
  readonly loading = computed(() => this.asBoolean(this.config().loading));
  readonly loadingText = computed(() => this.asString(this.config().loadingText) || 'Loading');
  readonly errorText = computed(() => this.asString(this.config().errorText ?? this.config().error));
  readonly emptyText = computed(() => this.asString(this.config().emptyText) || 'No data');
  readonly sortable = computed(() => this.asBoolean(this.config().sortable, true));
  readonly emitOnRowClick = computed(() => this.asBoolean(this.config().emitOnRowClick));
  readonly classes = computed(() => this.asString(this.config().classes));
  readonly labelClasses = computed(() => this.asString(this.config().labelClasses));
  readonly descriptionClasses = computed(() => this.asString(this.config().descriptionClasses));
  readonly tableWrapperClasses = computed(() => this.asString(this.config().tableWrapperClasses));
  readonly tableClasses = computed(() => this.asString(this.config().tableClasses));
  readonly headerCellClasses = computed(() => this.asString(this.config().headerCellClasses));
  readonly rowClasses = computed(() => this.asString(this.config().rowClasses));
  readonly actionCellClasses = computed(() => this.asString(this.config().actionCellClasses));
  readonly actionButtonClasses = computed(() => this.asString(this.config().actionButtonClasses));
  readonly actionButtonStyles = computed(() => {
    const configuredStyles = resolveStyleRecord(this.config().actionButtonStyles);
    const baseStyles: Record<string, string> = {
      alignItems: 'center',
      display: 'inline-flex',
      gap: '6px',
      justifyContent: 'center',
      minHeight: '48px',
      minWidth: '48px',
      textDecoration: 'none',
      touchAction: 'manipulation',
    };

    if (this.actionLabelMode() === 'tooltip') {
      baseStyles['height'] = '48px';
      baseStyles['padding'] = '0';
      baseStyles['width'] = '48px';
    }

    return { ...baseStyles, ...(configuredStyles ?? {}) };
  });
  readonly actionIconClasses = computed(() =>
    this.asString(this.config().actionIconClasses)
    || 'ank-width-18px ank-height-18px ank-display-inline-flex ank-flexShrink-0'
  );
  readonly actionLabelMode = computed<'visible' | 'tooltip'>(() =>
    this.asString(this.config().actionLabelMode) === 'tooltip' ? 'tooltip' : 'visible'
  );
  readonly selectionCellClasses = computed(() => this.asString(this.config().selectionCellClasses));
  readonly stateClasses = computed(() => this.asString(this.config().stateClasses));
  readonly pagination = computed<TGenericTablePaginationConfig>(() => this.asRecord(this.resolve(this.config().pagination)) as TGenericTablePaginationConfig ?? {});
  readonly selection = computed<TGenericTableSelectionConfig>(() => this.asRecord(this.resolve(this.config().selection)) as TGenericTableSelectionConfig ?? {});
  readonly selectionEnabled = computed(() => this.asBoolean(this.selection().enabled));
  readonly selectionMode = computed(() => this.selection().mode === 'single' ? 'single' : 'multiple');
  readonly selectionDisabled = computed(() => this.asBoolean(this.selection().disabled));
  readonly selectionLabel = computed(() => this.asString(this.selection().label) || 'Select row');
  readonly selectionColumnLabel = computed(() => this.asString(this.selection().columnLabel) || 'Select');
  readonly paginationEnabled = computed(() => this.asBoolean(this.pagination().enabled));
  readonly showPaginator = computed(() => {
    if (!this.paginationEnabled()) return false;
    if (!this.asBoolean(this.pagination().hideWhenSinglePage)) return true;
    return this.sortedRows().length > this.pageSize();
  });
  readonly pageSizeOptions = computed(() => this.pagination().pageSizeOptions?.length ? this.pagination().pageSizeOptions! : [10, 25, 50]);
  readonly pageSize = computed(() => Math.max(1, Math.floor(this.asNumber(this.pagination().pageSize) ?? this.pageState().pageSize)));
  readonly initialSort = computed<TGenericTableSortConfig>(() => this.asRecord(this.resolve(this.config().sort)) as TGenericTableSortConfig ?? {});
  readonly activeSort = computed<Sort>(() => {
    const state = this.sortState();
    if (state.active) return state;
    const initial = this.initialSort();
    return {
      active: this.asString(initial.active),
      direction: initial.direction === 'asc' || initial.direction === 'desc' ? initial.direction : '',
    };
  });
  readonly rows = computed<readonly unknown[]>(() => this.resolveRows());
  readonly sortedRows = computed<readonly unknown[]>(() => this.sortRows(this.rows()));
  readonly pageRows = computed<readonly unknown[]>(() => {
    if (!this.paginationEnabled()) return this.sortedRows();
    const page = this.pageState();
    const pageSize = this.pageSize();
    const start = page.pageIndex * pageSize;
    return this.sortedRows().slice(start, start + pageSize);
  });
  readonly displayedColumns = computed<readonly string[]>(() => {
    const dataColumns = this.columns().map((column) => this.columnId(column)).filter(Boolean);
    return [
      ...(this.selectionEnabled() ? ['__selection'] : []),
      ...dataColumns,
      ...(this.actions().length > 0 ? ['__actions'] : []),
    ];
  });
  readonly selectedIds = computed<readonly string[]>(() => {
    const authored = this.selection().selectedIds;
    if (this.selectedIdsState().length > 0 || !authored?.length) return this.selectedIdsState();
    return authored;
  });
  readonly allPageRowsSelected = computed(() => {
    const ids = this.pageRows().map((row, index) => this.rowId(row, this.absoluteRowIndex(index))).filter(Boolean);
    return ids.length > 0 && ids.every((id) => this.selectedIds().includes(id));
  });
  readonly somePageRowsSelected = computed(() => {
    const ids = this.pageRows().map((row, index) => this.rowId(row, this.absoluteRowIndex(index))).filter(Boolean);
    return ids.some((id) => this.selectedIds().includes(id)) && !this.allPageRowsSelected();
  });

  onSortChange(sort: Sort): void {
    this.sortState.set(sort);
  }

  onPageChange(event: PageEvent): void {
    this.pageState.set({ pageIndex: event.pageIndex, pageSize: event.pageSize });
  }

  onRowClick(row: unknown, pageRowIndex: number): void {
    if (!this.emitOnRowClick()) return;
    const rowIndex = this.absoluteRowIndex(pageRowIndex);
    this.rowClicked.emit({
      rowId: this.rowId(row, rowIndex),
      rowIndex,
      rowData: this.rowPayload(row),
    });
  }

  onAction(action: TGenericTableRowActionConfig, row: unknown, pageRowIndex: number, event: Event): void {
    event.stopPropagation();
    if (this.asBoolean(action.disabled) || this.asBoolean(action.loading)) return;
    this.emitAction(action, row, pageRowIndex, event);
  }

  onActionLink(action: TGenericTableRowActionConfig, row: unknown, pageRowIndex: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.asBoolean(action.disabled) || this.asBoolean(action.loading)) return;

    const href = this.actionHref(action, row);
    this.emitAction(action, row, pageRowIndex, event);
    if (href) {
      navigateInCurrentWindow(href);
    }
  }

  actionHref(action: TGenericTableRowActionConfig, row: unknown): string {
    if (this.asBoolean(action.disabled) || this.asBoolean(action.loading)) return '';
    const template = this.asString(action.hrefTemplate).trim();
    if (!template) return '';

    const interpolated = this.interpolateRowTemplate(template, row);
    if (!interpolated || !interpolated.startsWith('/') || interpolated.startsWith('//')) return '';

    const resolved = resolveNavigationTarget(interpolated, {
      currentHref: this.currentHref(),
      stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS,
    });

    return resolved.internal ? resolved.href : '';
  }

  private currentHref(): string | undefined {
    const requestUrl = String(this.request?.url ?? '').trim();
    if (requestUrl) return requestUrl;
    return typeof window !== 'undefined' ? window.location.href : undefined;
  }

  private emitAction(action: TGenericTableRowActionConfig, row: unknown, pageRowIndex: number, event?: Event): void {
    const rowIndex = this.absoluteRowIndex(pageRowIndex);
    this.rowAction.emit({
      rowId: this.rowId(row, rowIndex),
      rowIndex,
      rowData: this.rowPayload(row),
      actionId: action.id,
      label: this.asString(action.label),
      eventInstructions: this.asString(action.eventInstructions) || undefined,
      ...(event?.isTrusted === true ? { userGesture: true } : {}),
    });
  }

  toggleRow(row: unknown, pageRowIndex: number, checked: boolean): void {
    if (this.selectionDisabled()) return;
    const rowIndex = this.absoluteRowIndex(pageRowIndex);
    const rowId = this.rowId(row, rowIndex);
    const current = new Set(this.selectedIds());

    if (this.selectionMode() === 'single') {
      current.clear();
    }

    if (checked) current.add(rowId);
    else current.delete(rowId);

    this.emitSelection(Array.from(current));
  }

  togglePage(checked: boolean): void {
    if (this.selectionDisabled() || this.selectionMode() === 'single') return;
    const current = new Set(this.selectedIds());
    this.pageRows().forEach((row, index) => {
      const id = this.rowId(row, this.absoluteRowIndex(index));
      if (checked) current.add(id);
      else current.delete(id);
    });
    this.emitSelection(Array.from(current));
  }

  isRowSelected(row: unknown, pageRowIndex: number): boolean {
    return this.selectedIds().includes(this.rowId(row, this.absoluteRowIndex(pageRowIndex)));
  }

  columnId(column: TGenericCellColumnConfig): string {
    return this.asString(column.id);
  }

  columnHeader(column: TGenericCellColumnConfig): string {
    return this.asString(column.header) || this.columnId(column);
  }

  columnHeaderClasses(column: TGenericCellColumnConfig): string {
    return this.joinClasses(this.headerCellClasses(), this.asString(column.headerClasses));
  }

  columnCellClasses(column: TGenericCellColumnConfig): string {
    return this.asString(column.cellClasses);
  }

  columnSortable(column: TGenericCellColumnConfig): boolean {
    return this.sortable() && this.asBoolean(column.sortable, true);
  }

  cellValue(row: unknown, column: TGenericCellColumnConfig): unknown {
    const path = this.asString(column.valuePath) || this.columnId(column);
    return resolveHostPath(row, path);
  }

  rowId(row: unknown, rowIndex: number): string {
    const path = this.asString(this.config().rowIdPath);
    const value = path ? resolveHostPath(row, path) : undefined;
    return this.asString(value) || `row-${rowIndex + 1}`;
  }

  absoluteRowIndex(pageRowIndex: number): number {
    if (!this.paginationEnabled()) return pageRowIndex;
    return this.pageState().pageIndex * this.pageSize() + pageRowIndex;
  }

  actionLabel(action: TGenericTableRowActionConfig): string {
    return this.asString(action.label);
  }

  actionAriaLabel(action: TGenericTableRowActionConfig): string | null {
    return this.asString(action.ariaLabel) || this.actionLabel(action) || null;
  }

  actionIcon(action: TGenericTableRowActionConfig): string {
    return this.asString(action.icon);
  }

  actionClasses(action: TGenericTableRowActionConfig): string {
    return this.asString(action.classes) || this.actionButtonClasses();
  }

  actionDisabled(action: TGenericTableRowActionConfig): boolean {
    return this.asBoolean(action.disabled) || this.asBoolean(action.loading);
  }

  private resolveRows(): readonly unknown[] {
    const source = this.resolve(this.config().rowsSource) as TGenericTableRowsSource | null;
    if (source?.source === 'literal') {
      return Array.isArray(source.value) ? source.value : Array.isArray(source.fallback) ? source.fallback : [];
    }
    if (source?.source === 'var') {
      const value = this.variables.get(source.path);
      return Array.isArray(value) ? value : Array.isArray(source.fallback) ? source.fallback : [];
    }
    if (source?.source === 'host') {
      const value = resolveHostPath(this.hostContext(), source.path);
      return Array.isArray(value) ? value : Array.isArray(source.fallback) ? source.fallback : [];
    }

    return Array.isArray(this.config().rows) ? this.config().rows! : [];
  }

  private sortRows(rows: readonly unknown[]): readonly unknown[] {
    const sort = this.activeSort();
    if (!sort.active || !sort.direction) return rows;
    const column = this.columns().find((entry) => this.columnId(entry) === sort.active);
    if (!column || !this.columnSortable(column)) return rows;

    const direction = sort.direction === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => direction * this.compareValues(this.cellValue(a, column), this.cellValue(b, column), column.format));
  }

  private compareValues(a: unknown, b: unknown, format: TGenericCellColumnConfig['format']): number {
    if (format === 'number') {
      const left = Number(a);
      const right = Number(b);
      return (Number.isFinite(left) ? left : 0) - (Number.isFinite(right) ? right : 0);
    }

    return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
  }

  private emitSelection(selectedIds: readonly string[]): void {
    this.selectedIdsState.set(selectedIds);
    const selected = new Set(selectedIds);
    const selectedRows = this.rows()
      .filter((row, index) => selected.has(this.rowId(row, index)))
      .map((row) => this.rowPayload(row))
      .filter((row): row is Record<string, unknown> => row !== undefined);

    this.selectionChanged.emit({
      selectedIds,
      selectedRows: selectedRows.length > 0 ? selectedRows : undefined,
    });
  }

  private rowPayload(row: unknown): Record<string, unknown> | undefined {
    const fields = this.config().eventPayloadFields ?? [];
    if (fields.length === 0) return undefined;

    const payload = fields.reduce<Record<string, unknown>>((acc, path) => {
      const normalizedPath = this.asString(path).trim();
      if (!normalizedPath) return acc;
      const value = resolveHostPath(row, normalizedPath);
      if (value !== undefined) acc[normalizedPath] = value;
      return acc;
    }, {});

    return Object.keys(payload).length > 0 ? payload : undefined;
  }

  private interpolateRowTemplate(template: string, row: unknown): string | null {
    let missing = false;
    const output = template.replace(/\{([^{}]+)\}/g, (_match, token: string) => {
      const value = resolveHostPath(row, String(token).trim());
      if (value == null || value === '') {
        missing = true;
        return '';
      }

      return encodeURIComponent(String(value));
    });

    return missing || /\{[^{}]+\}/.test(output) ? null : output;
  }

  private resolve(value: unknown): unknown {
    return resolveDynamicValue(value as never);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    const resolved = this.resolve(value);
    return resolved && typeof resolved === 'object' && !Array.isArray(resolved)
      ? resolved as Record<string, unknown>
      : null;
  }

  private asString(value: unknown): string {
    const resolved = this.resolve(value);
    return resolved == null ? '' : String(resolved);
  }

  private asNumber(value: unknown): number | undefined {
    const resolved = this.resolve(value);
    return typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : undefined;
  }

  private asBoolean(value: unknown, fallback = false): boolean {
    const resolved = this.resolve(value);
    if (resolved == null || resolved === '') return fallback;
    if (typeof resolved === 'boolean') return resolved;
    const normalized = String(resolved).trim().toLowerCase();
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    return Boolean(resolved);
  }

  private joinClasses(...values: readonly string[]): string {
    return values.map((entry) => entry.trim()).filter(Boolean).join(' ');
  }
}
