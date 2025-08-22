import { ConnectedPosition, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  contentChild,
  inject,
  output,
  signal,
} from '@angular/core';
import { OverlayPositioningService } from '../../../services/overlay-positioning.service';
import { LoadingSpinnerComponent } from '../../utility/loading-spinner';
import { SearchBoxConfig, SearchBoxFetcher, SearchSuggestion } from './search-box.types';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBoxComponent implements OnDestroy {
  @Input() fetcher: SearchBoxFetcher | null = null;
  @Input() config: SearchBoxConfig | null = null;

  private readonly overlaySvc = inject(OverlayPositioningService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly vcr = inject(ViewContainerRef);
  @ViewChild('resultsTpl') resultsTpl!: TemplateRef<any>;
  private overlayRef: OverlayRef | null = null;
  // Optional custom item template projection
  itemTemplate = contentChild<TemplateRef<any>>('searchItem');

  readonly term = signal('');
  readonly results = signal<readonly SearchSuggestion[]>([]);
  readonly loading = signal(false);
  readonly activeIndex = signal(-1);
  readonly listboxId = 'sb-listbox-' + Math.random().toString(36).slice(2);
  readonly inputId = 'sb-input-' + Math.random().toString(36).slice(2);
  private history: SearchSuggestion[] = [];
  private debounceTimer: any;

  readonly selectSuggestion = output<SearchSuggestion>();

  minLength = () => this.config?.minLength ?? 2;
  debounceMs = () => this.config?.debounceMs ?? 200;
  historyEnabled = () => !!this.config?.historyEnabled;
  historyLimit = () => this.config?.historyLimit ?? 5;

  onInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.term.set(val);
    if (val.length < this.minLength()) {
      this.results.set([]);
      this.destroyOverlay();
      return;
    }
    this.schedule();
  }
  private schedule() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.perform(), this.debounceMs());
  }
  private async perform() {
    if (!this.fetcher) return;
    const q = this.term();
    if (q.length < this.minLength()) return;
    try {
      this.loading.set(true);
      const r = await Promise.resolve(this.fetcher(q));
      this.results.set(r.slice(0, 10));
      this.activeIndex.set(r.length ? 0 : -1);
      if (r.length) this.ensureOverlay();
      else this.destroyOverlay();
    } finally {
      this.loading.set(false);
    }
  }
  private ensureOverlay() {
    if (this.overlayRef) return;
    const positions: ConnectedPosition[] = [
      { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    ];
    this.overlayRef = this.overlaySvc.createConnected(this.host, { positions, hasBackdrop: false });
    const portal = new TemplatePortal(this.resultsTpl, this.vcr);
    this.overlayRef.attach(portal);
  }
  private destroyOverlay() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
  choose(s: SearchSuggestion) {
    this.selectSuggestion.emit(s);
    this.term.set(s.label);
    this.results.set([]);
    this.destroyOverlay();
    if (this.historyEnabled()) {
      this.addToHistory(s);
    }
  }
  onKey(ev: KeyboardEvent) {
    if (!this.results().length) return;
    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault();
        this.activeIndex.update(i => (i + 1) % this.results().length);
        break;
      case 'ArrowUp':
        ev.preventDefault();
        this.activeIndex.update(i => (i - 1 + this.results().length) % this.results().length);
        break;
      case 'Enter': {
        const idx = this.activeIndex();
        if (idx > -1) {
          this.choose(this.results()[idx]);
        }
        break;
      }
      case 'Escape':
        this.results.set([]);
        this.destroyOverlay();
        break;
    }
  }

  private addToHistory(s: SearchSuggestion) {
    // dedupe by id, prepend
    this.history = [s, ...this.history.filter(h => h.id !== s.id)].slice(0, this.historyLimit());
  }
  getHistory(): readonly SearchSuggestion[] {
    return this.history;
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
    this.destroyOverlay();
  }
}
