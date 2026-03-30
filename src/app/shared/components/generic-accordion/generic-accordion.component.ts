import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Signal, computed, inject, input, signal } from '@angular/core';
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
import { AccordionItem, AccordionStringListValue, AccordionTextValue, TAccordionConfig } from './generic-accordion.types';
@Component({
  selector: 'generic-accordion',
  imports: [CommonModule, GenericButtonComponent, GenericIconComponent],
  templateUrl: './generic-accordion.component.html',
  styleUrls: ['./generic-accordion.component.scss'],
})
export class GenericAccordionComponent {
  private readonly i18n = inject(I18nService);
  private readonly variableStore = inject(VariableStoreService);
  readonly config = input<TAccordionConfig>({});
  readonly items: Signal<readonly AccordionItem[]> = computed(() => {
    const cfg = this.config();
    const sourceData = resolveConfigSourceValue(cfg.itemsSource, cfg.items, {
      getVariable: (path) => this.variableStore.get(path),
      getI18n: (path) => this.i18n.get(path),
    });

    if (!Array.isArray(sourceData)) return [];

    return sourceData
      .map((entry, index) => this.normalizeItem(entry, index))
      .filter((entry): entry is AccordionItem => entry !== null);
  });

  private localExpanded = signal<readonly string[]>([]);
  private readonly idPrefix = 'acc-' + Math.random().toString(36).slice(2) + '-';
  readonly detailMode = computed(() => this.config().renderMode === 'detail');
  readonly expandedIds = computed<readonly string[]>(() => this.resolveExpandedIds() ?? this.localExpanded());

  // Emitted when a panel is toggled
  @Output() toggled = new EventEmitter<{ id: string; expanded: boolean; activeId: string | null; activeIds: readonly string[] }>();

  itemsIds = () => this.items().map((i: AccordionItem) => i.id);

  private itemIdAt(ids: readonly (string | undefined)[], index: number): string | undefined {
    return ids[index];
  }

  itemId = (item: AccordionItem) => item.id ?? '';

  titleOf = (item: AccordionItem) => {
    return resolveTextValue(item.title);
  };

  summaryOf = (item: AccordionItem) => {
    return resolveTextValue(item.summary);
  };

  contentOf = (item: AccordionItem) => {
    return resolveTextValue(item.content);
  };

  metaOf = (item: AccordionItem) => {
    return resolveTextValue(item.meta);
  };

  iconOf = (item: AccordionItem) => {
    return resolveTextValue(item.icon);
  };

  indexLabelOf = (item: AccordionItem) => {
    return resolveTextValue(item.indexLabel);
  };

  indexLabelClasses = (item: AccordionItem) => {
    return [
      this.config().indexLabelClasses || 'accItemIndexLabel',
      this.isExpanded(this.itemId(item))
        ? this.config().indexLabelIsExpandedClasses || ''
        : this.config().indexLabelIsNotExpandedClasses || '',
    ].filter(Boolean).join(' ');
  };

  detailItemsOf = (item: AccordionItem) => {
    return this.resolveStringListValue(item.detailItems);
  };

  detailContentLabel = () => resolveTextValue(this.config().detailContentLabel);

  detailItemsLabel = () => resolveTextValue(this.config().detailItemsLabel);

  detailMetaIconName = () => resolveTextValue(this.config().detailMetaIconName);

  detailItemIconName = () => resolveTextValue(this.config().detailItemIconName);

  itemHasRichHeader = (item: AccordionItem) => this.detailMode() || !!this.indexLabelOf(item) || !!this.summaryOf(item);

  itemHasRichPanel = (item: AccordionItem) => {
    return this.detailMode()
      || !!this.iconOf(item)
      || !!this.metaOf(item)
      || !!this.summaryOf(item)
      || this.detailItemsOf(item).length > 0;
  };

  buttonLabelFor = (item: AccordionItem) => this.itemHasRichHeader(item) ? '' : this.titleOf(item);

