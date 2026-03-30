import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  Input,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { AriaLiveService } from '../../services/aria-live.service';
import { I18nService } from '../../services/i18n.service';
import { MotionPreferenceService } from '../../services/motion-preference.service';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import {
  DEFAULT_MODAL_ACCENT_BAR_CLASSES,
  DEFAULT_MODAL_CLOSE_BUTTON_CLASSES,
  DEFAULT_MODAL_CONFIG,
  DEFAULT_MODAL_CONTAINER_CLASSES,
  DEFAULT_MODAL_CONTAINER_DIALOG_CLASSES,
  DEFAULT_MODAL_CONTAINER_SHEET_CLASSES,
  DEFAULT_MODAL_PANEL_CLASSES,
  DEFAULT_MODAL_PANEL_DIALOG_CLASSES,
  DEFAULT_MODAL_PANEL_MOTION_CLASSES,
  DEFAULT_MODAL_PANEL_SHEET_CLASSES,
  DEFAULT_MODAL_PANEL_SIZE_CLASSES,
} from './generic-modal.constants';
import { GenericModalService } from './generic-modal.service';
import { ModalConfig } from './generic-modal.types';

@Component({
  selector: 'generic-modal-host',
  imports: [CommonModule, PortalModule, GenericButtonComponent],
  templateUrl: './generic-modal.component.html',
  // Externalized styles for lint compliance and atomic separation
  styleUrls: ['./generic-modal.component.scss'],
})
export class GenericModalComponent {
  @Input() config: ModalConfig | null = null;
  private readonly modalService = inject(GenericModalService);
  private readonly overlay = inject(Overlay);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly destroyRef = inject(DestroyRef);
  private overlayRef: OverlayRef | null = null;
  private focusTrap: FocusTrap | null = null;
  private previousFocused: HTMLElement | null = null;
  private open = signal(false);
  isOpen = () => this.open();
  size = () => this.config?.size || DEFAULT_MODAL_CONFIG.size;
  // Motion preference
  readonly motion = inject(MotionPreferenceService);
  private readonly i18n = inject(I18nService);

  constructor(private host: ElementRef<HTMLElement>, private vcr: ViewContainerRef) {
    // Announce open/close changes politely
    const live = inject(AriaLiveService);
    effect(() => {
      const active = !!this.modalService.modalRef();
      if (active && !this.overlayRef) {
        this.openModal();
        live.announce(this.i18n.tOr('ui.accessibility.dialogOpened', ''), 'polite');
      } else if (!active && this.overlayRef) {
        this.closeModal();
        live.announce(this.i18n.tOr('ui.accessibility.dialogClosed', ''), 'polite');
      }
    });
  }

  private createOverlay(): OverlayRef {
    const backdropClass = [
      'cdk-overlay-dark-backdrop',
      'ank-position-absolute',
      'ank-inset-0',
      'ank-d-block',
      // Use themed backdrop with opacity via Angora OPA utility
      'ank-bg-bgColorOPA__0_6',
      'ank-backdropFilter-blurSD2pxED',
      'ank-pointerEvents-auto',
    ];
    if (!this.motion.reduced()) backdropClass.unshift('modal-anim-fade');
    return this.overlay.create({
      hasBackdrop: true,
      backdropClass,
      panelClass: ['ank-position-fixed'],
      scrollStrategy: this.overlay.scrollStrategies.block(),
      disposeOnNavigation: true,
    });
  }

  private openModal(): void {
    this.previousFocused = document.activeElement as HTMLElement | null;
    this.overlayRef = this.createOverlay();
    // Attach portal in a microtask so @ViewChild template is ready
    queueMicrotask(() => {
      if (this.modalTpl && this.overlayRef && !this.overlayRef.hasAttached()) {
        const portal = new TemplatePortal(this.modalTpl, this.vcr);
        this.overlayRef.attach(portal);
      }
    });
    this.open.set(true);
    document.body.style.overflow = 'hidden';
    // Focus trap after next microtask so panel exists
    queueMicrotask(() => {
      const panel = this.host.nativeElement.querySelector('.modal-panel') as HTMLElement | null;
      if (panel) {
        panel.setAttribute('tabindex', '-1');
        this.focusTrap = this.focusTrapFactory.create(panel);
        this.focusTrap.focusInitialElementWhenReady();
      }
    });
    this.overlayRef.backdropClick().subscribe(() => this.onBackdrop());
    this.destroyRef.onDestroy(() => this.closeModal(true));
  }
  @ViewChild('modalContent') private modalTpl?: TemplateRef<unknown>;

