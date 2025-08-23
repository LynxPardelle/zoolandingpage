import { Injectable, inject, signal } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { ModalConfig, ModalRef } from './modal.types';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly analytics = inject(AnalyticsService);
  private activeModal = signal<ModalRef | null>(null);

  open(config: ModalConfig = {}): ModalRef {
    if (this.activeModal()) this.close();
    const ref: ModalRef = {
      id: config.id || `modal-${Date.now()}`,
      close: (result?: unknown) => {
        if (this.activeModal()?.id === ref.id) this.activeModal.set(null);
      },
    };
    this.activeModal.set(ref);
    this.analytics.track('modal_open', { category: 'modal', label: ref.id });
    return ref;
  }

  close(): void {
    if (this.activeModal()) {
      const id = this.activeModal()?.id;
      this.activeModal.set(null);
      if (id) this.analytics.track('modal_close', { category: 'modal', label: id });
    }
  }
  modalRef = () => this.activeModal();
}
