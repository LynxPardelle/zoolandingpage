import { Injectable, signal } from '@angular/core';
import { ToastConfig, ToastLevel, ToastMessage, ToastPosition } from './toast.types';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private messages = signal<readonly ToastMessage[]>([]);
  private readonly _config = signal<ToastConfig>({
    position: { vertical: 'bottom', horizontal: 'right' },
    maxVisible: 5,
    defaultAutoCloseMs: 5000,
    animationDuration: 300,
  });

  readonly list = () => this.messages();
  readonly config = () => this._config();

  private getNextId(): string {
    return `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private addToast(toast: Omit<ToastMessage, 'id'>): string {
    const id = this.getNextId();
    const newToast: ToastMessage = {
      id,
      entering: true,
      dismissible: true,
      autoCloseMs: this._config().defaultAutoCloseMs,
      persistOnHover: true,
      showProgress: true,
      ...toast,
    };

    // Limit visible toasts
    const currentList = this.messages();
    const maxVisible = this._config().maxVisible;

    if (currentList.length >= maxVisible) {
      // Remove oldest toast
      const [oldest] = currentList;
      if (oldest) {
        this.dismiss(oldest.id);
      }
    }

    // Add new toast with entering animation
    this.messages.update(list => [...list, newToast]);

    // Remove entering flag after animation
    setTimeout(() => {
      this.messages.update(list => list.map(t => (t.id === id ? { ...t, entering: false } : t)));
    }, this._config().animationDuration);

    // Auto-dismiss if configured
    if (newToast.autoCloseMs && newToast.autoCloseMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newToast.autoCloseMs);
    }

    return id;
  }

  // Legacy method for backward compatibility
  push(level: ToastLevel, text: string, autoCloseMs = 4000) {
    this.addToast({ level, text, autoCloseMs });
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
      }, this._config().animationDuration);
    }
  }

  clear() {
    this.messages.set([]);
  }

  // Convenience methods for different toast types
  success(text: string, options?: Partial<Omit<ToastMessage, 'id' | 'level' | 'text'>>): string {
    return this.addToast({ level: 'success', text, ...options });
  }

  error(text: string, options?: Partial<Omit<ToastMessage, 'id' | 'level' | 'text'>>): string {
    return this.addToast({ level: 'error', text, autoCloseMs: 0, ...options }); // Errors don't auto-dismiss
  }

  warning(text: string, options?: Partial<Omit<ToastMessage, 'id' | 'level' | 'text'>>): string {
    return this.addToast({ level: 'warning', text, ...options });
  }

  info(text: string, options?: Partial<Omit<ToastMessage, 'id' | 'level' | 'text'>>): string {
    return this.addToast({ level: 'info', text, ...options });
  }

  // Advanced toast with title and actions
  show(options: Omit<ToastMessage, 'id'>): string {
    return this.addToast(options);
  }

  // Configuration methods
  updateConfig(config: Partial<ToastConfig>): void {
    this._config.update(current => ({ ...current, ...config }));
  }

  setPosition(position: ToastPosition): void {
    this.updateConfig({ position });
  }
}
