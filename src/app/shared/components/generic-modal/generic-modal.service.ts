import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../services/analytics.events';
import { AngoraCombosService } from '../../services/angora-combos.service';
import { ModalConfig, ModalRef } from './generic-modal.types';

@Injectable({ providedIn: 'root' })
export class GenericModalService {
  // Central analytics emission stream (picked up by AppShell)
  private readonly _analytics$ = new Subject<AnalyticsEventPayload>();
  analyticsEvents$ = this._analytics$.asObservable();
  private readonly combos = inject(AngoraCombosService);
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
    this._analytics$.next({ name: AnalyticsEvents.ModalOpen, category: AnalyticsCategories.Modal, label: ref.id });
    this.scheduleCssRefresh();
    return ref;
  }

  close(): void {
    if (this.activeModal()) {
      const id = this.activeModal()?.id;
      this.activeModal.set(null);
      if (id) this._analytics$.next({ name: AnalyticsEvents.ModalClose, category: AnalyticsCategories.Modal, label: id });
      this.scheduleCssRefresh();
    }
  }
  modalRef = () => this.activeModal();

  private scheduleCssRefresh(delayMs = 350): void {
    this.combos.scheduleCssCreate(delayMs);
  }
}
