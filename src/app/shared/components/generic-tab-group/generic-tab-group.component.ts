import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { VariableStoreService } from '../../services/variable-store.service';
import {
  normalizeCanonicalContentItemId,
  resolveConfigSourceValue,
  resolveDynamicValue,
  resolveTextValue,
  resolveTranslatedStringList,
  resolveTranslatedText,
  scrollElementIntoViewportCenter,
} from '../../utility/component-orchestrator.utility';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericIconComponent } from '../generic-icon/generic-icon.component';
import { TabDefinition, TabGroupConfig, TabGroupStringListValue, TabGroupTextValue } from './generic-tab-group.types';

@Component({
  selector: 'generic-tab-group',
  imports: [CommonModule, GenericButtonComponent, GenericIconComponent],
  templateUrl: './generic-tab-group.component.html',
  styleUrls: ['./generic-tab-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericTabGroupComponent {
  readonly i18n = inject(I18nService);
  private readonly variableStore = inject(VariableStoreService);
  readonly config = input<TabGroupConfig>({});
  readonly selected = output<{ id: string }>();
  private readonly localActiveId = signal<string | null>(null);
  private host = inject(ElementRef<HTMLElement>);

  readonly detailMode = computed(() => this.config().layout === 'split-detail');
  readonly orientation = computed(() => this.config().orientation ?? (this.detailMode() ? 'vertical' : 'horizontal'));
  readonly tabs = computed<readonly TabDefinition[]>(() => {
    const cfg = this.config();
    const raw = resolveConfigSourceValue(cfg.tabsSource, cfg.tabs, {
      getVariable: (path) => this.variableStore.get(path),
      getI18n: (path) => this.i18n.get(path),
    });

    if (!Array.isArray(raw)) return [];

    return raw
      .map((entry, index) => this.normalizeTab(entry, index))
      .filter((entry): entry is TabDefinition => entry !== null);
  });
  readonly controlledActiveId = computed<string | null | undefined>(() => {
    const cfg = this.config();
    if (cfg.activeId === undefined) return undefined;

    const resolved = resolveDynamicValue(cfg.activeId);
    const normalized = String(resolved ?? '').trim();
    return normalized.length > 0 ? normalized : null;
  });
  readonly activeId = computed<string | null>(() => this.controlledActiveId() !== undefined ? this.controlledActiveId() ?? null : this.localActiveId());
  readonly activeTab = computed<TabDefinition | null>(() => {
    const tabs = this.tabs();
    const activeId = this.activeId();
    return tabs.find((tab) => tab.id === activeId) ?? tabs.find((tab) => !tab.disabled) ?? null;
  });

  constructor() {
    effect(() => {
      const tabs = this.tabs();
      const controlled = this.controlledActiveId();
      if (controlled !== undefined) {
        return;
      }

      const current = this.localActiveId();
      if (current && tabs.some((tab) => tab.id === current && !tab.disabled)) {
        return;
      }

      const first = tabs.find((tab) => !tab.disabled)?.id ?? null;
      this.localActiveId.set(first);
    });
  }

  select(id: string): void {
    const next = this.tabs().find((tab) => tab.id === id);
    if (!next || next.disabled || this.activeId() === id) return;

    if (this.controlledActiveId() === undefined) {
      this.localActiveId.set(id);
    }

    this.selected.emit({ id });

    if (this.config().scrollBehavior === 'center') {
      setTimeout(() => this.scrollToTab(id), 150);
    }
  }

  isActive(id: string) {
    return this.activeId() === id;
  }

  labelOf(tab: TabDefinition): string {
    return resolveTextValue(tab.label ?? tab.title) ?? '';
  }

  summaryOf(tab: TabDefinition): string | undefined {
    return resolveTextValue(tab.summary);
  }

  contentOf(tab: TabDefinition): string | undefined {
    return resolveTextValue(tab.content);
  }

  metaOf(tab: TabDefinition): string | undefined {
    return resolveTextValue(tab.meta);
  }

  iconOf(tab: TabDefinition): string | undefined {
    return resolveTextValue(tab.icon);
  }

  indexLabelOf(tab: TabDefinition): string | undefined {
    return resolveTextValue(tab.indexLabel);
  }

  detailItemsOf(tab: TabDefinition): readonly string[] {
    return this.resolveStringListValue(tab.detailItems);
  }

  listHeaderLabel = () => resolveTextValue(this.config().listHeaderLabel);

  detailContentLabel = () => resolveTextValue(this.config().detailContentLabel);

  detailItemsLabel = () => resolveTextValue(this.config().detailItemsLabel);

  detailMetaIconName = () => resolveTextValue(this.config().detailMetaIconName);

  detailItemIconName = () => resolveTextValue(this.config().detailItemIconName);

  tabHasRichHeader(tab: TabDefinition): boolean {
    return this.detailMode() || !!this.indexLabelOf(tab) || !!this.summaryOf(tab);
  }

  buttonLabelFor(tab: TabDefinition): string {
    return this.tabHasRichHeader(tab) ? '' : this.labelOf(tab);
  }

  buttonClasses(tab: TabDefinition): string {
    return [
      this.config().tabButtonClasses || 'tabGroupButton',
      this.isActive(tab.id ?? '')
        ? this.config().activeTabButtonClasses || 'tabGroupButtonActive'
        : this.config().inactiveTabButtonClasses || 'tabGroupButtonInactive',
    ].filter(Boolean).join(' ');
  }

  indexLabelClasses(tab: TabDefinition): string {
    return [
      this.config().indexLabelClasses || 'tabGroupIndexLabel',
      this.isActive(tab.id ?? '')
        ? this.config().activeIndexLabelClasses || ''
        : this.config().inactiveIndexLabelClasses || '',
    ].filter(Boolean).join(' ');
  }

  @HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
    const list = this.tabs();
    if (!list.length) return;
    const enabled = list.filter(t => !t.disabled);
    const current = enabled.findIndex(t => t.id === this.activeId());
    const go = (i: number) => this.select(enabled[i].id ?? '');
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        go((current + 1) % enabled.length);
        this.focusActive();
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        go((current - 1 + enabled.length) % enabled.length);
        this.focusActive();
        break;
      }
      case 'Home':
        e.preventDefault();
        go(0);
        this.focusActive();
        break;
      case 'End':
        e.preventDefault();
        go(enabled.length - 1);
        this.focusActive();
        break;
    }
  }
  private focusActive() {
    queueMicrotask(() => {
      const id = this.activeId();
      if (!id) return;
      const btn = this.host.nativeElement.querySelector(`#tab-${ id }`) as HTMLButtonElement | null;
      btn?.focus();
    });
  }

  private scrollToTab(id: string): void {
    const tab = this.host.nativeElement.querySelector(`[data-tab-id="${ id }"]`) as HTMLElement | null;
    if (!tab) return;

    scrollElementIntoViewportCenter(tab);
  }

  private normalizeTab(entry: unknown, index: number): TabDefinition | null {
    if (!entry || typeof entry !== 'object') return null;

    const record = entry as Record<string, unknown>;
    const label = resolveTranslatedText(this.i18n, record['label'], record['labelKey'])
      ?? resolveTranslatedText(this.i18n, record['title'], record['titleKey']);
    if (!label) return null;

    const stepNumber = Number(record['step']);
    const indexLabel = resolveTranslatedText(this.i18n, record['indexLabel'])
      ?? (Number.isFinite(stepNumber) && stepNumber > 0 ? String(Math.floor(stepNumber)) : undefined);
    const content = resolveTranslatedText(this.i18n, record['content'], record['contentKey']);
    const summary = resolveTranslatedText(this.i18n, record['summary'], record['summaryKey']);
    const meta = resolveTranslatedText(this.i18n, record['meta'], record['metaKey']);
    const detailItems = resolveTranslatedStringList(
      this.i18n,
      record['detailItems'],
      record['detailItemsKey'],
      record['detailItemKeys']
    ) ?? [];

    return {
      ...(record as TabDefinition),
      id: normalizeCanonicalContentItemId(record, index),
      label,
      title: label,
      indexLabel,
      summary,
      content,
      meta,
      detailItems,
      icon: resolveTextValue(record['icon'] as TabGroupTextValue | undefined),
      disabled: Boolean(record['disabled'] ?? false),
    };
  }

  private resolveStringListValue(value: TabGroupStringListValue | undefined): readonly string[] {
    return resolveTranslatedStringList(this.i18n, value) ?? [];
  }
}
