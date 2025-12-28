import { OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Input,
  input,
  output,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
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
  private overlayRef: OverlayRef | null = null;
  private host = inject(ElementRef<HTMLElement>);

  readonly items = input<readonly DropdownItem[]>([]);
  readonly config = input<DropdownConfig | null>(null);
  readonly opened = signal(false);
  readonly selectItem = output<DropdownItem>();
  readonly classes = computed<string>(() => this.config()?.classes || '');
  readonly buttonClasses = computed<string>(() => this.config()?.buttonClasses || '');

  readonly stateClasses = computed(() => (this.opened() ? 'ank-opacity-100' : 'ank-opacity-80'));
  readonly activeIndex = signal<number>(-1); // exposed for aria-activedescendant
  private menuButtons: HTMLButtonElement[] = [];
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
    if (this.overlayRef) return;
    this.overlayRef = this.positioning.createConnected(this.host);
    const portal = new TemplatePortal(
      this.menuTpl ?? this.defaultMenuTpl,
      this.vcr,
      this.menuContext()
    );
    this.overlayRef.attach(portal);
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.opened.set(true);
    queueMicrotask(() => this.captureMenuButtonsAndFocusFirst());
  }

  handleSelect(it: DropdownItem): void {
    if (it.disabled) return;
    this.selectItem.emit(it);
    const cfg = { ...DROPDOWN_DEFAULT, ...(this.config() || {}) };
    if (cfg.closeOnSelect) this.close();
  }

  private menuContext(): MenuTemplateContext {
    return {
      items: this.items(),
      select: (item: DropdownItem) => this.handleSelect(item),
    };
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.opened.set(false);
    this.activeIndex.set(-1);
    // restore focus to trigger
    this.triggerBtn?.focus();
  }

  onSelect(it: DropdownItem): void {
    if (it.disabled) return;
    this.selectItem.emit(it);
    const cfg = { ...DROPDOWN_DEFAULT, ...(this.config() || {}) };
    if (cfg.closeOnSelect) this.close();
  }

  @HostListener('keydown', ['$event']) onHostKey(e: KeyboardEvent): void {
    if (!this.opened()) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.altKey) {
        this.open();
        e.preventDefault();
      }
      return;
    }
    const max = this.menuButtons.length - 1;
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
        this.menuButtons[idx].click();
      }
      e.preventDefault();
    } else if (e.key === 'Tab') {
      // close on tab to preserve natural tab order
      this.close();
    }
  }

  private captureMenuButtonsAndFocusFirst(): void {
    const list = this.overlayRef?.overlayElement.querySelectorAll('button[role="menuitem"]');
    this.menuButtons = list ? (Array.from(list) as HTMLButtonElement[]) : [];
    if (this.menuButtons.length) {
      this.setActive(0);
    }
  }
  private moveActive(delta: number, max: number): void {
    let idx = this.activeIndex();
    do {
      idx = (idx + delta + this.menuButtons.length) % this.menuButtons.length;
    } while (this.menuButtons[idx]?.disabled && this.menuButtons.some(b => !b.disabled));
    this.setActive(idx);
  }
  private setActive(idx: number): void {
    this.activeIndex.set(idx);
    this.menuButtons.forEach((b, i) => {
      b.tabIndex = i === idx ? 0 : -1;
      if (i === idx) b.focus();
      b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });
  }
}
