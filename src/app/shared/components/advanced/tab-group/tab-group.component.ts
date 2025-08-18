import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TabDefinition, TabGroupConfig } from './tab-group.types';

@Component({
  selector: 'app-tab-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-group.component.html',
  styleUrls: ['./tab-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabGroupComponent {
  @Input() set tabsSource(v: readonly TabDefinition[] | null) {
    this._tabs.set(v ?? []);
  }
  @Input() config: TabGroupConfig | null = null;
  private _tabs = signal<readonly TabDefinition[]>([]);
  tabs: Signal<readonly TabDefinition[]> = computed(() => this._tabs());
  activeId = signal<string | null>(null);
  private host = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    this.ensureActive();
  }

  private ensureActive(): void {
    const cfgId = this.config?.activeId;
    const list = this._tabs();
    if (cfgId && list.some(t => t.id === cfgId && !t.disabled)) {
      this.activeId.set(cfgId);
      return;
    }
    const first = list.find(t => !t.disabled);
    this.activeId.set(first ? first.id : null);
  }

  select(id: string): void {
    if (this.activeId() !== id && !this._tabs().find(t => t.id === id)?.disabled) this.activeId.set(id);
  }
  isActive(id: string) {
    return this.activeId() === id;
  }

  @HostListener('keydown', ['$event']) onKey(e: KeyboardEvent) {
    const list = this._tabs();
    if (!list.length) return;
    const enabled = list.filter(t => !t.disabled);
    const current = enabled.findIndex(t => t.id === this.activeId());
    const go = (i: number) => this.select(enabled[i].id);
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
      const btn = this.host.nativeElement.querySelector(`#tab-${id}`) as HTMLButtonElement | null;
      btn?.focus();
    });
  }
}
