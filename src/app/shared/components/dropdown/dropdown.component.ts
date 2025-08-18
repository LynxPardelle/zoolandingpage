import { OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewContainerRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { OverlayPositioningService } from '../../services/overlay-positioning.service';

export type DropdownItem = { readonly id: string; readonly label: string; readonly disabled?: boolean };
export type DropdownConfig = { readonly closeOnSelect?: boolean; readonly ariaLabel?: string };
const DROPDOWN_DEFAULT: Required<Pick<DropdownConfig, 'closeOnSelect'>> = { closeOnSelect: true };

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownComponent {
  private readonly positioning = inject(OverlayPositioningService);
  private readonly vcr = inject(ViewContainerRef);
  private overlayRef: OverlayRef | null = null;
  private host = inject(ElementRef<HTMLElement>);

  readonly items = input<readonly DropdownItem[]>([]);
  readonly config = input<DropdownConfig | null>(null);
  readonly opened = signal(false);
  readonly selectItem = output<DropdownItem>();

  readonly stateClasses = computed(() => (this.opened() ? 'ank-opacity-100' : 'ank-opacity-80'));
  readonly activeIndex = signal<number>(-1); // exposed for aria-activedescendant
  private menuButtons: HTMLButtonElement[] = [];
  private triggerBtn!: HTMLButtonElement;

  @Input('menuTpl') menuTpl!: any; // scaffold placeholder (template reference)

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
    const portal = new TemplatePortal(this.menuTpl, this.vcr);
    this.overlayRef.attach(portal);
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.opened.set(true);
    queueMicrotask(() => this.captureMenuButtonsAndFocusFirst());
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
