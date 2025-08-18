import { CommonModule } from '@angular/common';
import { Component, Input, Signal, computed, signal } from '@angular/core';
import { DEFAULT_ACCORDION_CONFIG } from './accordion.constants';
import { AccordionConfig, AccordionItem } from './accordion.types';

@Component({
  selector: 'app-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
})
export class AccordionComponent {
  @Input() set itemsSource(value: readonly AccordionItem[] | null) {
    this._items.set(value ?? []);
  }
  @Input() config: AccordionConfig | null = null;

  private _items = signal<readonly AccordionItem[]>([]);
  items: Signal<readonly AccordionItem[]> = computed(() => this._items());
  private expanded = signal<readonly string[]>([]);
  private idPrefix = 'acc-' + Math.random().toString(36).slice(2) + '-';

  itemsIds = () => this._items().map(i => i.id);

  isExpanded = (id: string) => this.expanded().includes(id);

  buttonId = (id: string) => this.idPrefix + 'btn-' + id;
  panelId = (id: string) => this.idPrefix + 'panel-' + id;

  toggle(id: string) {
    const cfg = { ...DEFAULT_ACCORDION_CONFIG, ...(this.config || {}) } as Required<AccordionConfig>;
    if (cfg.mode === 'single') {
      if (this.isExpanded(id)) {
        if (cfg.allowToggle) this.expanded.set([]);
      } else {
        this.expanded.set([id]);
      }
    } else {
      if (this.isExpanded(id)) {
        this.expanded.update(list => list.filter(x => x !== id));
      } else {
        this.expanded.update(list => [...list, id]);
      }
    }
  }

  onKey(ev: KeyboardEvent, idx: number) {
    const ids = this.itemsIds();
    if (!ids.length) return;
    switch (ev.key) {
      case 'ArrowDown': {
        ev.preventDefault();
        const next = (idx + 1) % ids.length;
        this.focusButton(ids[next]);
        break;
      }
      case 'ArrowUp': {
        ev.preventDefault();
        const prev = (idx - 1 + ids.length) % ids.length;
        this.focusButton(ids[prev]);
        break;
      }
      case 'Home':
        ev.preventDefault();
        this.focusButton(ids[0]);
        break;
      case 'End':
        ev.preventDefault();
        this.focusButton(ids[ids.length - 1]);
        break;
      case 'Enter':
      case ' ': // Space
        ev.preventDefault();
        this.toggle(ids[idx]);
        break;
    }
  }

  private focusButton(id: string) {
    const btn = document.getElementById(this.buttonId(id)) as HTMLButtonElement | null;
    btn?.focus();
  }
}
