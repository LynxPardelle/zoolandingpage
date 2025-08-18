import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MotionPreferenceService {
  readonly reduced = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced.set(mq.matches);
      mq.addEventListener('change', e => this.reduced.set(e.matches));
    }
  }
}