  buttonIconFor = (item: AccordionItem) => {
    const configured = item.buttonConfig?.icon || this.config().defaultItemButtonConfig?.icon;
    if (configured) return configured;
    return this.detailMode() ? resolveTextValue(this.config().toggleIconName) : undefined;
  };

  isExpanded = (id: string) => this.expandedIds().includes(id);

  buttonId = (id: string) => this.idPrefix + 'btn-' + id;
  panelId = (id: string) => this.idPrefix + 'panel-' + id;

  toggle(id: string) {
    const current = [...this.expandedIds()];
    let next = current;

    if (this.config().mode === 'single') {
      if (current.includes(id)) {
        next = this.config().allowToggle ? [] : current;
      } else {
        next = [id];
      }
    } else if (current.includes(id)) {
      next = current.filter((entry) => entry !== id);
    } else {
      next = [...current, id];
    }

    if (this.resolveExpandedIds() === undefined) {
      this.localExpanded.set(next);
    }

    const expanded = next.includes(id);
    this.toggled.emit({ id, expanded, activeId: next[0] ?? null, activeIds: next });

    if (expanded && !current.includes(id) && this.config().scrollBehavior === 'center') {
      setTimeout(() => this.scrollToItem(id), 150);
    }
  }

  onKey(ev: KeyboardEvent, idx: number) {
    const ids = this.itemsIds();
    if (!ids.length) return;
    switch (ev.key) {
      case 'ArrowDown': {
        ev.preventDefault();
        const next = (idx + 1) % ids.length;
        const nextId = this.itemIdAt(ids, next);
        if (nextId) this.focusButton(nextId);
        break;
      }
      case 'ArrowUp': {
        ev.preventDefault();
        const prev = (idx - 1 + ids.length) % ids.length;
        const prevId = this.itemIdAt(ids, prev);
        if (prevId) this.focusButton(prevId);
        break;
      }
      case 'Home':
        ev.preventDefault();
        if (ids[0]) this.focusButton(ids[0]);
        break;
      case 'End':
        ev.preventDefault();
        const lastId = this.itemIdAt(ids, ids.length - 1);
        if (lastId) this.focusButton(lastId);
        break;
      case 'Enter':
      case ' ': // Space
        ev.preventDefault();
        if (ids[idx]) this.toggle(ids[idx]);
        break;
    }
  }

  private focusButton(id: string) {
    const btn = document.getElementById(this.buttonId(id)) as HTMLButtonElement | null;
    btn?.focus();
  }

  private scrollToItem(id: string): void {
    const element = document.querySelector(`[data-accordion-item="${ id }"]`) as HTMLElement | null;
    if (!element) return;

    scrollElementIntoViewportCenter(element);
  }

  private resolveExpandedIds(): readonly string[] | undefined {
    const cfg = this.config();
    const activeIds = resolveDynamicValue(cfg.activeIds);
    if (Array.isArray(activeIds)) {
      const normalized = activeIds
        .map((entry) => String(entry ?? '').trim())
        .filter(Boolean);
      return normalized;
    }

    if (cfg.activeId !== undefined) {
      const activeId = resolveDynamicValue(cfg.activeId);
      const normalized = String(activeId ?? '').trim();
      return normalized ? [normalized] : [];
    }

    return undefined;
  }

  private normalizeItem(entry: unknown, index: number): AccordionItem | null {
    if (!entry || typeof entry !== 'object') return null;

    const record = entry as Record<string, unknown>;
    const title = resolveTranslatedText(this.i18n, record['title'], record['titleKey']);
    if (!title) return null;

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
      ...(record as AccordionItem),
      id: normalizeCanonicalContentItemId(record, index),
      title,
      indexLabel,
      content,
      summary,
      meta,
      detailItems,
      icon: resolveTextValue(record['icon'] as AccordionTextValue | undefined),
      disabled: Boolean(record['disabled'] ?? false),
    };
  }

  private resolveStringListValue(value: AccordionStringListValue | undefined): readonly string[] {
    return resolveTranslatedStringList(this.i18n, value) ?? [];
  }
}
