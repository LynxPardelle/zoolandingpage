import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { NgxAngoraService } from '../../../angora-css/ngx-angora.service';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../services/analytics.events';
import { ModalConfig, ModalRef } from './modal.types';

@Injectable({ providedIn: 'root' })
export class ModalService {
  // Central analytics emission stream (picked up by AppShell)
  private readonly _analytics$ = new Subject<AnalyticsEventPayload>();
  analyticsEvents$ = this._analytics$.asObservable();
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
    this._analytics$.next({ name: AnalyticsEvents.ModalOpen, category: AnalyticsCategories.Modal, label: ref.id });
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
      if (id) this._analytics$.next({ name: AnalyticsEvents.ModalClose, category: AnalyticsCategories.Modal, label: id });
      // Recompute styles after closing as well (safe no-op if none changed)
      queueMicrotask(() => {
        try { setTimeout(() => this.angora.cssCreate(), 350); } catch { /* no-op */ }
      });
    }
  }
  modalRef = () => this.activeModal();
}
