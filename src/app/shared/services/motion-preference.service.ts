import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MotionPreferenceService {
  readonly reduced = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced.set(mq.matches);

      const onChange = (e: MediaQueryListEvent) => this.reduced.set(e.matches);
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', onChange);
      } else if (typeof (mq as any).addListener === 'function') {
        (mq as any).addListener(onChange);
      }
    }
  }
}
