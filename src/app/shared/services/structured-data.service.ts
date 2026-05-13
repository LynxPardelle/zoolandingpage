import { DOCUMENT } from '@angular/common';
import { Injectable, REQUEST, inject } from '@angular/core';
import { resolveMetadataTemplates } from '../utility/metadata-template.utility';
import { VariableStoreService } from './variable-store.service';

@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  private readonly doc = inject(DOCUMENT);
  private readonly variables = inject(VariableStoreService);
  private readonly request = inject(REQUEST, { optional: true });
  private inserted = new Map<string, HTMLScriptElement>();

  applyEntries(entries: readonly unknown[] | null | undefined, keyPrefix = 'sd:bootstrap'): boolean {
    if (!Array.isArray(entries) || entries.length === 0) {
      this.removeEntries(keyPrefix);
      return false;
    }

    const activeKeys = new Set<string>();

    entries.forEach((entry, index) => {
      const key = `${ keyPrefix }:${ index }`;
      activeKeys.add(key);
      this.injectOrUpdate(key, this.resolveTemplateValue(entry));
    });

    this.removeInactiveEntries(keyPrefix, activeKeys);
    return true;
  }

  injectOnce(key: string, data: unknown): void {
    this.injectOrUpdate(key, data);
  }

  private injectOrUpdate(key: string, data: unknown): void {
    if (!data || !this.doc?.head) return;

    const resolved = this.resolveTemplateValue(data);
    const script = this.inserted.get(key) ?? this.findExistingScript(key) ?? this.createScript(key);
    script.type = 'application/ld+json';
    script.text = this.stringifyJsonLd(resolved);
    this.inserted.set(key, script);
  }

  private createScript(key: string): HTMLScriptElement {
    const script = this.doc.createElement('script');
    script.setAttribute('data-zlp-structured-data-key', key);
    this.doc.head.appendChild(script);
    return script;
  }

  private findExistingScript(key: string): HTMLScriptElement | null {
    return this.doc.head.querySelector(`script[data-zlp-structured-data-key="${ this.escapeAttributeValue(key) }"]`);
  }

  private removeEntries(keyPrefix: string): void {
    this.removeInactiveEntries(keyPrefix, new Set());
  }

  private removeInactiveEntries(keyPrefix: string, activeKeys: ReadonlySet<string>): void {
    Array.from(this.inserted.entries()).forEach(([key, script]) => {
      if (!key.startsWith(`${ keyPrefix }:`) || activeKeys.has(key)) {
        return;
      }

      script.remove();
      this.inserted.delete(key);
    });
  }

  private resolveTemplateValue(value: unknown): unknown {
    return resolveMetadataTemplates(value, {
      getVariable: (path) => this.variables.get(path),
      getQueryParam: (key) => this.readQueryParam(key),
    });
  }

  private readQueryParam(key: string): string | undefined {
    const normalizedKey = String(key ?? '').trim();
    if (!normalizedKey) {
      return undefined;
    }

    const requestUrl = String(this.request?.url ?? '').trim();
    if (requestUrl) {
      try {
        return new URL(requestUrl, 'https://localhost').searchParams.get(normalizedKey) ?? undefined;
      } catch {
        return undefined;
      }
    }

    const search = this.doc.defaultView?.location?.search;
    return search ? new URLSearchParams(search).get(normalizedKey) ?? undefined : undefined;
  }

  private escapeAttributeValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private stringifyJsonLd(value: unknown): string {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }
}
