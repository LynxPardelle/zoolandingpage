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
  size = () => this.config?.size;
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
    if (this.config?.closeOnBackdrop ?? true) this.close();
  }
  @HostListener('document:keydown.escape') onEsc(): void {
    if (this.isOpen()) this.close();
  }

  variant(): 'dialog' | 'sheet' {
    return this.config?.variant === 'sheet' ? 'sheet' : 'dialog';
  }

  containerClasses(): string[] {
    return this.joinClasses(
      this.config?.containerClasses,
      this.variant() === 'dialog' ? this.config?.containerDialogClasses : this.config?.containerSheetClasses,
    );
  }

  panelClasses(): string[] {
    const sizeKey = this.size();
    const sizeClasses = sizeKey === 'sm'
      ? this.config?.panelSMClasses
      : sizeKey === 'md'
        ? this.config?.panelMDClasses
        : sizeKey === 'lg'
          ? this.config?.panelLGClasses
          : '';

    return this.joinClasses(
      this.config?.panelClasses,
      this.variant() === 'dialog' ? this.config?.panelDialogClasses : this.config?.panelSheetClasses,
      this.motion.reduced() ? this.config?.panelNoMotionClasses : this.config?.panelMotionClasses,
      sizeClasses,
    );
  }

  accentBarClasses(): string[] {
    const accentColor = this.config?.accentColor;
    const accentClass = accentColor === 'accentColor'
      ? 'ank-bg-accentColor'
      : accentColor === 'secondaryAccentColor'
        ? 'ank-bg-secondaryAccentColor'
        : '';

    return this.joinClasses(this.config?.accentBarClasses, accentClass);
  }

  closeButtonClasses(): string {
    return this.config?.closeButtonClasses ?? '';
  }

  closeButtonAriaLabel(): string {
    return this.i18n.tOr('ui.accessibility.close', 'Close modal');
  }

  private joinClasses(...values: Array<string | undefined>): string[] {
    return values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  }
}
