import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MotionPreferenceService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  readonly reduced = signal<boolean>(false);
  private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;

  constructor() {
    if (this.isBrowser) {
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
