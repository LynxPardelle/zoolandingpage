import { ConnectedPosition, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
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
import { I18nService } from '../../services/i18n.service';
import { OverlayPositioningService } from '../../services/overlay-positioning.service';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericLoadingSpinnerComponent } from '../generic-loading-spinner';
import { SearchBoxConfig, SearchBoxFetcher, SearchSuggestion } from './generic-search-box.types';

@Component({
  selector: 'generic-search-box',
  imports: [CommonModule, GenericLoadingSpinnerComponent, GenericButtonComponent],
  templateUrl: './generic-search-box.component.html',
  styleUrls: ['./generic-search-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericSearchBoxComponent implements OnDestroy {
  @Input() fetcher: SearchBoxFetcher | null = null;
  @Input() config: SearchBoxConfig | null = null;

  private readonly overlaySvc = inject(OverlayPositioningService);
  readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly vcr = inject(ViewContainerRef);
  @ViewChild('resultsTpl') resultsTpl!: TemplateRef<unknown>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  private overlayRef: OverlayRef | null = null;
  // Optional custom item template projection
  itemTemplate = contentChild<TemplateRef<unknown>>('searchItem');

  readonly term = signal('');
  readonly results = signal<readonly SearchSuggestion[]>([]);
  readonly loading = signal(false);
  readonly activeIndex = signal(-1);
  readonly panelOpen = signal(false);
  readonly listboxId = 'sb-listbox-' + Math.random().toString(36).slice(2);
  readonly inputId = 'sb-input-' + Math.random().toString(36).slice(2);
  private history: SearchSuggestion[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly selectSuggestion = output<SearchSuggestion>();

  minLength = () => this.config?.minLength ?? 2;
  debounceMs = () => this.config?.debounceMs ?? 200;
  historyEnabled = () => !!this.config?.historyEnabled;
  historyLimit = () => this.config?.historyLimit ?? 5;
  maxResults = () => this.config?.maxResults ?? 10;
  collapsed = () => !!this.config?.collapsed;
  classes = () => this.config?.classes ?? '';
  inputClasses = () => this.config?.inputClasses ?? 'ank-width-100per ank-borderRadius-0_5rem ank-border-1px-solid ank-borderColor-fgColor ank-px-0_75rem ank-py-0_5rem focus-visible-ring';
  resultsClasses = () => this.config?.resultsClasses ?? 'ank-listStyle-none ank-m-0 ank-p-0_25rem ank-display-flex ank-flexDirection-column ank-gap-2px ank-bg-bgColor ank-borderRadius-0_5rem ank-boxShadow-sm';
  panelClasses = () => this.config?.panelClasses ?? 'ank-position-absolute ank-top-calcSD100per__PLUS__8pxED ank-right-0 ank-zIndex-1200 ank-w-100per';
  panelContentClasses = () => this.config?.panelContentClasses ?? 'ank-width-100per ank-display-flex ank-alignItems-center ank-gap-16px';
  panelInputWrapperClasses = () => this.config?.panelInputWrapperClasses ?? '';
  triggerClasses = () => this.config?.triggerClasses ?? 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-bg-transparent ank-border-none ank-cursor-pointer ank-color-titleColor';
  triggerAriaLabel = () => this.config?.triggerAriaLabel ?? this.i18n.t('ui.common.search');
  closeAriaLabel = () => this.config?.closeAriaLabel ?? 'Close search';
  triggerIcon = () => this.config?.triggerIcon ?? 'search';
  closeIcon = () => this.config?.closeIcon ?? 'arrow_back';

  openPanel() {
    if (!this.collapsed() || this.panelOpen()) return;

    this.panelOpen.set(true);
    queueMicrotask(() => {
      this.searchInput?.nativeElement.focus();
    });
  }

  closePanel() {
    if (!this.collapsed() || !this.panelOpen()) return;

    this.panelOpen.set(false);
    this.resetTransientState();
  }

  onInput(e: Event) {
    if (this.collapsed() && !this.panelOpen()) {
      this.openPanel();
    }

    const val = (e.target as HTMLInputElement).value;
    this.term.set(val);
    if (val.length < this.minLength()) {
      this.results.set([]);
      this.activeIndex.set(-1);
      this.destroyOverlay();
      return;
    }
    this.schedule();
  }
  private schedule() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.perform(), this.debounceMs());
  }
  private async perform() {
    if (!this.fetcher) return;
    const q = this.term();
    if (q.length < this.minLength()) return;
    try {
      this.loading.set(true);
      const r = await Promise.resolve(this.fetcher(q));
      this.results.set(r.slice(0, this.maxResults()));
      this.activeIndex.set(r.length ? 0 : -1);
      if (r.length) this.ensureOverlay();
      else this.destroyOverlay();
    } finally {
      this.loading.set(false);
    }
  }
  private ensureOverlay() {
    if (this.overlayRef) return;
    const origin = this.searchInput ?? this.host;
    const positions: ConnectedPosition[] = [
      { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    ];
    this.overlayRef = this.overlaySvc.createConnected(origin, { positions, hasBackdrop: false });
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
    this.activeIndex.set(-1);
    this.destroyOverlay();
    if (this.collapsed()) {
      this.closePanel();
    }
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
        if (this.collapsed()) {
          this.closePanel();
          break;
        }
        this.resetTransientState();
        break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.collapsed() || !this.panelOpen()) return;

    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) {
      return;
    }

    this.closePanel();
  }

  private addToHistory(s: SearchSuggestion) {
    // dedupe by id, prepend
    this.history = [s, ...this.history.filter(h => h.id !== s.id)].slice(0, this.historyLimit());
  }
  getHistory(): readonly SearchSuggestion[] {
    return this.history;
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.destroyOverlay();
  }

  private resetTransientState(): void {
    this.results.set([]);
    this.activeIndex.set(-1);
    this.destroyOverlay();
  }
}
