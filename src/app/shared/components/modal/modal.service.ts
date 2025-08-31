import { Injectable, inject, signal } from '@angular/core';
import { NgxAngoraService } from '../../../angora-css/ngx-angora.service';
import { AnalyticsCategories, AnalyticsEvents } from '../../services/analytics.events';
import { AnalyticsService } from '../../services/analytics.service';
import { ModalConfig, ModalRef } from './modal.types';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly analytics = inject(AnalyticsService);
  private readonly angora = inject(NgxAngoraService) as NgxAngoraService;
  private activeModal = signal<ModalRef | null>(null);

  open(config: ModalConfig = {}): ModalRef {
    if (this.activeModal()) this.close();
    const ref: ModalRef = {
      id: config.id || `modal-${ Date.now() }`,
      close: (result?: unknown) => {
        if (this.activeModal()?.id === ref.id) this.activeModal.set(null);
      },
    };
    this.activeModal.set(ref);
    this.analytics.track(AnalyticsEvents.ModalOpen, { category: AnalyticsCategories.Modal, label: ref.id });
    // Ensure styles/classes are up to date once the overlay attaches
    queueMicrotask(() => {
      try { setTimeout(() => this.angora.cssCreate(), 350); } catch { /* no-op */ }
    });
    return ref;
  }

  close(): void {
    if (this.activeModal()) {
      const id = this.activeModal()?.id;
      this.activeModal.set(null);
      if (id) this.analytics.track(AnalyticsEvents.ModalClose, { category: AnalyticsCategories.Modal, label: id });
      // Recompute styles after closing as well (safe no-op if none changed)
      queueMicrotask(() => {
        try { setTimeout(() => this.angora.cssCreate(), 350); } catch { /* no-op */ }
      });
    }
  }
  modalRef = () => this.activeModal();
}
