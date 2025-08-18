import { Injectable } from '@angular/core';

export type AnalyticsEvent = {
  readonly name: string;
  readonly category?: string;
  readonly label?: string;
  readonly value?: number;
  readonly meta?: Record<string, unknown>;
  readonly timestamp: number;
};

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly buffer: AnalyticsEvent[] = [];
  track(name: string, data: Omit<AnalyticsEvent, 'name' | 'timestamp'> = {}): void {
    const evt: AnalyticsEvent = { name, timestamp: Date.now(), ...data } as AnalyticsEvent;
    // eslint-disable-next-line no-console
    console.log('[analytics]', evt);
    this.buffer.push(evt);
  }
  flush(): readonly AnalyticsEvent[] {
    return [...this.buffer];
  }
}
