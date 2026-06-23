import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  EnvironmentInjector,
  OnDestroy,
  ViewChild,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import type { TGenericCellColumnConfig, TGenericCellConfig, TGenericCellContext } from './generic-cell.types';

@Component({
  selector: 'generic-cell',
  standalone: true,
  imports: [CommonModule],
  host: {
    '[attr.data-zlp-cell-column]': 'columnId()',
    '[class]': 'classes()',
  },
  templateUrl: './generic-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericCellComponent implements AfterViewInit, OnDestroy {
  readonly config = input<TGenericCellConfig>({});
  readonly row = input<unknown>(null);
  readonly column = input.required<TGenericCellColumnConfig>();
  readonly value = input<unknown>(undefined);
  readonly rowIndex = input<number>(0);
  readonly hostContext = input<unknown>();
  @ViewChild('wrapperHost', { read: ViewContainerRef })
  private wrapperHost?: ViewContainerRef;

  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly viewReady = signal(false);
  private wrapperRef?: ComponentRef<unknown>;
  private renderVersion = 0;
  private destroyed = false;

  constructor() {
    effect(() => {
      const ids = this.componentIds();
      const context = this.cellContext();
      const ready = this.viewReady();
      untracked(() => {
        void this.renderNestedWrapper(ready, ids, context);
      });
    });
  }

  readonly columnId = computed(() => this.asString(this.column().id));
  readonly format = computed(() => this.config().format ?? this.column().format ?? 'text');
  readonly emptyText = computed(() => this.asString(this.config().emptyText ?? this.column().emptyText));
  readonly trueText = computed(() => this.asString(this.config().trueText ?? this.column().trueText) || 'true');
  readonly falseText = computed(() => this.asString(this.config().falseText ?? this.column().falseText) || 'false');
  readonly itemPath = computed(() => this.asString(this.config().itemPath ?? this.column().itemPath));
  readonly separator = computed(() => this.asString(this.config().separator ?? this.column().separator) || ', ');
  readonly classes = computed(() => this.joinClasses(
    this.asString(this.column().cellClasses),
    this.asString(this.config().classes),
  ));
  readonly valueClasses = computed(() => this.joinClasses(
    this.asString(this.column().valueClasses),
    this.asString(this.config().valueClasses),
  ));
  readonly componentIds = computed<readonly string[]>(() => {
    const direct = this.asString(this.config().componentId ?? this.column().componentId);
    const list = this.config().componentIds ?? this.column().componentIds ?? [];
    return [direct, ...list.map((entry) => this.asString(entry))]
      .map((entry) => entry.trim())
      .filter(Boolean);
  });
  readonly cellContext = computed<TGenericCellContext>(() => ({
    parent: this.hostContext(),
    row: this.row(),
    column: this.column(),
    value: this.value(),
    rowIndex: this.rowIndex(),
  }));
  readonly displayValue = computed(() => this.formatValue(this.value()));

  ngAfterViewInit(): void {
    this.viewReady.set(true);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.renderVersion++;
    this.wrapperRef?.destroy();
  }

  private async renderNestedWrapper(
    ready: boolean,
    componentIds: readonly string[],
    context: TGenericCellContext
  ): Promise<void> {
    const version = ++this.renderVersion;
    const host = this.wrapperHost;
    this.wrapperRef?.destroy();
    this.wrapperRef = undefined;
    host?.clear();

    if (!ready || !host || componentIds.length === 0) return;

    const { WrapperOrchestrator } = await import('../wrapper-orchestrator/wrapper-orchestrator.component');
    if (this.destroyed || version !== this.renderVersion) return;

    this.wrapperRef = host.createComponent(WrapperOrchestrator, {
      environmentInjector: this.environmentInjector,
    });
    this.wrapperRef.setInput('componentsIds', componentIds);
    this.wrapperRef.setInput('hostContext', context);
    this.wrapperRef.changeDetectorRef.detectChanges();
  }

  private formatValue(value: unknown): string {
    if (value == null || value === '') return this.emptyText();

    switch (this.format()) {
      case 'boolean':
        return this.asBoolean(value) ? this.trueText() : this.falseText();
      case 'number': {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? String(parsed) : this.emptyText();
      }
      case 'date': {
        const date = new Date(String(value));
        return Number.isNaN(date.getTime()) ? this.emptyText() : date.toISOString().slice(0, 10);
      }
      case 'json':
        try {
          return JSON.stringify(value);
        } catch {
          return this.emptyText();
        }
      case 'list':
        return this.formatListValue(value);
      case 'text':
      default:
        return String(value);
    }
  }

  private formatListValue(value: unknown): string {
    const entries = Array.isArray(value) ? value : [value];
    const itemPath = this.itemPath();
    const parts = entries
      .map((entry) => {
        const resolved = itemPath ? this.resolvePath(entry, itemPath) : entry;
        return resolved == null || resolved === '' ? entry : resolved;
      })
      .map((entry) => {
        if (entry == null || entry === '') return '';
        if (typeof entry === 'object') {
          return this.objectLabel(entry);
        }
        return String(entry);
      })
      .map((entry) => entry.trim())
      .filter(Boolean);

    return parts.length ? parts.join(this.separator()) : this.emptyText();
  }

  private objectLabel(value: object): string {
    const record = value as Record<string, unknown>;
    for (const key of ['label', 'name', 'slug', 'taxonomyId', 'id']) {
      const entry = record[key];
      if (entry != null && entry !== '') return String(entry);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  private resolvePath(root: unknown, path: string): unknown {
    const parts = path.split('.').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return root;

    let current = root;
    for (const part of parts) {
      if (Array.isArray(current) && /^\d+$/.test(part)) {
        current = current[Number(part)];
        continue;
      }
      if (!current || typeof current !== 'object' || !(part in current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private asString(value: unknown): string {
    const resolved = resolveDynamicValue(value as never);
    return resolved == null ? '' : String(resolved);
  }

  private asBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  private joinClasses(...values: readonly string[]): string {
    return values.map((entry) => entry.trim()).filter(Boolean).join(' ');
  }
}
