import { ConnectedPosition, OverlayRef } from '@angular/cdk/overlay';
import { DomPortalOutlet, TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Injector,
  Input,
  input,
  output,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';
import { getLocaleCandidates } from '../../i18n/locale.utils';
import { LanguageService } from '../../services/language.service';
import { OverlayPositioningService } from '../../services/overlay-positioning.service';
import { GenericButtonComponent } from "../generic-button/generic-button.component";
import type { DropdownConfig, DropdownItem, MenuTemplateContext } from './generic-dropdown.types';



const DROPDOWN_DEFAULT: Required<Pick<DropdownConfig, 'closeOnSelect'>> = { closeOnSelect: true };

@Component({
  selector: 'generic-dropdown',
  imports: [CommonModule, GenericButtonComponent],
  templateUrl: './generic-dropdown.component.html',
  styleUrls: ['./generic-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericDropdown {
  private readonly positioning = inject(OverlayPositioningService);
  private readonly vcr = inject(ViewContainerRef);
  private readonly angora = inject(NgxAngoraService) as NgxAngoraService;
  private readonly language = inject(LanguageService);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);
  private overlayRef: OverlayRef | null = null;
  private inlineOutlet: DomPortalOutlet | null = null;
  private inlinePortal: TemplatePortal | null = null;
  private inlineMenuRoot: HTMLElement | null = null;
  private host = inject(ElementRef<HTMLElement>);

  readonly items = input<readonly DropdownItem[]>([]);
  readonly config = input<DropdownConfig | null>(null);
  readonly opened = signal(false);
  readonly selectItem = output<DropdownItem>();
  readonly classes = computed<string>(() => this.config()?.classes || '');
  readonly buttonClasses = computed<string>(() => this.config()?.buttonClasses || '');
  readonly itemLinkClasses = computed<string>(() => this.config()?.itemLinkClasses || '');
  readonly menuContainerClasses = computed<string>(() => this.config()?.menuContainerClasses || '');
  readonly menuNavClasses = computed<string>(() => this.config()?.menuNavClasses || '');
  readonly menuListClasses = computed<string>(() => this.config()?.menuListClasses || '');
  readonly renderMode = computed<'overlay' | 'inline'>(() => this.config()?.renderMode ?? 'overlay');
  readonly menuContainerId = computed<string | null>(() => this.config()?.menuContainerId ?? null);
  readonly normalizedItems = computed<readonly DropdownItem[]>(() => {
    const raw = this.resolveMaybeThunk(this.items() as unknown);

    if (Array.isArray(raw)) {
      return raw.filter((item): item is DropdownItem => !!item && typeof item === 'object');
    }

    if (raw && typeof raw === 'object') {
      return Object.values(raw as Record<string, unknown>).filter(
        (item): item is DropdownItem => !!item && typeof item === 'object'
      );
    }

    return [];
  });

  readonly stateClasses = computed(() => (this.opened() ? 'ank-opacity-100' : 'ank-opacity-80'));
  readonly activeIndex = signal<number>(-1); // exposed for aria-activedescendant
  private menuItems: HTMLElement[] = [];
  private triggerBtn!: HTMLButtonElement;
  @Input('menuTpl') menuTpl!: TemplateRef<unknown>; // scaffold placeholder (template reference)
  @ViewChild('defaultMenuTpl', { static: true }) private defaultMenuTpl!: TemplateRef<MenuTemplateContext>;
  ngAfterViewInit(): void {
    // capture trigger for focus restoration
    this.triggerBtn = this.host.nativeElement.querySelector('button[aria-haspopup]') as HTMLButtonElement;
  }

  toggle(): void {
    this.opened() ? this.close() : this.open();
  }

  open(): void {
    // Inline menus render into a normal DOM container (no cdk-overlay-* wrappers)
    if (this.renderMode() === 'inline') {
      if (this.inlineOutlet) return;
      const selector = (this.config()?.inlinePortalTargetSelector || 'header').trim() || 'header';
      const target = (this.host.nativeElement.closest(selector) as HTMLElement | null) ?? document.body;

      const menuRoot = document.createElement('div');
      const id = this.menuContainerId();
      if (id) menuRoot.id = id;
      const containerClasses = this.menuContainerClasses();
      if (containerClasses) menuRoot.className = containerClasses;
      target.appendChild(menuRoot);
      this.inlineMenuRoot = menuRoot;

      this.inlineOutlet = new DomPortalOutlet(menuRoot, this.appRef, this.injector);
      this.inlinePortal = new TemplatePortal(this.defaultMenuTpl, this.vcr, {
        items: this.normalizedItems(),
        select: (item: DropdownItem) => this.handleSelect(item),
      });
      this.inlineOutlet.attach(this.inlinePortal);
      this.opened.set(true);
      queueMicrotask(() => {
        try {
          setTimeout(() => this.angora.cssCreate(), 350);
        } catch {
          /* no-op */
        }
      });
      queueMicrotask(() => this.captureMenuItemsAndFocusFirst());
      return;
    }

    if (this.overlayRef) return;

    const cfg = this.config();
    const originMode = cfg?.overlayOrigin ?? 'host';
    const originEl =
      originMode === 'closestContainer'
        ? (this.host.nativeElement.closest('.ank-container') as HTMLElement | null)
        : originMode === 'closestHeader'
          ? (this.host.nativeElement.closest('header') as HTMLElement | null)
          : null;
    const originRef = originEl ? new ElementRef<HTMLElement>(originEl) : this.host;

    const matchWidth = cfg?.overlayMatchWidth ?? 'none';
    const originRect = originRef.nativeElement.getBoundingClientRect();
    const offsetX = matchWidth === 'viewport' ? -originRect.left : 0;

    const positions: readonly ConnectedPosition[] = [
      {
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top',
        offsetX,
      },
    ];
    this.overlayRef = this.positioning.createConnected(originRef, {
      positions,
      offsetY: cfg?.overlayOffsetY ?? 0,
      // For full-viewport menus, avoid CDK "push" adjusting our left alignment.
      push: matchWidth === 'viewport' ? false : undefined,
      disableFlexibleDimensions: matchWidth === 'viewport' ? true : undefined,
      panelClass: (cfg?.menuContainerClasses || '').trim() || undefined,
    });

    const portal = new TemplatePortal(
      this.menuTpl ?? this.defaultMenuTpl,
      this.vcr,
      this.menuContext()
    );
    this.overlayRef.attach(portal);

    if (matchWidth === 'origin') {
      const w = originRef.nativeElement.getBoundingClientRect().width;
      this.overlayRef.updateSize({ width: w });
      this.overlayRef.updatePosition();
    } else if (matchWidth === 'viewport') {
      this.overlayRef.updateSize({ width: '100vw' });
      this.overlayRef.updatePosition();
    }

    // Ensure Angora generates styles for classes inside the CDK overlay
    queueMicrotask(() => {
      try {
        setTimeout(() => this.angora.cssCreate(), 350);
      } catch {
        /* no-op */
      }
    });
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.opened.set(true);
    queueMicrotask(() => this.captureMenuItemsAndFocusFirst());
  }

  handleSelect(it: DropdownItem): void {
    if (it.disabled) return;

    const normalized = this.normalizedItem(it);
    this.selectItem.emit(normalized);

    const cfg = { ...DROPDOWN_DEFAULT, ...(this.config() || {}) };
    if (cfg.closeOnSelect) this.close(false);
  }

  private menuContext(): MenuTemplateContext {
    return {
      items: this.normalizedItems(),
      select: (item: DropdownItem) => this.handleSelect(item),
    };
  }

  close(restoreFocus = true): void {
    if (this.renderMode() === 'inline') {
      try {
        this.inlineOutlet?.detach();
        this.inlineOutlet?.dispose();
      } catch {
        /* no-op */
      }
      this.inlinePortal = null;
      this.inlineOutlet = null;
      try {
        this.inlineMenuRoot?.remove();
      } catch {
        /* no-op */
      }
      this.inlineMenuRoot = null;
      this.opened.set(false);
      this.activeIndex.set(-1);
      if (restoreFocus) this.triggerBtn?.focus();
      queueMicrotask(() => {
        try {
          setTimeout(() => this.angora.cssCreate(), 350);
        } catch {
          /* no-op */
        }
      });
      return;
    }

    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.opened.set(false);
    this.activeIndex.set(-1);
    // restore focus to trigger
    if (restoreFocus) this.triggerBtn?.focus();
    // Recompute styles after closing as well (safe no-op if none changed)
    queueMicrotask(() => {
      try {
        setTimeout(() => this.angora.cssCreate(), 350);
      } catch {
        /* no-op */
      }
    });
  }

  onSelect(it: DropdownItem): void {
    this.handleSelect(it);
  }

  @HostListener('keydown', ['$event']) onHostKey(e: KeyboardEvent): void {
    if (!this.opened()) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.altKey) {
        this.open();
        e.preventDefault();
      }
      return;
    }
    const max = this.menuItems.length - 1;
    if (e.key === 'Escape') {
      this.close();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      this.moveActive(1, max);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      this.moveActive(-1, max);
      e.preventDefault();
    } else if (e.key === 'Home') {
      this.setActive(0);
      e.preventDefault();
    } else if (e.key === 'End') {
      this.setActive(max);
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      const idx = this.activeIndex();
      if (idx > -1) {
        this.menuItems[idx]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      e.preventDefault();
    } else if (e.key === 'Tab') {
      // close on tab to preserve natural tab order
      this.close();
    }
  }

  private captureMenuItemsAndFocusFirst(): void {
    const root = this.renderMode() === 'inline'
      ? (this.inlineMenuRoot ?? document)
      : this.overlayRef?.overlayElement;
    const list = root?.querySelectorAll('a[role="menuitem"]');
    this.menuItems = list ? (Array.from(list) as HTMLElement[]) : [];
    if (this.menuItems.length) {
      this.setActive(0);
    }
  }
  private moveActive(delta: number, max: number): void {
    let idx = this.activeIndex();
    do {
      idx = (idx + delta + this.menuItems.length) % this.menuItems.length;
    } while (this.isDisabled(this.menuItems[idx]) && this.menuItems.some(i => !this.isDisabled(i)));
    this.setActive(idx);
  }
  private setActive(idx: number): void {
    this.activeIndex.set(idx);
    this.menuItems.forEach((el, i) => {
      (el as HTMLElement).tabIndex = i === idx ? 0 : -1;
      if (i === idx) (el as HTMLElement).focus();
      el.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
  }

  private isDisabled(el: Element | null | undefined): boolean {
    if (!el) return true;
    return el.getAttribute('aria-disabled') === 'true';
  }

  resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }
    return value;
  }

  itemLabel(item: DropdownItem): string {
    const raw = this.resolveMaybeThunk(item.label);
    if (typeof raw === 'string' && raw.trim().length > 0) return raw;

    const record = item as unknown as Record<string, unknown>;
    const lang = this.language.currentLanguage();
    const localizedLabels = record['labels'];
    if (localizedLabels && typeof localizedLabels === 'object') {
      for (const candidate of getLocaleCandidates(lang)) {
        const localized = (localizedLabels as Record<string, unknown>)[candidate];
        if (typeof localized === 'string' && localized.trim().length > 0) return localized;
      }
    }

    const localized = lang === 'es'
      ? record['labelEs'] ?? record['label']
      : record['labelEn'] ?? record['label'];

    if (typeof localized === 'string' && localized.trim().length > 0) return localized;
    if (typeof record['id'] === 'string' && record['id'].trim().length > 0) return record['id'];
    return '';
  }

  itemValue(item: DropdownItem): string {
    const raw = this.resolveMaybeThunk(item.value);
    if (typeof raw === 'string' && raw.trim().length > 0) return raw;

    const record = item as unknown as Record<string, unknown>;
    const sectionId = record['sectionId'];
    if (typeof sectionId === 'string' && sectionId.trim().length > 0) return sectionId;

    const href = record['href'];
    if (typeof href === 'string' && href.trim().length > 0) return href.replace(/^#/, '');

    return '';
  }

  itemHref(item: DropdownItem): string {
    const value = this.itemValue(item).trim();
    return value ? `#${ value }` : '#';
  }

  normalizedItem(item: DropdownItem): DropdownItem {
    return {
      ...item,
      label: this.itemLabel(item),
      value: this.itemValue(item),
    };
  }
}
