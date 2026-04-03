import { ConnectedPosition, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  output,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { OverlayPositioningService } from '../../services/overlay-positioning.service';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericLoadingSpinnerComponent } from '../generic-loading-spinner';
import { filterSearchSuggestions, SEARCH_BOX_MAX_RESULTS } from './generic-search-box.constants';
import { SearchBoxConfig, SearchSuggestion } from './generic-search-box.types';

@Component({
  selector: 'generic-search-box',
  imports: [CommonModule, GenericLoadingSpinnerComponent, GenericButtonComponent],
  templateUrl: './generic-search-box.component.html',
  styleUrls: ['./generic-search-box.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericSearchBoxComponent implements OnDestroy {
  @Input() config: SearchBoxConfig | null = null;

  private readonly overlaySvc = inject(OverlayPositioningService);
  readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly vcr = inject(ViewContainerRef);
  @ViewChild('resultsTpl') resultsTpl!: TemplateRef<unknown>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  private overlayRef: OverlayRef | null = null;
  private panelFocusTimer: ReturnType<typeof setTimeout> | null = null;
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
  maxResults = () => this.config?.maxResults ?? SEARCH_BOX_MAX_RESULTS;
  collapsed = () => !!this.config?.collapsed;
  classes = () => this.config?.classes ?? '';
  showBackdrop = () => !!this.config?.showBackdrop;
  inputClasses = () => this.config?.inputClasses ?? 'ank-width-100per ank-borderRadius-0_5rem ank-border-1px-solid ank-borderColor-fgColor ank-px-0_75rem ank-py-0_5rem focus-visible-ring';
  resultsClasses = () => this.config?.resultsClasses ?? 'ank-listStyle-none ank-m-0 ank-p-0_25rem ank-display-flex ank-flexDirection-column ank-gap-2px ank-bg-bgColor ank-borderRadius-0_5rem ank-boxShadow-sm';
  resultItemClasses = () => this.config?.resultItemClasses ?? 'ank-bg-transparent ank-border-none ank-cursor-pointer ank-color-textColor ank-px-0_5rem ank-py-0_25rem ank-text-left ank-width-100per ank-borderRadius-0_5rem ank-bgHover-secondaryBgColor';
  statusItemClasses = () => this.config?.statusItemClasses ?? 'ank-color-textSecondary ank-fontSize-0_75rem ank-px-0_5rem ank-py-0_25rem';
  panelClasses = () => this.config?.panelClasses ?? 'ank-position-absolute ank-top-calcSD100per__PLUS__8pxED ank-right-0 ank-zIndex-1200 ank-w-100per';
  panelContentClasses = () => this.config?.panelContentClasses ?? 'ank-width-100per ank-display-flex ank-alignItems-center ank-gap-16px';
  panelInputWrapperClasses = () => this.config?.panelInputWrapperClasses ?? '';
  triggerClasses = () => this.config?.triggerClasses ?? 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-bg-transparent ank-border-none ank-cursor-pointer ank-color-titleColor';
  triggerAriaLabel = () => this.config?.triggerAriaLabel ?? this.i18n.t('ui.common.search');
  closeAriaLabel = () => this.config?.closeAriaLabel ?? this.config?.ariaLabel ?? this.i18n.t('ui.common.search');
  triggerIcon = () => this.config?.triggerIcon ?? '';
  closeIcon = () => this.config?.closeIcon ?? '';

  openPanel() {
    if (!this.collapsed() || this.panelOpen()) return;

    this.panelOpen.set(true);
    this.schedulePanelFocus();
  }

  closePanel() {
    if (!this.collapsed() || !this.panelOpen()) return;

    this.panelOpen.set(false);
    this.resetTransientState();
  }

  onBackdropClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.closePanel();
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

  private perform() {
    const q = this.term();
    if (q.length < this.minLength()) return;

    this.loading.set(true);
    const results = filterSearchSuggestions(this.suggestions(), q, this.maxResults());
    this.results.set(results);
    this.activeIndex.set(results.length ? 0 : -1);
    if (results.length) this.ensureOverlay();
    else this.destroyOverlay();
    this.loading.set(false);
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

  private suggestions(): readonly SearchSuggestion[] {
    return Array.isArray(this.config?.suggestions)
      ? this.config.suggestions.filter((entry): entry is SearchSuggestion => !!entry && typeof entry.label === 'string')
      : [];
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.panelFocusTimer) clearTimeout(this.panelFocusTimer);
    this.destroyOverlay();
  }

  private resetTransientState(): void {
    this.results.set([]);
    this.activeIndex.set(-1);
    this.destroyOverlay();
  }

  private schedulePanelFocus(): void {
    if (this.panelFocusTimer) {
      clearTimeout(this.panelFocusTimer);
    }

    this.panelFocusTimer = setTimeout(() => {
      this.panelFocusTimer = null;
      this.searchInput?.nativeElement.focus();
    }, 0);
  }
}
