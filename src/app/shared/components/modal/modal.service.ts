import { Injectable, signal } from '@angular/core';
import { ModalConfig, ModalRef } from './modal.types';

@Injectable({ providedIn: 'root' })
export class ModalService {
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
    return ref;
  }

  close(): void {
    if (this.activeModal()) this.activeModal.set(null);
  }
  modalRef = () => this.activeModal();
}
