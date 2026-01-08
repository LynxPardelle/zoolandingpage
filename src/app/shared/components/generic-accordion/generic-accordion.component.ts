import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, Signal, computed, input, signal } from '@angular/core';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { AccordionItem, TAccordionConfig } from './generic-accordion.types';
@Component({
  selector: 'generic-accordion',
  imports: [CommonModule, GenericButtonComponent],
  templateUrl: './generic-accordion.component.html',
  styleUrls: ['./generic-accordion.component.scss'],
})
export class GenericAccordionComponent {
  readonly config = input<TAccordionConfig>({ items: [] });
  readonly items: Signal<readonly AccordionItem[]> = computed(() => {
    const raw = this.config().items;
    if (!raw) return [];
    return typeof raw === 'function' ? raw() : raw;
  });


  private expanded = signal<readonly string[]>([]);
  private idPrefix = 'acc-' + Math.random().toString(36).slice(2) + '-';

  // Emitted when a panel is toggled
  @Output() toggled = new EventEmitter<{ id: string; expanded: boolean }>();

  itemsIds = () => this.items().map((i: AccordionItem) => i.id);

  titleOf = (item: AccordionItem) => {
    const raw = item.title;
    return typeof raw === 'function' ? raw() : raw;
  };

  contentOf = (item: AccordionItem) => {
    const raw = item.content;
    return typeof raw === 'function' ? raw() : raw;
  };

  isExpanded = (id: string) => this.expanded().includes(id);

  buttonId = (id: string) => this.idPrefix + 'btn-' + id;
  panelId = (id: string) => this.idPrefix + 'panel-' + id;

  toggle(id: string) {
    if (this.config().mode === 'single') {
      if (this.isExpanded(id)) {
        if (this.config().allowToggle) this.expanded.set([]);
      } else {
        this.expanded.set([id]);
      }
    } else {
      if (this.isExpanded(id)) {
        this.expanded.update((list: readonly string[]) => list.filter(x => x !== id));
      } else {
        this.expanded.update((list: readonly string[]) => [...list, id]);
      }
    }
    this.toggled.emit({ id, expanded: this.isExpanded(id) });
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
