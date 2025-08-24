import { Injectable, inject, signal } from '@angular/core';
import { AnalyticsCategories, AnalyticsEvents } from '../../services/analytics.events';
import { AnalyticsService } from '../../services/analytics.service';
import { ModalConfig, ModalRef } from './modal.types';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly analytics = inject(AnalyticsService);
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
    return ref;
  }

  close(): void {
    if (this.activeModal()) {
      const id = this.activeModal()?.id;
      this.activeModal.set(null);
      if (id) this.analytics.track(AnalyticsEvents.ModalClose, { category: AnalyticsCategories.Modal, label: id });
    }
  }
  modalRef = () => this.activeModal();
}
