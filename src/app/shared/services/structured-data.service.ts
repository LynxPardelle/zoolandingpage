import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  private inserted = new Set<string>();

  injectOnce(key: string, data: unknown): void {
    if (!data || this.inserted.has(key) || typeof document === 'undefined') return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    this.inserted.add(key);
  }
}
