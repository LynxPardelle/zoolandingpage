import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private readonly enabled: boolean = Boolean(environment.features.analytics);
  private readonly baseUrl: string = environment.apiUrl;
  private readonly version: string = environment.apiVersion;
  private readonly events$ = new Subject<AnalyticsEvent>();

  track(name: string, data: Omit<AnalyticsEvent, 'name' | 'timestamp'> = {}): void {
    const evt: AnalyticsEvent = { name, timestamp: Date.now(), ...data } as AnalyticsEvent;
    // Always keep local buffer (for potential flush/report)
    this.buffer.push(evt);
    this.events$.next(evt);
    if (this.enabled || environment.features.debugMode) {
      // eslint-disable-next-line no-console
      console.log('[analytics]', evt);
      // TODO: send to server when endpoint is ready
      // void this.send(evt);
    }
  }
  flush(): readonly AnalyticsEvent[] {
    return [...this.buffer];
  }

  // Debug/stream API: subscribe to live events
  onEvent(): Observable<AnalyticsEvent> {
    return this.events$.asObservable();
  }

  // Placeholder for future server integration
  // private async send(evt: AnalyticsEvent): Promise<void> {
  //   const url = `${this.baseUrl}/${this.version}/analytics`;
  //   await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evt) });
  // }
}
