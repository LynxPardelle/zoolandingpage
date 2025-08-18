import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AriaLiveService {
  private ensure(region: 'polite' | 'assertive'): HTMLElement {
    const id = region === 'polite' ? 'aria-live-polite' : 'aria-live-assertive';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'visually-hidden';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', region);
      el.setAttribute('aria-atomic', 'true');
      document.body.appendChild(el);
    }
    return el;
  }

  announce(message: string, mode: 'polite' | 'assertive' = 'polite') {
    const el = this.ensure(mode);
    el.textContent = '';
    setTimeout(() => (el.textContent = message), 30);
  }
}
