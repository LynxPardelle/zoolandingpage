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
import { MotionPreferenceService } from '../../services/motion-preference.service';
import { DEFAULT_MODAL_CONFIG } from './modal.constants';
import { ModalService } from './modal.service';
import { ModalConfig } from './modal.types';

@Component({
  selector: 'app-modal-host',
  imports: [CommonModule, PortalModule],
  templateUrl: './modal.component.html',
  // Externalized styles for lint compliance and atomic separation
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  @Input() config: ModalConfig | null = null;
  private readonly modalService = inject(ModalService);
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

  constructor(private host: ElementRef<HTMLElement>, private vcr: ViewContainerRef) {
    // Announce open/close changes politely
    const live = inject(AriaLiveService);
    effect(() => {
      const active = !!this.modalService.modalRef();
      if (active && !this.overlayRef) {
        this.openModal();
        live.announce('Dialog opened', 'polite');
      } else if (!active && this.overlayRef) {
        this.closeModal();
        live.announce('Dialog closed', 'polite');
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
}