  private closeModal(fromDestroy = false): void {
    this.open.set(false);
    document.body.style.overflow = '';
    this.focusTrap?.destroy();
    this.focusTrap = null;
    this.overlayRef?.dispose();
    this.overlayRef = null;
    if (!fromDestroy && this.previousFocused) {
      queueMicrotask(() => this.previousFocused?.focus());
    }
  }

  close(): void {
    this.modalService.close();
  }
  onBackdrop(): void {
    if (this.config?.closeOnBackdrop ?? DEFAULT_MODAL_CONFIG.closeOnBackdrop) this.close();
  }
  @HostListener('document:keydown.escape') onEsc(): void {
    if (this.isOpen()) this.close();
  }

  variant(): 'dialog' | 'sheet' {
    return this.config?.variant ?? DEFAULT_MODAL_CONFIG.variant;
  }

  containerClasses(): string[] {
    return [
      DEFAULT_MODAL_CONTAINER_CLASSES,
      this.variant() === 'dialog'
        ? (this.config?.containerDialogClasses ?? DEFAULT_MODAL_CONTAINER_DIALOG_CLASSES)
        : (this.config?.containerSheetClasses ?? DEFAULT_MODAL_CONTAINER_SHEET_CLASSES),
      this.config?.containerClasses ?? '',
    ].filter(Boolean);
  }

  panelClasses(): string[] {
    const classes = [
      DEFAULT_MODAL_PANEL_CLASSES,
      this.config?.panelClasses ?? '',
      this.variant() === 'dialog'
        ? (this.config?.panelDialogClasses ?? DEFAULT_MODAL_PANEL_DIALOG_CLASSES)
        : (this.config?.panelSheetClasses ?? DEFAULT_MODAL_PANEL_SHEET_CLASSES),
      this.motion.reduced() ? (this.config?.panelNoMotionClasses ?? '') : (this.config?.panelMotionClasses ?? DEFAULT_MODAL_PANEL_MOTION_CLASSES),
    ];

    if (this.size() === 'full') {
      classes.push(DEFAULT_MODAL_PANEL_SIZE_CLASSES.full);
    } else if (this.variant() === 'dialog') {
      const sizeKey = this.size();
      const sizeDefaults = sizeKey === 'sm'
        ? (this.config?.panelSMClasses ?? DEFAULT_MODAL_PANEL_SIZE_CLASSES.sm)
        : sizeKey === 'md'
          ? (this.config?.panelMDClasses ?? DEFAULT_MODAL_PANEL_SIZE_CLASSES.md)
          : (this.config?.panelLGClasses ?? DEFAULT_MODAL_PANEL_SIZE_CLASSES.lg);
      classes.push(sizeDefaults);
    }

    return classes.filter(Boolean);
  }

  accentBarClasses(): string[] {
    const accentClass = (this.config?.accentColor ?? DEFAULT_MODAL_CONFIG.accentColor) === 'accentColor'
      ? 'ank-bg-accentColor'
      : 'ank-bg-secondaryAccentColor';

    return [
      DEFAULT_MODAL_ACCENT_BAR_CLASSES,
      accentClass,
      this.config?.accentBarClasses ?? '',
    ].filter(Boolean);
  }

  closeButtonClasses(): string {
    return this.config?.closeButtonClasses ?? DEFAULT_MODAL_CLOSE_BUTTON_CLASSES;
  }

  closeButtonAriaLabel(): string {
    return this.i18n.tOr('ui.accessibility.close', 'Close modal');
  }
}
