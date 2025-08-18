import { Injectable, signal } from '@angular/core';
import { ToastLevel, ToastMessage } from './toast.types';
@Injectable({ providedIn: 'root' })
export class ToastService {
  private messages = signal<readonly ToastMessage[]>([]);
  list = () => this.messages();
  push(level: ToastLevel, text: string, autoCloseMs = 4000) {
    const msg: ToastMessage = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      level,
      text,
      autoCloseMs,
    };
    this.messages.update(list => [...list, msg]);
    if (autoCloseMs) setTimeout(() => this.dismiss(msg.id), autoCloseMs);
  }
  dismiss(id: string) {
    // mark leaving first
    let needsSchedule = false;
    this.messages.update(list =>
      list.map(m => {
        if (m.id === id && !m.leaving) {
          needsSchedule = true;
          return { ...m, leaving: true };
        }
        return m;
      })
    );
    if (needsSchedule) {
      setTimeout(() => {
        this.messages.update(list => list.filter(m => m.id !== id));
      }, 170); // slightly > toastOut animation 160ms
    }
  }
  clear() {
    this.messages.set([]);
  }
}
